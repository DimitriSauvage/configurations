---
name: postgresql-jpa
description: |
  PostgreSQL and Spring Data JPA persistence conventions. Use when designing database JPA entities,  mapping table relationships, writing Liquibase database migrations, writing SQL schema changes, or  implementing JPA repository adapters to persist domain aggregates. Do NOT use for MongoDB document models.
---

# PostgreSQL + Spring Data JPA — Beetween

## When to Use This Skill

- Designing JPA entities for a new domain aggregate
- Implementing a `RepositoryPort` with a JPA adapter
- Writing Liquibase changelogs for schema changes
- Using JSONB for snapshot/embedded data
- Implementing dynamic filter queries with `JpaSpecificationExecutor`
- Handling optimistic locking for concurrent updates

---

## JPA Entity Design Rules

### Separation from domain model

**JPA `@Entity` classes live in `adapter.outbound.persistence.document/` (or `entity/`)**.
Domain models live in `domain.model/` and have zero JPA annotations.

```
adapter/outbound/persistence/
├── adapter/         ← RequestRepositoryAdapter implements RequestRepositoryPort
├── entity/          ← RequestEntity (@Entity), RequestHistoryEntity (@Entity)
└── repository/      ← RequestJpaRepository extends JpaRepository
```

### Entity structure

```kotlin
@Entity
@Table(name = "requests")
class RequestEntity(
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    var id: UUID? = null,

    @Version
    var version: Long = 0,                            // optimistic locking

    var groupId: UUID,
    var creatorId: UUID,
    var name: String,
    var workflowId: UUID,

    @Enumerated(EnumType.STRING)
    var status: RequestStatus,

    var currentStep: Int = 0,

    // JSONB snapshot — workflow steps frozen at submission
    @JdbcTypeCode(SqlTypes.JSON)
    @Column(columnDefinition = "jsonb")
    var steps: List<RequestStep> = emptyList(),

    @OneToMany(cascade = [CascadeType.ALL], fetch = FetchType.LAZY, mappedBy = "request")
    @BatchSize(50)
    var fieldValues: MutableList<RequestStepFieldValueEntity> = mutableListOf(),

    @OneToMany(cascade = [CascadeType.ALL], fetch = FetchType.LAZY)
    @OrderBy("occurredAt ASC")
    @BatchSize(50)
    var history: MutableList<RequestHistoryEntity> = mutableListOf(),

    var createdAt: Instant = Instant.now(),
    var updatedAt: Instant = Instant.now(),
)
```

### Rules

- Always use `@Enumerated(EnumType.STRING)` — never `ORDINAL` (breaks on reordering)
- Always add `@Version var version: Long = 0` for aggregates that have concurrent updates
- Use `@BatchSize(50)` on `@OneToMany` collections to avoid N+1 queries
- Use `FetchType.LAZY` for all collections — never `EAGER`
- `@GeneratedValue(strategy = GenerationType.UUID)` for UUID primary keys

### JSONB for embedded structures

Store complex embedded data as JSONB when it does not need to be queried column-by-column:

```kotlin
@JdbcTypeCode(SqlTypes.JSON)
@Column(columnDefinition = "jsonb")
var steps: List<RequestStep> = emptyList()
```

Requires `jackson-datatype-jsr310` for `Instant` serialization.

### Kotlin no-arg constructor

JPA requires a no-arg constructor. Use the `kotlin-jpa` compiler plugin (in `kotlin-maven-plugin`) — it generates no-arg constructors for `@Entity` classes automatically. No `var` fields need to be lateinit.

---

## Spring Data Repository

```kotlin
// adapter/outbound/persistence/repository/RequestJpaRepository.kt
interface RequestJpaRepository : JpaRepository<RequestEntity, UUID>, JpaSpecificationExecutor<RequestEntity> {

    fun findByIdAndGroupId(id: UUID, groupId: UUID): RequestEntity?

    @Query("SELECT r FROM RequestEntity r WHERE r.groupId = :groupId AND r.status != 'ARCHIVED'")
    fun findActiveByGroupId(@Param("groupId") groupId: UUID): List<RequestEntity>

    fun existsByWorkflowIdAndStatusIn(workflowId: UUID, statuses: List<RequestStatus>): Boolean
}
```

