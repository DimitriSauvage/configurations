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

## Shared Container Strategy

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
