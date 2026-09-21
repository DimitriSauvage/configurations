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

## Governing Rule — Domain Logic Is Tested Through Use Cases

Domain behavior (invariants, state transitions, calculations) MUST be tested through application use cases: call the use-case interface, assert observable outcomes. Do NOT write direct domain unit tests for logic reachable from a use case.

Reason: keeps tests decoupled from domain internals so the domain can be refactored freely (split/rename/move logic) as long as the use-case contract holds.

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

## Application Service Tests — Hand-Written Fakes

**Ports in application service tests are hand-written fakes — anonymous `object` implementing the port — NOT mockk.** Construct the service directly with the fakes; mockk is reserved for the web layer (`@MockkBean` in `@WebMvcTest`). Fixtures come from private helper functions (`recipe(name, vararg ingredients)`, `names(...)`) so Arrange-Act-Assert reads as a scenario:

```kotlin
class SearchRecipesUseCaseTest {
    private var nextId = 1L

    @Test
    fun `execute - recipes with fewer missing ingredients rank first`() {
        val useCase =
            searchUseCase(
                recipe("Pancakes", "flour", "milk", "egg"),
                recipe("Omelette", "egg", "cheese"),
            )

        val result = useCase.execute(SearchRecipesQuery(ingredientNames = names("flour", "milk", "egg")))

        result.assertOk { page ->
            assertThat(page.items.map { it.name }).containsExactly("Pancakes", "Omelette")
        }
    }

    // Anonymous-object fake for the outbound port — no mockk in service tests
    private fun searchUseCase(vararg recipes: Recipe): SearchRecipesUseCase =
        SearchRecipesService(
            object : RecipeCatalogPort {
                override fun findAll(): List<Recipe> = recipes.toList()
            },
        )

    // Scenario fixture helpers
    private fun names(vararg raw: String) = raw.map { IngredientName.of(it) }

    private fun recipe(name: String, vararg ingredients: String) =
        Recipe.rehydrate(id = RecipeId(nextId++), name = name, imageUrl = null, ingredients = ingredients.toList(), instructions = emptyList())
}
```

**Order-sensitive lists (ranking, sorting, pagination slices) assert with AssertJ `containsExactly`** — order is part of the contract. `containsExactlyInAnyOrder` only when order is genuinely unspecified.

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

MockK (`every`/`verify`) applies at the **web layer** (`@MockkBean` in `@WebMvcTest`); application service tests use hand-written fakes per the section above — reach for MockK in a service test only when a fake genuinely cannot express the scenario (e.g. asserting a port was NOT called needs no mock either: an in-memory fake plus a `clear()`/sentinel works).

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

### Controller test rules (every endpoint)

- **MockMvc Kotlin DSL**, not the Java `mockMvc.perform(...)` builder chain:
  ```kotlin
  mockMvc
      .get("/api/recipes/search") {
          param("ingredients", " flour , eggs ")
      }.andExpect {
          status { isOk() }
          jsonPath("$.items[0].name") { value("Instant Snack") }
      }
  ```
- **Verify the exact command handed to the use case** with full data-class equality — this is the proof the DTO→Command mapping (splitting, normalization, defaults) is correct:
  ```kotlin
  verify {
      searchRecipes.execute(
          SearchRecipesQuery(
              ingredientNames = listOf(IngredientName.of("flour"), IngredientName.of("eggs")),
              readyToCookOnly = false,
              page = 0,
              size = 20,
          ),
      )
  }
  ```
- **Every error path asserts the full envelope**: `$.status`, `$.error`, `$.path`, `$.code`, `$.message` (`isNotEmpty()`), JSON content type — including framework 400s: `MISSING_PARAMETER` for a missing required param, `INVALID_PARAMETER` for a type mismatch or a `@Min`/`@Max` violation.
- **`@Min`/`@Max` boundary values get both sides.** One test loops over out-of-range values (`page=-1`, `page=max+1`, `size=0`, `size=max+1`) asserting 400 + `INVALID_PARAMETER` envelope; one test asserts the exact boundaries (`page=min`, `size=max`) return 200 and `verify`s the command carries them.
- **Spring-own rejections stay envelope-free**: 405 (wrong method), 406 (wrong `Accept`), 404 (unknown path) come from Spring, not the advice — assert `jsonPath("$.code") { doesNotExist() }` so a new error handler cannot silently swallow them.

