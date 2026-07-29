---
name: mongodb-spring
description: |
  MongoDB + Spring Data conventions for Beetween backend services. Covers @Document design with embedded documents, compound indexes, repository adapters, soft delete patterns, status as string fields, ObjectId handling, MongoDB aggregations, email template seeding, and integration with the hexagonal architecture. Use when implementing persistence with MongoDB in a hexagonal architecture.
---

# MongoDB + Spring Data — Beetween

## When to Use This Skill

- Designing MongoDB documents for a new domain aggregate
- Deciding between embedded vs referenced documents
- Implementing a `RepositoryPort` with a MongoDB adapter
- Adding compound indexes on embedded arrays
- Implementing soft delete with `deletedAt`
- Seeding initial data idempotently
- Writing MongoDB queries with custom methods

---

## Document Design Rules

### Separation from domain model

**`@Document` classes live in `adapter.outbound.persistence.document/`**.  
Domain models live in `domain.model/` with zero MongoDB annotations.

```
adapter/outbound/persistence/
├── adapter/         ← JuryRepositoryAdapter implements JuryRepositoryPort
├── document/        ← JuryDocument, EmbeddedMemberDocument, EmbeddedCandidateDocument
└── repository/      ← JuryMongoRepository extends MongoRepository
```

### Document structure

```kotlin
@Document(collection = "juries")
@CompoundIndex(
    name = "idx_candidates_notice_token",
    def = "{'candidates.noticeToken': 1}",
    sparse = true,
)
@CompoundIndex(
    name = "idx_members_email",
    def = "{'members.email': 1}",
    sparse = true,
)
data class JuryDocument(
    @Id val id: String,                        // MongoDB ObjectId as String
    val companyId: String,                     // UUID as String (not UUID type)
    val userExternalId: String?,
    val name: String,
    val status: String,                        // stored as enum.name() — String not Enum
    val members: List<EmbeddedMemberDocument> = emptyList(),
    val candidates: List<EmbeddedCandidateDocument> = emptyList(),
    val description: String? = null,
    val location: String? = null,
    val createdAt: Instant,
    val updatedAt: Instant,
    val deletedAt: Instant? = null,            // soft delete
) {
    companion object {
        fun fromDomain(jury: Jury): JuryDocument = JuryDocument(
            id = jury.id?.value ?: ObjectId().toString(),
            companyId = jury.companyId.value.toString(),
            name = jury.name,
            status = jury.status.name,
            members = jury.members.map { EmbeddedMemberDocument.fromDomain(it) },
            candidates = jury.candidates.map { EmbeddedCandidateDocument.fromDomain(it) },
            createdAt = jury.audit.createdAt,
            updatedAt = jury.audit.updatedAt,
            deletedAt = jury.deletedAt,
        )
    }

    fun toDomain(): Jury = Jury.rehydrate(
        id = JuryId(id),
        companyId = CompanyId(UUID.fromString(companyId)),
        name = name,
        status = JuryStatus.valueOf(status),
        members = members.map { it.toDomain() },
        candidates = candidates.map { it.toDomain() },
        audit = AuditInfo(createdAt, updatedAt),
        deletedAt = deletedAt,
    )
}
```

### Embedded documents

Use embedded documents for sub-entities that are always accessed with the parent:

```kotlin
data class EmbeddedMemberDocument(
    val userId: String,
    val email: String,
    val firstName: String,
    val lastName: String,
    val role: String,              // stored as String, not enum
    val isSessionLeader: Boolean,
) {
    companion object {
        fun fromDomain(member: JuryMember) = EmbeddedMemberDocument(
            userId = member.userId.value.toString(),
            email = member.email.value,
            firstName = member.firstName,
            lastName = member.lastName,
            role = member.role.name,
            isSessionLeader = member.isSessionLeader,
        )
    }

    fun toDomain() = JuryMember.rehydrate(
        userId = UserId(UUID.fromString(userId)),
        email = Email(email),
        firstName = firstName,
        lastName = lastName,
        role = MemberRole.valueOf(role),
        isSessionLeader = isSessionLeader,
    )
}
```

**Embed when:**
- Sub-entity always loaded with parent (no standalone access)
- Sub-entity has no identity outside the parent aggregate
- Total document size stays reasonable (< 5MB MongoDB limit)

**Separate collection when:**
- Sub-entity is queried independently
- Sub-entity is large or grows unboundedly

---

## Spring Data MongoDB Repository

```kotlin
// adapter/outbound/persistence/repository/JuryMongoRepository.kt
interface JuryMongoRepository : MongoRepository<JuryDocument, String> {

    fun findAllByCompanyIdAndDeletedAtIsNull(companyId: String): List<JuryDocument>

    fun findByIdAndCompanyId(id: String, companyId: String): JuryDocument?

    fun findByIdAndDeletedAtIsNull(id: String): JuryDocument?

    // Query on embedded array field
    fun findByCandidatesNoticeToken(token: String): JuryDocument?

    @Query("{'companyId': ?0, 'status': {\$in: ?1}, 'deletedAt': null}")
    fun findByCompanyIdAndStatusIn(companyId: String, statuses: List<String>): List<JuryDocument>

    @Query(value = "{'companyId': ?0, 'deletedAt': null}", count = true)
    fun countActiveByCompanyId(companyId: String): Long
}
```

---

## Repository Adapter