---

## Dynamic Queries — Specification

```kotlin
// adapter/outbound/persistence/adapter/RequestSpecifications.kt
object RequestSpecifications {

    fun byGroupId(groupId: UUID): Specification<RequestEntity> =
        Specification { root, _, cb -> cb.equal(root.get<UUID>("groupId"), groupId) }

    fun byStatus(status: RequestStatus): Specification<RequestEntity> =
        Specification { root, _, cb -> cb.equal(root.get<RequestStatus>("status"), status) }

    fun byNameContains(search: String): Specification<RequestEntity> =
        Specification { root, _, cb -> cb.like(cb.lower(root.get("name")), "%${search.lowercase()}%") }

    fun active(): Specification<RequestEntity> =
        Specification { root, _, cb ->
            root.get<RequestStatus>("status").`in`(
                listOf(RequestStatus.DRAFT, RequestStatus.PENDING, RequestStatus.PARTIAL_APPROVED)
            )
        }
}

// Usage in adapter:
fun findAll(query: ListRequestsQuery): List<Request> {
    val spec = Specification.where(byGroupId(query.groupId))
        .andIf(query.status != null) { byStatus(query.status!!) }
        .andIf(query.search != null) { byNameContains(query.search!!) }

    return jpaRepository.findAll(spec, PageRequest.of(query.page, query.size))
        .map { mapper.toDomain(it) }
        .toList()
}

// Kotlin extension for conditional spec composition:
fun <T> Specification<T>.andIf(condition: Boolean, other: () -> Specification<T>): Specification<T> =
    if (condition) this.and(other()) else this
```

### Query Strategy Decision Guide

Choose the simplest strategy that satisfies the use case:

1. Derived repository methods

- Best for straightforward lookups (`findByIdAndGroupId`, `existsBy...`)
- Prefer first for readability and maintainability

2. `JpaSpecificationExecutor` + `Specification`

- Best for optional filters, combinable predicates, and dynamic search
- Prefer for list endpoints with many filter combinations

3. `@Query` JPQL

- Best for stable custom queries that are too complex for derived methods
- Keep query concise and strongly aligned with entity model names

4. Native SQL

- Use only when JPQL/Specification cannot express required performance query
- Require explicit justification and database portability review

---

## Repository Adapter

```kotlin
// adapter/outbound/persistence/adapter/RequestRepositoryAdapter.kt
@Component
class RequestRepositoryAdapter(
    private val jpaRepository: RequestJpaRepository,
    private val mapper: RequestEntityMapper,
) : RequestRepositoryPort {

    override fun findByIdAndGroupId(id: UUID, groupId: UUID): Request? =
        jpaRepository.findByIdAndGroupId(id, groupId)?.let { mapper.toDomain(it) }

    @Transactional
    override fun save(request: Request): Request {
        val entity = jpaRepository.findById(request.id ?: UUID.randomUUID())
            .map { existing ->
                // Update existing entity (preserves @Version for optimistic lock)
                existing.apply {
                    name = request.name
                    status = request.status
                    updatedAt = request.updatedAt
                }
            }
            .orElseGet { mapper.toEntity(request) }

        return try {
            mapper.toDomain(jpaRepository.save(entity))
        } catch (ex: ObjectOptimisticLockingFailureException) {
            throw ConcurrencyConflictException("Concurrent modification detected", ex)
        }
    }

    override fun findAll(query: ListRequestsQuery): Page<Request> {
        val spec = Specification.where(byGroupId(query.groupId))
            .andIf(query.status != null) { byStatus(query.status!!) }
        return jpaRepository.findAll(spec, PageRequest.of(query.page, query.size))
            .map { mapper.toDomain(it) }
    }
}
```

**`@Transactional` goes on the adapter method** — never on domain or application services.

---

## Entity Mapper

