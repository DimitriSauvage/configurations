---
name: integration-testing
description: |
  Integration testing conventions for Beetween Kotlin Spring Boot services. Covers TestContainers setup for PostgreSQL, MongoDB, and Keycloak, @SpringBootTest integration tests, MockMvc with real Spring context, WireMock for external HTTP dependencies, and shared container strategies. Use when writing integration tests for adapters, repositories, or full application flows.
---

# Integration Testing — TestContainers / Spring Boot

## When to Use This Skill

- Writing integration tests for JPA repository adapters (PostgreSQL)
- Writing integration tests for MongoDB repository adapters
- Testing REST controllers with a real Spring context
- Testing Keycloak authentication flows with a real container
- Mocking external HTTP services with WireMock
- Sharing containers across all tests for speed

---

## Test Dependencies

```xml
<!-- TestContainers -->
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-testcontainers</artifactId>
    <scope>test</scope>
</dependency>
<dependency>
    <groupId>org.testcontainers</groupId>
    <artifactId>postgresql</artifactId>
    <scope>test</scope>
</dependency>
<dependency>
    <groupId>org.testcontainers</groupId>
    <artifactId>mongodb</artifactId>
    <scope>test</scope>
</dependency>

<!-- Keycloak TestContainers -->
<dependency>
    <groupId>com.github.dasniko</groupId>
    <artifactId>testcontainers-keycloak</artifactId>
    <version>3.7.0</version>
    <scope>test</scope>
</dependency>

<!-- WireMock -->
<dependency>
    <groupId>org.wiremock</groupId>
    <artifactId>wiremock-standalone</artifactId>
    <version>3.6.0</version>
    <scope>test</scope>
</dependency>

<!-- SpringMockK for MockMvc + MockK -->
<dependency>
    <groupId>com.ninja-squad</groupId>
    <artifactId>springmockk</artifactId>
    <version>4.0.2</version>
    <scope>test</scope>
</dependency>
```

---

## Maven Split — Surefire Unit / Failsafe Integration

ITs are tagged `@Tag("Integration")` on the shared base class and excluded from the unit run. Surefire never needs Docker; Failsafe runs the ITs during `verify`:

```xml
<plugin>
    <groupId>org.apache.maven.plugins</groupId>
    <artifactId>maven-surefire-plugin</artifactId>
    <configuration>
        <excludedGroups>Integration</excludedGroups>
    </configuration>
</plugin>
<plugin>
    <groupId>org.apache.maven.plugins</groupId>
    <artifactId>maven-failsafe-plugin</artifactId>
    <configuration>
        <groups>Integration</groups>
    </configuration>
</plugin>
```

- `./mvnw test` — unit tests only, no Docker required.
- `./mvnw verify` — unit + integration tests (Testcontainers uses the Docker daemon).
- CI gates on `verify` so ITs block merge.

---

## Container Test Naming & Placement

- Suffix `IT` (repository/adapter tests) or `E2EIT` (full-stack REST flows). Failsafe's default includes pick up `*IT`; Surefire's defaults (`*Test`, `Test*`, `*Tests`) never match — so the unit run stays Docker-free by naming alone, on top of any tag filtering.
- Container tests live in an `it.*` root package (e.g. `src/test/kotlin/it/profile/...`): "this test needs Docker" is visible at the import, and the unit-test package scan cannot pick them up.
- Every container test extends the shared base class (`IntegrationTestBase` / `AbstractPostgresIT` / `MongoIntegrationTestBase`) — never starts its own container or Spring context.
- NO context-overriding annotations (`@TestPropertySource`, `@DynamicPropertySource`, `@ActiveProfiles`, `properties = [...]`) on ordinary concrete IT classes: every unique property set forces Spring to build and cache a NEW context. Overrides live on the shared base; a test that genuinely needs a different property set (e.g. seeding config, custom CORS) gets its OWN dedicated class so the cache holds one context per set (see Seeding).

### MongoDB community container limits

Never exercise `q=` / full-text `$search` query params in tests backed by the community MongoDB Testcontainer — `$search` is an Atlas-only feature and the query fails there. Cover text-search behavior only where Atlas is actually available; against the community container, keep tests on non-text paths.

*(From talent-api PR40 session, 2026-09-10.)*

---

## Shared Container Strategy

### Shared PostgreSQL Container — `@ServiceConnection` base class (preferred)

One container per JVM, wired by Spring Boot's service connections — no `@DynamicPropertySource` plumbing. Every IT extends the base class:

```kotlin
/** Shared real-Postgres base for integration tests: one container per JVM run. */
@Tag("Integration")
@Testcontainers
@SpringBootTest
@TestConstructor(autowireMode = TestConstructor.AutowireMode.ALL)   // constructor injection in tests
abstract class AbstractPostgresIT {
    companion object {
        @Container
        @ServiceConnection
        @JvmStatic
        val postgres = PostgreSQLContainer<Nothing>("postgres:17")
    }
}
```