```kotlin
// adapter/outbound/persistence/adapter/JuryRepositoryAdapter.kt
@Component
class JuryRepositoryAdapter(
    private val mongoRepository: JuryMongoRepository,
) : JuryRepositoryPort {

    override fun findById(id: JuryId): Jury? =
        mongoRepository.findByIdAndDeletedAtIsNull(id.value)?.toDomain()

    override fun findAllByCompanyId(companyId: CompanyId): List<Jury> =
        mongoRepository.findAllByCompanyIdAndDeletedAtIsNull(companyId.value.toString())
            .map { it.toDomain() }

    override fun save(jury: Jury): Jury {
        val doc = JuryDocument.fromDomain(jury)
        return mongoRepository.save(doc).toDomain()
    }

    override fun delete(id: JuryId) {
        // Hard delete — use softDelete for aggregates that need audit trail
        mongoRepository.deleteById(id.value)
    }

    override fun softDelete(id: JuryId, now: Instant) {
        mongoRepository.findById(id.value).ifPresent { doc ->
            mongoRepository.save(doc.copy(deletedAt = now, updatedAt = now))
        }
    }

    override fun findByCandidateNoticeToken(token: String): Jury? =
        mongoRepository.findByCandidatesNoticeToken(token)?.toDomain()
}
```

---

## Indexes

### Single field index — `@Indexed`

```kotlin
@Document(collection = "evaluations")
data class EvaluationDocument(
    @Id val id: String,
    @Indexed val juryId: String,       // frequently filtered
    @Indexed val candidateId: String,
    val evaluatorId: String,
    val score: Int,
)
```

### Compound index on embedded array field — `@CompoundIndex`

```kotlin
@Document(collection = "juries")
@CompoundIndex(name = "idx_jury_company_status", def = "{'companyId': 1, 'status': 1}")
@CompoundIndex(name = "idx_candidates_notice_token", def = "{'candidates.noticeToken': 1}", sparse = true)
data class JuryDocument(...)
```

`sparse = true` — index only includes documents where the field exists (useful for nullable fields like `noticeToken`).

### Auto index creation

```yaml
# application.yml — only enable in development or via migration tool
spring.data.mongodb.auto-index-creation: true   # dev only
```

In production, create indexes via a migration tool or startup component.

---

## MongoDB Template for Complex Queries

```kotlin
@Component
class JuryAggregationAdapter(
    private val mongoTemplate: MongoTemplate,
) {

    fun countCandidatesByStatus(juryId: JuryId): Map<String, Long> {
        val aggregation = newAggregation(
            match(Criteria.where("_id").`is`(juryId.value)),
            unwind("candidates"),
            group("candidates.status").count().`as`("count"),
            project("count").and("_id").`as`("status"),
        )
        return mongoTemplate.aggregate(aggregation, "juries", StatusCount::class.java)
            .mappedResults.associate { it.status to it.count }
    }

    private data class StatusCount(val status: String, val count: Long)
}
```

---

## Idempotent Data Seeding

Pattern: guard document in a separate collection tracks whether seeding was done.

```kotlin
@Document(collection = "email_seed_status")
data class EmailSeedStatusDocument(
    @Id val id: String = "email_templates_v1",
    val seededAt: Instant,
)

@Component
class EmailTemplateSeeder(
    private val templateRepo: EmailTemplateMongoRepository,
    private val seedStatusRepo: EmailSeedStatusMongoRepository,
) : ApplicationRunner {

    override fun run(args: ApplicationArguments) {
        if (seedStatusRepo.existsById("email_templates_v1")) {
            log.info { "Email templates already seeded — skipping" }
            return
        }
        DEFAULT_TEMPLATES.forEach { template ->
            if (!templateRepo.existsBySlug(template.slug)) {
                templateRepo.save(template)
            }
        }
        seedStatusRepo.save(EmailSeedStatusDocument(seededAt = Instant.now()))
        log.info { "Email templates seeded successfully" }
    }

    companion object {
        private val DEFAULT_TEMPLATES = listOf(
            EmailTemplateDocument(slug = "jury-invitation", subject = "You are invited...", ...),
            EmailTemplateDocument(slug = "availability-request", subject = "Please confirm...", ...),
        )
    }
}
```

---

## ObjectId Conventions

```kotlin
// Domain: JuryId wraps String
@JvmInline value class JuryId(val value: String)

// Creation: generate in the document's fromDomain companion
val id = jury.id?.value ?: ObjectId().toString()

// Validation: JuryId must be a valid ObjectId if needed
fun JuryId.isValid() = ObjectId.isValid(value)
```

Never use `UUID` as MongoDB document ID — ObjectId is native and more efficient.

---

## `application.yml` MongoDB Settings

```yaml
spring:
  data:
    mongodb:
      uri: ${MONGODB_URI}
      database: ${MONGODB_DATABASE}
      auto-index-creation: false   # production — manage indexes explicitly
```

---

## Do Not

- Put `@Document` in `domain/` — documents belong in `adapter/outbound/persistence/`
- Store enum values as ordinals — always store as `String` (`status = JuryStatus.Draft.name`)
- Use `UUID` as MongoDB `@Id` — use `String` wrapping an `ObjectId`
- Return `JuryDocument` from adapter methods — always call `.toDomain()` before returning
- Use `FetchType.EAGER` equivalent — all embedded docs are always loaded (design accordingly)
- Add `auto-index-creation: true` in production — creates indexes on every startup
- Store large binary data in documents — use GridFS or external object storage
- Use `MongoTemplate` for simple CRUD — use Spring Data repository methods