### JSON bodies with explicit nulls

When a request body must carry an EXPLICIT `null` — merge-patch "clear this field" (RFC 7396, see `spring-rest-controller`) — write the body as a raw string literal or build it with `JsonNode`/`ObjectNode`. NEVER serialize a map holding a null value with the application `ObjectMapper`: it is configured `NON_NULL`, so null-valued map entries are DROPPED and the patch arrives as "field absent" (keep) instead of "field present, null" (clear) — the test then exercises the wrong branch.

```kotlin
// ✅ explicit null survives — raw literal
.content("""{"displayName": null}""")

// ✅ dynamic bodies — JsonNode keeps programmatic nulls
val node = ObjectMapper().valueToTree<ObjectNode>(dto)
node.putNull("displayName")

// ❌ NON_NULL drops the key — body silently becomes {}
.content(objectMapper.writeValueAsString(mapOf("displayName" to null)))
```

*(From talent-api PR40 session, 2026-09-10.)*

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

Names read as full sentences describing the observable outcome — `` `execute - recipes with fewer missing ingredients rank first` ``, `` `search with blank ingredient list returns 422 error envelope` `` — so a failing test announces the broken behavior. Combine with Arrange-Act-Assert and scenario fixture helpers (see Application Service Tests) so the test body mirrors the sentence.

---

## Test Doubles for Outbound Ports

Application service tests are **sociable**: the service under test is real, and every outbound port it touches is replaced by a hand-written fake at the port seam — never by mockk (mockk is reserved for the web layer, `@MockkBean` in `@WebMvcTest`). ArchUnit naming rules scan **test classes too** (see `architecture-testing`), so any test double (fake, recording stub) implementing an outbound port must:

- be named `*Adapter` (e.g. `FakeProfileRepositoryAdapter`, `RecordingMetricsAdapter`)
- live under `..adapter.outbound..` in the test tree (e.g. `src/test/kotlin/.../profile/adapter/outbound/`), mirroring the production layout
- share one file per feature in that package (e.g. `ProfileTestAdapters.kt`) so a feature's fakes are discoverable in one place

Otherwise `NamingRulesTest.implOfOutPortMustBeNamedAdapter` fails. Use an inline anonymous `object : Port` (see Application Service Tests) for a one-off single-test stub; promote it to a named `*Adapter` class the moment a second test needs it.

**Repository fakes mirror the real adapter's contract**, or save-dependent tests lie:

- `save` on a create (id null) generates an id and returns a REHYDRATED instance — the caller cannot keep mutating the pre-save instance, exactly like the real persistence adapter
- `save` on an update (id set) stores and returns the same instance
- in-memory store keyed by id, plus a `clear()` for test isolation

Reference implementations: `ProfileTestAdapters.kt`, `JobTestAdapters.kt`, `ApplicationTestAdapters.kt`, `GraphTestAdapters.kt` (talent-api).

*(From talent-api PR40 session, 2026-09-10.)*

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
- Use mockk (or any mock) for ports in application service tests — hand-written anonymous-object fakes are the default; mockk belongs to the web layer (`@MockkBean`)
- Assert a ranked/ordered list with `containsExactlyInAnyOrder` — order is part of the contract, use `containsExactly`
- Write a controller test that verifies only the status — assert the full error envelope and verify the exact command passed to the use case
- Serialize an explicit-null JSON body with the app `ObjectMapper` (`NON_NULL` drops the key) — raw string literals or `JsonNode` (see JSON bodies with explicit nulls)
- Name or place a port-implementing fake outside the `*Adapter` + `..adapter.outbound..` convention when ArchUnit suites analyze test classes