`@TestConstructor(autowireMode = ALL)` lets IT classes take `mockMvc`, adapters, and seeders as constructor parameters instead of `@Autowired lateinit var` fields.

Use a singleton pattern to avoid starting one container per test class:

### Shared PostgreSQL Container

```kotlin
// test/kotlin/com/beetween/recvalapi/IntegrationTestBase.kt
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@ActiveProfiles("test")
@Testcontainers
abstract class IntegrationTestBase {

    companion object {
        @Container
        @JvmStatic
        val postgres = PostgreSQLContainer<Nothing>("postgres:16-alpine").apply {
            withDatabaseName("testdb")
            withUsername("test")
            withPassword("test")
            withReuse(true)   // reuse across JVM runs during development
        }

        @JvmStatic
        @DynamicPropertySource
        fun properties(registry: DynamicPropertyRegistry) {
            registry.add("spring.datasource.url", postgres::getJdbcUrl)
            registry.add("spring.datasource.username", postgres::getUsername)
            registry.add("spring.datasource.password", postgres::getPassword)
            registry.add("spring.flyway.url", postgres::getJdbcUrl)
        }
    }
}
```

### Shared MongoDB Container

```kotlin
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@ActiveProfiles("test")
abstract class MongoIntegrationTestBase {

    companion object {
        @Container
        @JvmStatic
        val mongo = MongoDBContainer("mongo:7.0").apply { withReuse(true) }

        @JvmStatic
        @DynamicPropertySource
        fun properties(registry: DynamicPropertyRegistry) {
            registry.add("spring.data.mongodb.uri", mongo::getConnectionString)
            registry.add("spring.data.mongodb.database") { "testdb" }
        }
    }

    @Autowired
    lateinit var mongoTemplate: MongoTemplate

    @BeforeEach
    fun cleanDatabase() {
        mongoTemplate.collectionNames.forEach { mongoTemplate.dropCollection(it) }
    }
}
```

### Shared Keycloak Container

```kotlin
// test/kotlin/.../SharedKeycloakContainer.kt
object SharedKeycloakContainer {
    val instance: KeycloakContainer by lazy {
        KeycloakContainer("quay.io/keycloak/keycloak:26.0.5")
            .withRealmImportFile("keycloak/test-realm.json")
            .apply { start() }
    }
}

abstract class KeycloakIntegrationTestBase {
    companion object {
        @JvmStatic
        @DynamicPropertySource
        fun keycloakProperties(registry: DynamicPropertyRegistry) {
            val kc = SharedKeycloakContainer.instance
            registry.add("spring.security.oauth2.resourceserver.jwt.issuer-uri") {
                "${kc.authServerUrl}/realms/test"
            }
        }
    }
}
```

---

## Repository Adapter Integration Tests

### PostgreSQL + JPA

```kotlin
class RequestRepositoryAdapterIntegrationTest : IntegrationTestBase() {

    @Autowired
    private lateinit var adapter: RequestRepositoryAdapter

    @Autowired
    private lateinit var jpaRepository: RequestJpaRepository

    private val now = Instant.parse("2025-01-01T10:00:00Z")
    private val groupId = UUID.randomUUID()

    @BeforeEach
    fun cleanUp() {
        jpaRepository.deleteAll()
    }

    @Test
    fun `save - persists and returns request with id`() {
        val request = Request.create(groupId, "My Request", now).getOrThrow()

        val saved = adapter.save(request)

        assertThat(saved.id).isNotNull()
        val found = adapter.findByIdAndGroupId(saved.id!!, groupId)
        assertThat(found).isNotNull()
        assertThat(found!!.name).isEqualTo("My Request")
    }

    @Test
    fun `findByIdAndGroupId - different groupId returns null`() {
        val request = adapter.save(Request.create(groupId, "Request", now).getOrThrow())

        val result = adapter.findByIdAndGroupId(request.id!!, UUID.randomUUID())

        assertThat(result).isNull()
    }

    @Test
    fun `optimistic lock - concurrent update throws ConcurrencyConflictException`() {
        val saved = adapter.save(Request.create(groupId, "Request", now).getOrThrow())

        // Simulate two threads reading same version
        val v1 = adapter.findByIdAndGroupId(saved.id!!, groupId)!!
        val v2 = adapter.findByIdAndGroupId(saved.id!!, groupId)!!

        adapter.save(v1.update("Updated by 1", now).getOrThrow())

        assertThatThrownBy { adapter.save(v2.update("Updated by 2", now).getOrThrow()) }
            .isInstanceOf(ConcurrencyConflictException::class.java)
    }
}
```

### MongoDB

