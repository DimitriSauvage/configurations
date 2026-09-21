---
name: spring-boot-hexagonal
description: |
  Spring Boot configuration, bean wiring, and adapter patterns for Beetween hexagonal architecture. Covers @Configuration bean registration, Spring Security + JWT setup, REST controller conventions, OpenAPI documentation meta-annotations, event publishing via Apache Pulsar, and Spring Data integration. Use when wiring Spring Boot to the hexagonal architecture layers.
---

# Spring Boot + Hexagonal Architecture — Beetween

## When to Use This Skill

- Wiring use cases and ports to Spring beans
- Configuring Spring Security with JWT / Keycloak
- Adding OpenAPI documentation to controllers
- Publishing domain events via Apache Pulsar
- Setting up Spring Data JPA or MongoDB repositories
- Configuring application beans without polluting the domain

---

## Bean Registration

### Services as `@Service`

Application services are annotated `@Service`:

```kotlin
@Service
class CreateJuryService(
    private val repository: JuryRepositoryPort,
    private val notificationPort: NotificationPort,
    private val timeProvider: TimeProviderPort,
) : CreateJuryUseCase
```

Spring auto-detects via `@ComponentScan`. The controller injects `CreateJuryUseCase` (interface) — Spring resolves to `CreateJuryService`.

### Framework-free services via `@Configuration`

When application services must stay pure (no `@Service`), register in a `@Configuration`:

```kotlin
@Configuration
class RequestBeanConfig(
    private val repository: RequestRepositoryPort,
    private val notificationPort: NotificationPort,
    private val timeProvider: TimeProviderPort,
) {
    @Bean fun createRequestUseCase(): CreateRequestUseCase =
        CreateRequestApplicationService(repository, notificationPort, timeProvider)

    @Bean fun approveRequestUseCase(): ApproveRequestUseCase =
        ApproveRequestApplicationService(repository, notificationPort, timeProvider)
}
```

`CreateRequestApplicationService` has no Spring annotations — it is a plain class.

### Adapters as `@Component`

```kotlin
@Component
class JuryRepositoryAdapter(
    private val mongoRepository: JuryMongoRepository,
    private val mapper: JuryDocumentMapper,
) : JuryRepositoryPort
```

### Time provider

```kotlin
@Component
class SystemTimeProviderAdapter : TimeProviderPort {
    override fun now(): Instant = Instant.now()
}
```

In tests: `val fakeTime = TimeProviderPort { Instant.parse("2025-06-01T10:00:00Z") }`

---

## Spring Security + JWT

### SecurityFilterChain

```kotlin
@Configuration
@EnableWebSecurity
class SecurityFilterChainConfig(
    private val keycloakRoleConverter: NullSafeKeycloakRoleConverter,
) {
    @Bean
    fun filterChain(http: HttpSecurity): SecurityFilterChain = http
        .csrf { it.disable() }
        .sessionManagement { it.sessionCreationPolicy(STATELESS) }
        .authorizeHttpRequests { auth ->
            auth.requestMatchers("/actuator/health", "/v3/api-docs/**", "/swagger-ui/**").permitAll()
            auth.anyRequest().authenticated()
        }
        .oauth2ResourceServer { oauth2 ->
            oauth2.jwt { jwt ->
                jwt.jwtAuthenticationConverter(
                    JwtAuthenticationConverter().also { it.setJwtGrantedAuthoritiesConverter(keycloakRoleConverter) }
                )
            }
        }
        .build()
}
```

### Role-based JWT claim extractor

```kotlin
@Component
class NullSafeKeycloakRoleConverter : Converter<Jwt, Collection<GrantedAuthority>> {
    override fun convert(jwt: Jwt): Collection<GrantedAuthority> {
        val realmRoles = jwt.getClaimAsMap("realm_access")?.get("roles") as? List<*> ?: emptyList<Any>()
        return realmRoles.filterIsInstance<String>().map { SimpleGrantedAuthority("ROLE_$it") }
    }
}
```

### JWT Claim Argument Resolvers

```kotlin
// Annotation
@Target(AnnotationTarget.VALUE_PARAMETER)
@Retention(AnnotationRetention.RUNTIME)
annotation class CallerCompanyId

// Resolver
@Component
class CompanyIdArgumentResolver : HandlerMethodArgumentResolver {
    override fun supportsParameter(p: MethodParameter) =
        p.hasParameterAnnotation(CallerCompanyId::class.java)

    override fun resolveArgument(p: MethodParameter, mav: ModelAndViewContainer?,
                                  req: NativeWebRequest, binder: WebDataBinderFactory?): UUID {
        val jwt = (req.userPrincipal as JwtAuthenticationToken).token
        return UUID.fromString(jwt.getClaimAsString("companyId"))
    }
}

// Registration
@Configuration
class WebMvcConfig(private val resolver: CompanyIdArgumentResolver) : WebMvcConfigurer {
    override fun addArgumentResolvers(resolvers: MutableList<HandlerMethodArgumentResolver>) {
        resolvers.add(resolver)
    }
}

// Usage in controller
@PostMapping
fun create(@Valid @RequestBody dto: CreateJuryRequestDto, @CallerCompanyId companyId: UUID): ResponseEntity<JuryResponseDto>
```

