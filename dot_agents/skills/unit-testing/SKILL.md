---
name: unit-testing
description: |
  Unit testing conventions for Beetween Kotlin Spring Boot services. Covers JUnit 5 + MockK patterns for domain model tests, application service tests, repository adapter tests, and controller tests using SpringMockK / MockMvc. Use when writing or reviewing unit tests for any backend component.
---

# Unit Testing — Kotlin / JUnit 5 / MockK

## When to Use This Skill

- Writing unit tests for domain models (pure, no mocks)
- Writing unit tests for application services (MockK)
- Writing unit tests for REST controllers (SpringMockK / MockMvc)
- Writing unit tests for repository adapters or mappers
- Choosing test structure and naming conventions

---

## Test Dependencies

```xml
<!-- pom.xml — test scope -->
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-test</artifactId>  <!-- JUnit 5, MockMvc, AssertJ -->
    <scope>test</scope>
</dependency>
<dependency>
    <groupId>io.mockk</groupId>
    <artifactId>mockk-jvm</artifactId>
    <version>1.14.2</version>
    <scope>test</scope>
</dependency>
<dependency>
    <groupId>com.ninja-squad</groupId>
    <artifactId>springmockk</artifactId>  <!-- MockMvc + MockK beans (replaces Mockito in Spring) -->
    <version>4.0.2</version>
    <scope>test</scope>
</dependency>
```

---

## Domain Model Tests — Pure (No Mocks)

Test domain logic without any framework:

```kotlin
class JuryTest {

    private val now = Instant.parse("2025-01-01T10:00:00Z")
    private val companyId = CompanyId(UUID.randomUUID())

    @Test
    fun `create - valid name returns Jury in Draft status`() {
        val result = Jury.create(companyId, "Senior Dev Interview", now)

        result.assertOk { jury ->
            assertThat(jury.name).isEqualTo("Senior Dev Interview")
            assertThat(jury.status).isEqualTo(JuryStatus.Draft)
            assertThat(jury.id).isNull()
        }
    }

    @Test
    fun `create - blank name returns JuryNameBlank error`() {
        val result = Jury.create(companyId, "  ", now)
        result.assertErr(DomainError.JuryNameBlank)
    }

    @Test
    fun `update - planned jury returns JuryNotEditable error`() {
        val jury = buildJury(status = JuryStatus.Planned)
        val result = jury.update(name = "New Name", now = now)
        result.assertErr(DomainError.JuryNotEditable)
    }

    @Test
    fun `cancel - draft jury with reason succeeds`() {
        val jury = buildJury(status = JuryStatus.Draft)
        val result = jury.cancel("Budget cut", now)
        result.assertOk { assertThat(it.status).isEqualTo(JuryStatus.Cancelled) }
    }

    // Builder helper — avoids rehydrate boilerplate in every test
    private fun buildJury(
        id: JuryId = JuryId("507f1f77bcf86cd799439011"),
        status: JuryStatus = JuryStatus.Draft,
        name: String = "Test Jury",
    ) = Jury.rehydrate(id, companyId, name, status, AuditInfo(now, now))
}
```

### Result assertion helpers

Define in `test/kotlin/.../utils/ResultAssertions.kt`:

```kotlin
fun <V, E> Result<V, E>.assertOk(block: (V) -> Unit = {}) {
    assertThat(this.isOk).withFailMessage("Expected Ok but was Err: ${this.getErrorOrNull()}").isTrue()
    block(this.getOrThrow())
}

fun <V, E> Result<V, E>.assertErr(expected: E? = null) {
    assertThat(this.isErr).withFailMessage("Expected Err but was Ok: ${this.getOrNull()}").isTrue()
    if (expected != null) assertThat(this.getErrorOrNull()).isEqualTo(expected)
}
```

---

## Application Service Tests — MockK

Type the test subject as the **use case interface**, not the concrete `XxxApplicationService`/`XxxService` class — assert on `Result` outputs only, never reach into internal fields or call implementation-only methods that aren't part of the interface. This keeps the test decoupled from internal restructuring (renaming the service class, splitting it into two, changing its private helpers) as long as the interface contract still holds.