```kotlin
// adapter/outbound/persistence/adapter/RequestEntityMapper.kt
@Component
class RequestEntityMapper {

    fun toDomain(entity: RequestEntity): Request =
        Request.rehydrate(
            id = entity.id!!,
            groupId = entity.groupId,
            name = entity.name,
            status = entity.status,
            history = entity.history.map { historyEvent(it) },
            createdAt = entity.createdAt,
            updatedAt = entity.updatedAt,
        )

    fun toEntity(request: Request): RequestEntity =
        RequestEntity(
            id = request.id,
            groupId = request.groupId,
            name = request.name,
            status = request.status,
            steps = request.state.steps,
            createdAt = request.audit.createdAt,
            updatedAt = request.audit.updatedAt,
        )

    private fun historyEvent(entity: RequestHistoryEntity): RequestHistory =
        RequestHistory(type = entity.type, actorId = entity.actorId, occurredAt = entity.occurredAt)
}
```

---

## Liquibase Migrations

```
src/main/resources/db/changelog/
├── db.changelog-master.xml
└── changes/
    ├── 001-create-requests-table.xml
    ├── 002-add-request-history.xml
    └── 003-add-jsonb-steps-column.xml
```

Example changelog:

```xml
<!-- 001-create-requests-table.xml -->
<databaseChangeLog xmlns="http://www.liquibase.org/xml/ns/dbchangelog" ...>
    <changeSet id="001" author="beetween">
        <createTable tableName="requests">
            <column name="id" type="uuid">
                <constraints primaryKey="true" nullable="false"/>
            </column>
            <column name="version" type="bigint" defaultValue="0">
                <constraints nullable="false"/>
            </column>
            <column name="group_id" type="uuid"><constraints nullable="false"/></column>
            <column name="creator_id" type="uuid"><constraints nullable="false"/></column>
            <column name="name" type="varchar(255)"><constraints nullable="false"/></column>
            <column name="workflow_id" type="uuid"><constraints nullable="false"/></column>
            <column name="status" type="varchar(50)"><constraints nullable="false"/></column>
            <column name="current_step" type="int" defaultValue="0"/>
            <column name="steps" type="jsonb"/>
            <column name="created_at" type="timestamptz"><constraints nullable="false"/></column>
            <column name="updated_at" type="timestamptz"><constraints nullable="false"/></column>
        </createTable>

        <createIndex tableName="requests" indexName="idx_requests_group_id">
            <column name="group_id"/>
        </createIndex>
        <createIndex tableName="requests" indexName="idx_requests_status">
            <column name="status"/>
        </createIndex>
    </changeSet>
</databaseChangeLog>
```

**Rules:**

- One changeSet per logical change — never edit an existing changeSet
- Always add indexes on foreign keys and frequently filtered columns
- Use `timestamptz` (not `timestamp`) for all datetime columns
- Never use `ddl-auto: update` or `ddl-auto: create` — always Liquibase

---

## `application.yml` JPA Settings

```yaml
spring:
  datasource:
    url: ${POSTGRES_URL}
    username: ${POSTGRES_USER}
    password: ${POSTGRES_PASSWORD}
    hikari:
      maximum-pool-size: 10
      minimum-idle: 2
      connection-timeout: 30000
  jpa:
    hibernate:
      ddl-auto: validate # Liquibase owns the schema
    properties:
      hibernate.dialect: org.hibernate.dialect.PostgreSQLDialect
      hibernate.format_sql: false
      hibernate.jdbc.batch_size: 25
      hibernate.order_inserts: true
      hibernate.order_updates: true
  liquibase:
    change-log: classpath:db/changelog/db.changelog-master.xml
    enabled: true
```

---

## Do Not

- Put `@Entity` in `domain/` — entities belong in `adapter/outbound/persistence/`
- Use `ddl-auto: create-drop` in production — use Liquibase
- Use `FetchType.EAGER` on collections — always `LAZY`
- Use `@Transactional` on application services — only on adapter methods
- Return JPA entities from adapter methods — always map to domain objects
- Use `@Column(nullable = false)` as your only validation — also validate at domain level
- Query with raw `@Query` JPQL for simple lookups — use derived method names when possible