```kotlin
class JuryRepositoryAdapterIntegrationTest : MongoIntegrationTestBase() {

    @Autowired
    private lateinit var adapter: JuryRepositoryAdapter

    private val now = Instant.parse("2025-01-01T10:00:00Z")
    private val companyId = CompanyId(UUID.randomUUID())

    @Test
    fun `save then findById - round trips all fields`() {
        val jury = Jury.create(companyId, "Senior Interview", now).getOrThrow()

        val saved = adapter.save(jury)
        val found = adapter.findById(saved.id!!)

        assertThat(found).isNotNull()
        assertThat(found!!.name).isEqualTo("Senior Interview")
        assertThat(found.companyId).isEqualTo(companyId)
        assertThat(found.status).isEqualTo(JuryStatus.Draft)
    }

    @Test
    fun `findAllByCompanyId - filters by company`() {
        val otherCompany = CompanyId(UUID.randomUUID())
        adapter.save(Jury.create(companyId, "J1", now).getOrThrow())
        adapter.save(Jury.create(companyId, "J2", now).getOrThrow())
        adapter.save(Jury.create(otherCompany, "J3", now).getOrThrow())

        val result = adapter.findAllByCompanyId(companyId)

        assertThat(result).hasSize(2)
        assertThat(result.map { it.name }).containsExactlyInAnyOrder("J1", "J2")
    }
}
```

---

## Seeding — JSON Fixtures + Idempotent Reseed in `@BeforeEach`

All ITs share ONE database and Spring caches the application context across test classes, so another IT (or a cached context) may have mutated the catalog since this class started. Reseed idempotently (TRUNCATE + insert) in `@BeforeEach`:

```kotlin
@SpringBootTest(
    properties = [
        "app.seed.enabled=true",
        "app.seed.file=classpath:seeding/search-fixture.json",
    ],
)
class RecipeApiIT(
    private val mockMvc: MockMvc,
    private val seeder: RecipeSeeder,
) : AbstractPostgresIT() {
    @BeforeEach
    fun reseedSharedCatalog() {
        seeder.seed()   // idempotent TRUNCATE + insert keeps assertions order-independent
    }
}
```

- Seed fixtures are **JSON files under `src/test/resources/seeding/`**, loaded by a property-gated seeder (`app.seed.enabled` / `app.seed.file`), never per-test-class inline builders.
- Spring caches contexts **per property set**: tests with different `properties` run in a separate context — put them in their own test class (e.g. a CORS origins config IT proving a custom allowed-origins list is honored and the default dropped).

---

## REST Integration Tests (Full Stack)

```kotlin
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@ActiveProfiles("test")
class JuryControllerIntegrationTest : MongoIntegrationTestBase() {

    @Autowired
    private lateinit var mockMvc: MockMvc

    @Test
    fun `POST api v1 juries - full flow creates jury and returns 201`() {
        mockMvc.perform(
            post("/api/v1/juries")
                .contentType(MediaType.APPLICATION_JSON)
                .content("""{"name": "Senior Dev Interview"}""")
                .with(jwt().jwt { it.claim("companyId", UUID.randomUUID().toString()) }
                           .authorities(SimpleGrantedAuthority("ROLE_MANAGER")))
        )
            .andExpect(status().isCreated)
            .andExpect(jsonPath("$.name").value("Senior Dev Interview"))
            .andExpect(jsonPath("$.status").value("Draft"))
            .andExpect(jsonPath("$.id").isNotEmpty)
    }
}
```

---

## Zero Mocks + CORS End-to-End

- **Zero mocks inside the application**: ITs exercise the real use cases, real adapters, real database, real error advice. No mockk / `@MockkBean` in ITs — bean-level mocking is what `@WebMvcTest` controller tests are for. WireMock is allowed only at genuine external HTTP boundaries (below).
- **CORS is asserted end-to-end in an IT**, not trusted from config review: an allowed origin gets 200 + `Access-Control-Allow-Origin`; a foreign origin gets 403 with the header absent:

```kotlin
@Test
fun `cors allows the configured origin and rejects others`() {
    mockMvc
        .get("/api/recipes/search") {
            param("ingredients", "eggs")
            header(HttpHeaders.ORIGIN, "http://localhost:3000")
        }.andExpect {
            status { isOk() }
            header { string("Access-Control-Allow-Origin", "http://localhost:3000") }
        }
    mockMvc
        .get("/api/recipes/search") {
            param("ingredients", "eggs")
            header(HttpHeaders.ORIGIN, "http://evil.example")
        }.andExpect {
            status { isForbidden() }
            header { doesNotExist("Access-Control-Allow-Origin") }
        }
}
```

---

## WireMock for External Services