```kotlin
class CreateJuryServiceTest {

    // MockK field injection
    private val repository: JuryRepositoryPort = mockk()
    private val notificationPort: NotificationPort = mockk(relaxed = true)  // relaxed: void methods don't need stubbing
    private val timeProvider: TimeProviderPort = mockk()

    // Typed as the interface, not the concrete class — the test only knows the contract
    private val service: CreateJuryUseCase = CreateJuryService(repository, notificationPort, timeProvider)

    private val now = Instant.parse("2025-01-01T10:00:00Z")
    private val companyId = CompanyId(UUID.randomUUID())

    @BeforeEach
    fun setUp() {
        every { timeProvider.now() } returns now
    }

    @Test
    fun `execute - valid command creates and returns jury`() {
        val command = CreateJuryCommand(companyId, "Senior Interview", null)
        val savedJury = buildSavedJury()
        every { repository.save(any()) } returns savedJury

        val result = service.execute(command)

        result.assertOk { response ->
            assertThat(response.name).isEqualTo("Senior Interview")
            assertThat(response.status).isEqualTo("Draft")
        }
        verify(exactly = 1) { repository.save(match { it.name == "Senior Interview" }) }
        verify(exactly = 1) { notificationPort.notifyJuryCreated(savedJury, any()) }
    }

    @Test
    fun `execute - blank name returns Unprocessable error without saving`() {
        val command = CreateJuryCommand(companyId, " ", null)

        val result = service.execute(command)

        result.assertErr()
        assertThat(result.getErrorOrNull()).isInstanceOf(UseCaseError.Unprocessable::class.java)
        verify { repository wasNot Called }
    }

    private fun buildSavedJury() = Jury.rehydrate(
        JuryId("507f1f77bcf86cd799439011"), companyId, "Senior Interview", JuryStatus.Draft,
        AuditInfo(now, now),
    )
}
```

### MockK patterns

```kotlin
// Basic stub
every { port.findById(juryId) } returns jury

// Stub with argument matcher
every { repository.save(match { it.name.isNotBlank() }) } answers { firstArg() }

// Stub returning null (not found)
every { repository.findById(juryId) } returns null

// Capture argument for assertion
val slot = slot<Jury>()
every { repository.save(capture(slot)) } answers { slot.captured }
// ...after call:
assertThat(slot.captured.status).isEqualTo(JuryStatus.Draft)

// Verify
verify(exactly = 1) { repository.save(any()) }
verify { notificationPort wasNot Called }
confirmVerified(repository, notificationPort)  // ensures no unexpected calls

// relaxed = true — all methods return default values, only stub what matters
val mock = mockk<ComplexPort>(relaxed = true)
```

### Fake repositories (in-memory)

For complex scenarios, prefer fakes over mocks:

```kotlin
class InMemoryJuryRepository : JuryRepositoryPort {
    private val store = mutableMapOf<JuryId, Jury>()

    override fun findById(id: JuryId): Jury? = store[id]
    override fun save(jury: Jury): Jury {
        val id = jury.id ?: JuryId(UUID.randomUUID().toString())
        val saved = if (jury.id == null) Jury.rehydrate(id, jury.companyId, jury.name, jury.status, jury.audit)
                    else jury
        store[id] = saved
        return saved
    }
    override fun findAllByCompanyId(companyId: CompanyId) = store.values.filter { it.companyId == companyId }
    override fun delete(id: JuryId) { store.remove(id) }
    fun clear() = store.clear()
}
```

---

## Controller Tests — SpringMockK / MockMvc