---

## REST Controller Conventions

### Base structure

```kotlin
@RestController
@RequestMapping("/api/v1/juries")
@Tag(name = "Juries", description = "Jury management operations")
class JuryController(
    private val createJuryUseCase: CreateJuryUseCase,
    private val listJuriesUseCase: ListJuriesUseCase,
    private val getJuryUseCase: GetJuryUseCase,
) {
    @PostMapping
    @CreatedOpenApiResponseDoc
    @UnprocessableOpenApiResponseDoc
    fun create(
        @Valid @RequestBody dto: CreateJuryRequestDto,
        @CallerCompanyId companyId: UUID,
    ): ResponseEntity<JuryResponseDto> =
        createJuryUseCase.execute(dto.toCommand(CompanyId(companyId))).fold(
            success = { ResponseEntity.status(HttpStatus.CREATED).body(JuryResponseDto.from(it)) },
            failure = { throw ApplicationException(it) },
        )

    @GetMapping
    @OkOpenApiResponseDoc
    fun list(@CallerCompanyId companyId: UUID): ResponseEntity<List<JurySummaryDto>> =
        listJuriesUseCase.execute(ListJuriesQuery(CompanyId(companyId))).fold(
            success = { ResponseEntity.ok(it.map(JurySummaryDto::from)) },
            failure = { throw ApplicationException(it) },
        )
}
```

### OpenAPI meta-annotations

Define reusable composed annotations to keep controllers clean:

```kotlin
@Target(AnnotationTarget.FUNCTION)
@Retention(AnnotationRetention.RUNTIME)
@ApiResponse(responseCode = "200", description = "OK")
annotation class OkOpenApiResponseDoc

@Target(AnnotationTarget.FUNCTION)
@Retention(AnnotationRetention.RUNTIME)
@ApiResponse(responseCode = "201", description = "Created")
annotation class CreatedOpenApiResponseDoc

@Target(AnnotationTarget.FUNCTION)
@Retention(AnnotationRetention.RUNTIME)
@ApiResponse(responseCode = "404", description = "Not found",
    content = [Content(schema = Schema(implementation = ErrorResponse::class))])
annotation class NotFoundOpenApiResponseDoc

@Target(AnnotationTarget.FUNCTION)
@Retention(AnnotationRetention.RUNTIME)
@ApiResponse(responseCode = "422", description = "Business rule violation",
    content = [Content(schema = Schema(implementation = ErrorResponse::class))])
annotation class UnprocessableOpenApiResponseDoc

@Target(AnnotationTarget.FUNCTION)
@Retention(AnnotationRetention.RUNTIME)
@ApiResponse(responseCode = "409", description = "Conflict",
    content = [Content(schema = Schema(implementation = ErrorResponse::class))])
annotation class ConflictOpenApiResponseDoc
```

### DTO conventions

```kotlin
// Inbound — toCommand extension
data class CreateJuryRequestDto(
    @field:NotBlank val name: String,
    val description: String?,
)

fun CreateJuryRequestDto.toCommand(companyId: CompanyId) = CreateJuryCommand(
    companyId = companyId,
    name = name,
    description = description,
)

// Outbound — companion from()
data class JuryResponseDto(
    val id: String,
    val name: String,
    val status: String,
    val createdAt: Instant,
) {
    companion object {
        fun from(jury: Jury) = JuryResponseDto(
            id = jury.id?.value ?: error("Persisted jury must have an id"),
            name = jury.name,
            status = jury.status.name,
            createdAt = jury.audit.createdAt,
        )
    }
}
```

---

## Event Publishing — Apache Pulsar

### Internal Beetween starter

```kotlin
// event-sdk-starter-spring provides @EventProducer AOP + EventPublisher<T>
// between-events-models provides Avro/Protobuf event schemas

@Service
class CreateGroupService(
    @EventPublisher(topic = "iam.group.created") private val publisher: EventPublisher<GroupCreated>?,
    private val repository: GroupRepository,
) : CreateGroupUseCase {
    override fun create(cmd: CreateGroupCommand): Result<Group, DomainError> =
        repository.save(Group.create(cmd)).onSuccess { group ->
            publisher?.publish(GroupCreated(groupId = group.id.value.toString(), ...))
        }
}
```

For manual Pulsar publishing:
```kotlin
@Component
class AsyncEmailAdapter(
    private val pulsarTemplate: PulsarTemplate<EmailMessage>,
) : AsyncEmailPort {
    override fun send(email: EmailMessage) {
        pulsarTemplate.send("beetween.email.send", email)
    }
}
```

---

## Calling an External HTTP/SSE API from an MVC (non-reactive) app