```kotlin
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@ActiveProfiles("test")
class WorkflowAdapterIntegrationTest {

    companion object {
        @JvmStatic
        val wireMock = WireMockServer(WireMockConfiguration.wireMockConfig().dynamicPort())

        @BeforeAll
        @JvmStatic
        fun startWireMock() { wireMock.start() }

        @AfterAll
        @JvmStatic
        fun stopWireMock() { wireMock.stop() }

        @JvmStatic
        @DynamicPropertySource
        fun props(registry: DynamicPropertyRegistry) {
            registry.add("clients.workflow.url") { "http://localhost:${wireMock.port()}" }
        }
    }

    @Autowired
    private lateinit var workflowAdapter: WorkflowAdapter

    @BeforeEach
    fun resetWireMock() = wireMock.resetAll()

    @Test
    fun `getPublishedWorkflow - success returns workflow`() {
        val workflowId = UUID.randomUUID()
        wireMock.stubFor(
            get(urlEqualTo("/api/workflows/$workflowId"))
                .willReturn(aResponse()
                    .withStatus(200)
                    .withHeader("Content-Type", "application/json")
                    .withBody("""{"id": "$workflowId", "name": "Hiring Process", "steps": []}"""))
        )

        val result = workflowAdapter.getPublishedWorkflow(workflowId)

        assertThat(result).isNotNull()
        assertThat(result!!.name).isEqualTo("Hiring Process")
    }

    @Test
    fun `getPublishedWorkflow - 404 returns null`() {
        wireMock.stubFor(get(anyUrl()).willReturn(aResponse().withStatus(404)))

        val result = workflowAdapter.getPublishedWorkflow(UUID.randomUUID())

        assertThat(result).isNull()
    }
}
```

### WireMock — streaming (SSE / chunked) response body

Stub a `text/event-stream` body the same way as any other body — WireMock serves it as one chunk unless split explicitly. For an adapter that consumes SSE via `WebClient.bodyToFlux(...)`, a single stubbed body containing multiple `data:` frames is enough to exercise the parsing/translation logic; only reach for `withChunkedDribbleDelay(...)` when you specifically need to assert incremental/partial delivery behavior.

```kotlin
@Test
fun `streamThing - relays only recognized event types, filters the rest`() {
    val sseBody = """
        data: {"type":"text_chunk","session_id":"s1","data":{"content":"Hello"}}

        data: {"type":"tool_call","session_id":"s1","data":{"name":"lookup"}}

        data: {"type":"done","session_id":"s1","data":{"message_id":"m1"}}

    """.trimIndent()

    wireMock.stubFor(
        post(urlEqualTo("/things/s1/stream"))
            .willReturn(
                aResponse()
                    .withStatus(200)
                    .withHeader("Content-Type", "text/event-stream")
                    .withBody(sseBody),
            ),
    )

    val events = mutableListOf<ThingEvent>()
    val result = adapter.streamThing(SomeId("s1")) { events.add(it) }

    result.assertOk()
    // tool_call is filtered out by the adapter — only 2 of the 3 frames are relayed
    assertThat(events).hasSize(2)
}
```

To simulate an upstream failure for a circuit-breaker/retry test, stub a `5xx`/connection-reset on the same URL instead of a `200`, and assert the adapter maps it to the expected `UseCaseError` (see `error-handling`'s `UpstreamUnavailable` category).

---

## application-test.yml

```yaml
# src/test/resources/application-test.yml
spring:
  jpa:
    hibernate:
      ddl-auto: create-drop  # or validate with Flyway
    show-sql: false
  data:
    mongodb:
      auto-index-creation: true
logging:
  level:
    org.springframework.web: DEBUG
    com.beetween: DEBUG
```

---

## Do Not

- Start a new container per test class — use shared singleton containers with `withReuse(true)`
- Use `@SpringBootTest` for pure unit tests — only for integration tests that need the full context
- Rollback transactions instead of cleaning up — test isolation via `@BeforeEach` delete/drop
- Test domain logic in integration tests — domain logic belongs in unit tests
- Skip `@BeforeEach` cleanup — dirty state causes flaky tests
- Use hardcoded ports — always use `dynamicPort()` / `getFirstMappedPort()`
- Mock application-internal beans in ITs (`@MockkBean`, mockk) — zero mocks; only genuine external HTTP boundaries get WireMock
- Trust CORS configuration without an end-to-end IT asserting both allowed and rejected origins
- Run ITs in the Surefire phase — they are `@Tag("Integration")`, excluded from `test`, executed by Failsafe in `verify`
- Seed shared data only in `@BeforeAll` and assume it survives — reseed idempotently in `@BeforeEach`; cached contexts share the database across classes
- Scatter `@TestPropertySource`/`@DynamicPropertySource`/`@ActiveProfiles`/`properties` on ordinary concrete IT classes — each unique property set spawns a new cached context; put overrides on the shared base or a dedicated class
- Exercise `q=` / full-text `$search` against the community MongoDB container — `$search` is Atlas-only; the query fails