```kotlin
@WebMvcTest(JuryController::class)
@Import(SecurityTestConfig::class)   // disable real security for unit tests
class JuryControllerTest {

    @Autowired
    private lateinit var mockMvc: MockMvc

    @MockkBean
    private lateinit var createJuryUseCase: CreateJuryUseCase

    @MockkBean
    private lateinit var listJuriesUseCase: ListJuriesUseCase

    @Test
    fun `POST juries - valid body returns 201`() {
        val juryId = "507f1f77bcf86cd799439011"
        every { createJuryUseCase.execute(any()) } returns Ok(JuryResponse(juryId, "Senior Dev", "Draft"))

        mockMvc.perform(
            post("/api/v1/juries")
                .contentType(MediaType.APPLICATION_JSON)
                .content("""{"name": "Senior Dev"}""")
                .with(jwt().authorities(SimpleGrantedAuthority("ROLE_USER"))
                      .jwt { it.claim("companyId", UUID.randomUUID().toString()) })
        )
            .andExpect(status().isCreated)
            .andExpect(jsonPath("$.id").value(juryId))
            .andExpect(jsonPath("$.name").value("Senior Dev"))
    }

    @Test
    fun `POST juries - use case returns Unprocessable gives 422`() {
        every { createJuryUseCase.execute(any()) } returns Err(UseCaseError.Unprocessable.JuryNameBlank)

        mockMvc.perform(
            post("/api/v1/juries")
                .contentType(APPLICATION_JSON)
                .content("""{"name": "  "}""")
                .with(jwt())
        )
            .andExpect(status().isUnprocessableEntity)
            .andExpect(jsonPath("$.code").value("JURY_NAME_BLANK"))
    }

    @Test
    fun `POST juries - missing required field returns 400 from Bean Validation`() {
        mockMvc.perform(
            post("/api/v1/juries")
                .contentType(APPLICATION_JSON)
                .content("""{}""")
                .with(jwt())
        )
            .andExpect(status().isBadRequest)
    }
}
```

**`@MockkBean`** is from SpringMockK — replaces `@MockBean` (Mockito) in Spring contexts. Use `@MockkBean` for all MockK-based beans in `@WebMvcTest`.

---

## Mapper / Adapter Tests

```kotlin
class RequestEntityMapperTest {

    private val mapper = RequestEntityMapper()
    private val now = Instant.parse("2025-01-01T10:00:00Z")

    @Test
    fun `toEntity - maps all domain fields correctly`() {
        val request = buildRequest()
        val entity = mapper.toEntity(request)

        assertThat(entity.id).isEqualTo(request.id)
        assertThat(entity.name).isEqualTo(request.name)
        assertThat(entity.status).isEqualTo(request.status)
    }

    @Test
    fun `toDomain - round-trip preserves all fields`() {
        val original = buildRequest()
        val entity = mapper.toEntity(original)
        val roundTripped = mapper.toDomain(entity)

        assertThat(roundTripped).isEqualTo(original)  // works if data class
    }
}
```

---

## Naming Conventions

| Test type | Class suffix | Example |
|---|---|---|
| Domain model | `Test` | `JuryTest`, `RequestTest`, `DomainErrorTest` |
| Application service | `Test` | `CreateJuryServiceTest`, `ApproveRequestServiceTest` |
| Controller | `Test` | `JuryControllerTest`, `RequestControllerTest` |
| Mapper / adapter | `Test` | `RequestEntityMapperTest`, `JuryRepositoryAdapterTest` |
| Error handling | `Test` | `ApplicationErrorHandlerTest`, `DomainErrorMapperTest` |

**Test method names** — use backtick string with `operation - scenario - expected`:
```kotlin
@Test fun `create - blank name returns JuryNameBlank error`() { ... }
@Test fun `execute - repository throws - propagates as InternalError`() { ... }
@Test fun `POST juries - valid body returns 201`() { ... }
```

---

## Do Not

- Import `org.mockito` — use MockK exclusively
- Use `@InjectMocks` — construct service manually with constructor
- Use `@SpringBootTest` for unit tests — `@WebMvcTest` for controllers, plain class for services
- Leave `verify` calls without `confirmVerified` if all calls must be asserted
- Use real implementations when a port should be mocked — test one unit at a time
- Assert on `result.getOrNull()!!` — use the `assertOk { }` helper
- Test private methods — test behavior through public API
- Type an application-service test subject as the concrete class instead of its `XxxUseCase` interface — narrowly-scoped utils/mappers are the only exception