When an outbound adapter must call an external HTTP API — including one that streams Server-Sent Events — and the service otherwise runs on plain Servlet MVC (`spring-boot-starter-web`, no WebFlux), add **only** the `spring-webflux` dependency (not `spring-boot-starter-webflux`, which would fight Boot's servlet-vs-reactive server auto-detection). This gets you `WebClient` for the outbound call while Boot still resolves to the Servlet stack for the app itself, since `spring-boot-starter-web` is still present.

```kotlin
@Configuration
class ExternalApiClientConfig(
    @Value("\${external-api.base-url}") private val baseUrl: String,
    @Value("\${external-api.api-key}") private val apiKey: String,
    @Value("\${external-api.timeout-ms:10000}") private val timeoutMs: Long,
) {
    @Bean
    fun externalApiWebClient(): WebClient = WebClient.builder()
        .baseUrl(baseUrl)
        .defaultHeader("X-API-Key", apiKey)
        .clientConnector(ReactorClientHttpConnector(HttpClient.create().responseTimeout(Duration.ofMillis(timeoutMs))))
        .build()
}
```

```kotlin
@Component
class ExternalApiAdapter(private val webClient: WebClient) : SomeOutboundPort {

    // Plain request/response call — block() is fine, we're on a Servlet worker thread, not an event loop.
    override fun fetchThing(id: SomeId): Result<Thing, UseCaseError> = try {
        val response = webClient.get().uri("/things/{id}", id.value).retrieve()
            .bodyToMono(ThingResponse::class.java).block()!!
        Ok(response.toDomain())
    } catch (ex: WebClientResponseException) {
        Err(mapError(ex))
    }

    // SSE consumption — bridge the reactive Flux into a callback the application layer understands,
    // so the application layer never depends on WebClient/Flux types.
    override fun streamThing(id: SomeId, onEvent: (ThingEvent) -> Unit): Result<Unit, UseCaseError> = try {
        webClient.get().uri("/things/{id}/stream", id.value)
            .retrieve()
            .bodyToFlux(RemoteStreamFrame::class.java)
            .doOnNext { frame -> onEvent(frame.toDomainEvent()) }  // filter/translate vendor event types here
            .blockLast()  // blocks the calling (background) thread until the stream completes
        Ok(Unit)
    } catch (ex: WebClientResponseException) {
        Err(mapError(ex))
    }
}
```

**If the controller must return an `SseEmitter`, do the blocking relay work on a background executor, never on the request thread** — otherwise the HTTP response never commits until the entire external stream has finished, defeating the point of SSE. `Executors.newVirtualThreadPerTaskExecutor()` (Java 21+) is a good default: it's cheap to block a virtual thread for the whole external-call duration, and it needs no reactive thread-pool tuning.

```kotlin
@PostMapping("/{id}/stream", produces = [MediaType.TEXT_EVENT_STREAM_VALUE])
fun stream(@PathVariable id: String): SseEmitter {
    // ... synchronous pre-checks (validation, existence) BEFORE creating the emitter, so a real
    // HTTP error status is still possible — once the emitter is returned, the response has committed 200.
    val emitter = SseEmitter(timeoutMs)
    streamingExecutor.execute {
        streamThingUseCase.execute(SomeId(id)) { event -> relay(emitter, event) }
        emitter.complete()
    }
    return emitter
}
```

---

## Application Properties

```yaml
# application.yml — typical structure
spring:
  application:
    name: jury-api
  security:
    oauth2:
      resourceserver:
        jwt:
          issuer-uri: ${KEYCLOAK_ISSUER_URI}
  data:
    mongodb:
      uri: ${MONGODB_URI}
      database: ${MONGODB_DATABASE}
  # OR for PostgreSQL:
  datasource:
    url: ${POSTGRES_URL}
    username: ${POSTGRES_USER}
    password: ${POSTGRES_PASSWORD}
  jpa:
    hibernate:
      ddl-auto: validate
    properties:
      hibernate.dialect: org.hibernate.dialect.PostgreSQLDialect

springdoc:
  api-docs:
    path: /v3/api-docs
  swagger-ui:
    path: /swagger-ui.html

management:
  endpoints:
    web:
      exposure:
        include: health,info
```

---

## OpenAPI Config

```kotlin
@Configuration
class OpenApiConfig {
    @Bean
    fun openApi(): OpenAPI = OpenAPI()
        .info(Info().title("Jury API").version("1.0.0").description("Jury management service"))
        .addSecurityItem(SecurityRequirement().addList("bearer"))
        .components(
            Components().addSecuritySchemes("bearer",
                SecurityScheme().type(SecurityScheme.Type.HTTP).scheme("bearer").bearerFormat("JWT"))
        )
}
```

---

## Do Not

- Import `jakarta.servlet` or `org.springframework` in `domain/` or `application/`
- Inject `@Repository` Spring Data interfaces into application services — inject the port adapter
- Use `@Transactional` in application services — put it on the adapter method
- Call `SecurityContextHolder` inside application services — extract claims in the controller/resolver and pass as command fields
- Use `@Value` in domain or application classes — use constructor-injected config objects in `config/`
