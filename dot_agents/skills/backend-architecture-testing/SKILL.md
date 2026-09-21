---
name: architecture-testing
description: |
  ArchUnit-based architecture tests for Beetween Kotlin Spring Boot services. Covers hexagonal / onion architecture enforcement, naming convention rules, cross-domain boundary checks, cycle detection, and application service rules. Use when adding ArchUnit tests or reviewing that architecture constraints are properly enforced.
---

# Architecture Testing — ArchUnit

## When to Use This Skill

- Adding architecture tests to a new service
- Adding a new rule to enforce a new naming convention
- Checking that clean architecture boundaries are respected
- Detecting cycles between packages or slices
- Verifying application service constraints (no Spring in domain, etc.)

---

## Test Dependency

```xml
<dependency>
    <groupId>com.tngtech.archunit</groupId>
    <artifactId>archunit-junit5</artifactId>
    <version>1.4.1</version>
    <scope>test</scope>
</dependency>
```

---

## Base Setup

```kotlin
// test/kotlin/com/beetween/{service}/architecture/ArchUnitTestBase.kt
@AnalyzeClasses(packages = ["com.beetween.juryapi"])
object ArchTestSuite

val ALL_CLASSES: JavaClasses by lazy {
    ClassFileImporter()
        .withImportOption(ImportOption.DoNotIncludeTests())
        .importPackages("com.beetween.juryapi")
}
```

**Domain-first projects (ADR-0013):** every `..`-wildcarded package pattern below (e.g. `..adapter.inbound.web..`, `..application.port.outbound..`) matches correctly whether the base package is layer-first (`com.beetween.juryapi.application..`) or domain-first (`com.beetween.juryapi.session.application..`) — the `..` wildcard absorbs the extra domain-name segment. **No rule-pattern changes are needed** when adopting the domain-first layout; only `@AnalyzeClasses(packages = [...])` needs to point at the app's actual root package, same as today.

---

## Suites That Analyze Test Classes

A service may deliberately let SOME suites analyze test classes (omit `ImportOption.DoNotIncludeTests()` — e.g. 3 of 4 rule tests in talent-api) so naming rules hold test doubles to the same suffix table as production classes. In a service with such suites:

- Every class in the test tree obeys the suffix table — never name a test class or helper `*Controller`, `*Service`, `*ApplicationService`, `*Adapter`, `*Entity`, `*Document`, `*Repository` unless it genuinely is one.
- The sanctioned exception: fakes/stubs implementing an outbound port are named `*Adapter` and live under `..adapter.outbound..` in the test tree (see `unit-testing` — Test Doubles for Outbound Ports).
- When a new test double fails the arch suite, fix the double's name/placement — never weaken the rule or exclude tests from that suite.

*(From talent-api PR40 session, 2026-09-10.)*

---

## Clean Architecture Layer Rules

### Onion Architecture (recval-api / jury-api style)

```kotlin
@AnalyzeClasses(packages = ["com.beetween.recvalapi"])
class CleanArchitectureTest {

    @ArchTest
    val onionRules: ArchRule = onionArchitecture()
        .domainModels("..domain.model..")
        .domainServices("..domain..")
        .applicationServices("..application..")
        .adapter("web", "..adapter.inbound.web..")
        .adapter("persistence", "..adapter.outbound.persistence..")
        .adapter("notification", "..adapter.outbound.notification..")
        .adapter("user", "..adapter.outbound.user..")
        .withOptionalLayers(true)

    @ArchTest
    val layeredRules: ArchRule = layeredArchitecture()
        .consideringOnlyDependenciesInLayers()   // dependencies to classes outside the four layers (libs) are not violations
        .layer("Domain").definedBy("..domain..")
        .layer("Application").definedBy("..application..")
        .layer("Adapter").definedBy("..adapter..")
        .layer("Config").definedBy("..config..")  // defined, unconstrained: config may access everything
        .whereLayer("Domain").mayNotAccessAnyLayer()
        .whereLayer("Application").mayOnlyAccessLayers("Domain")
        .whereLayer("Adapter").mayOnlyAccessLayers("Application", "Domain")
        .withOptionalLayers(true)                // a service may not have all four layers yet
        .because(
            "Domain depends on nothing; application only on domain; adapters on application and domain; config wires everything",
        )

    @ArchTest
    val noCycles: ArchRule = slices()
        .matching("com.beetween.recvalapi.(*)..")
        .should().beFreeOfCycles()
}
```

### Domain isolation rules

```kotlin
@ArchTest
val domainMustNotUseSpring: ArchRule = noClasses()
    .that().resideInAPackage("..domain..")
    .should().dependOnClassesThat()
    .resideInAPackage("org.springframework..")
    .because("Domain layer must be framework-free")

@ArchTest
val domainMustNotUseJakarta: ArchRule = noClasses()
    .that().resideInAPackage("..domain..")
    .should().dependOnClassesThat()
    .resideInAPackage("jakarta..")
    .because("Domain layer must have no persistence annotations")

@ArchTest
val domainMustNotUseJackson: ArchRule = noClasses()
    .that().resideInAPackage("..domain..")
    .should().dependOnClassesThat()
    .resideInAPackage("com.fasterxml.jackson..")
    .because("Domain layer must have no serialization annotations")

@ArchTest
val applicationMustNotUseHttpTypes: ArchRule = noClasses()
    .that().resideInAPackage("..application..")
    .should().dependOnClassesThat()
    .resideInAnyPackage("jakarta.servlet..", "org.springframework.http..", "org.springframework.web..")
    .because("Application layer must not know about HTTP")

@ArchTest
val applicationMustNotUseJpa: ArchRule = noClasses()
    .that().resideInAPackage("..application..")
    .should().dependOnClassesThat()
    .resideInAnyPackage("jakarta.persistence..", "org.springframework.data..")
    .because("Application layer must not use persistence framework")
```

**Neither domain nor application may reach into `..config..`** — config is the wiring layer: it depends on everything, nothing depends on it.

```kotlin
@ArchTest
val domainMustNotReachIntoConfig: ArchRule = noClasses()
    .that().resideInAPackage("..domain..")
    .should().dependOnClassesThat()
    .resideInAPackage("..config..")
    .because("Config wires the application; the domain must never depend on wiring")

@ArchTest
val applicationMustNotReachIntoConfig: ArchRule = noClasses()
    .that().resideInAPackage("..application..")
    .should().dependOnClassesThat()
    .resideInAPackage("..config..")
    .because("Config wires the application; the application layer must never depend on wiring")
```

Every rule carries a `.because(...)`. `noClasses()` and `slices()` rules that may legitimately match zero classes in a given service (domain isolation, config reach, naming suffixes) also carry `.allowEmptyShould(true)` so the suite is portable across services — never on rules whose match must exist (see Do Not).

---

## Naming Convention Rules

```kotlin
@AnalyzeClasses(packages = ["com.beetween.juryapi"])
class NamingRulesTest {

    @ArchTest
    val useCaseInterfacesMustHaveSuffix: ArchRule = classes()
        .that().resideInAPackage("..application.port.inbound..")
        .and().areInterfaces()
        .should().haveSimpleNameEndingWith("UseCase")

    @ArchTest
    val applicationServicesSuffix: ArchRule = classes()
        .that().resideInAPackage("..application.service..")
        .and().areAnnotatedWith(Service::class.java)
        .should().haveSimpleNameEndingWith("Service")
        .orShould().haveSimpleNameEndingWith("ApplicationService")

    // When services are plain classes wired by @Configuration @Bean methods (no @Service
    // stereotype — the Beetween wiring convention), the annotation-filtered rule above passes
    // vacuously. Add the package-wide variant so the suffix holds for every class in the package:
    @ArchTest
    val applicationServicesSuffixNoStereotype: ArchRule = classes()
        .that().resideInAPackage("..application.service..")
        .should().haveSimpleNameEndingWith("Service")
        .orShould().haveSimpleNameEndingWith("ApplicationService")

    @ArchTest
    val commandsSuffix: ArchRule = classes()
        .that().resideInAPackage("..application.command..")
        .should().haveSimpleNameEndingWith("Command")
        .orShould().haveSimpleNameEndingWith("Query")

    @ArchTest
    val controllersSuffix: ArchRule = classes()
        .that().resideInAPackage("..adapter.inbound.web.controller..")
        .and().areAnnotatedWith(RestController::class.java)
        .should().haveSimpleNameEndingWith("Controller")
        .orShould().haveSimpleNameEndingWith("Endpoint")

    @ArchTest
    val repositoryAdaptersSuffix: ArchRule = classes()
        .that().resideInAPackage("..adapter.outbound.persistence.adapter..")
        .should().haveSimpleNameEndingWith("Adapter")

    @ArchTest
    val jpaEntitiesSuffix: ArchRule = classes()
        .that().areAnnotatedWith(Entity::class.java)
        .should().haveSimpleNameEndingWith("Entity")

    @ArchTest
    val springDataRepositoriesSuffix: ArchRule = classes()
        .that().resideInAPackage("..adapter.outbound.persistence.repository..")
        .and().areInterfaces()
        .should().haveSimpleNameEndingWith("Repository")

    @ArchTest
    val mongoDocumentsSuffix: ArchRule = classes()
        .that().areAnnotatedWith(Document::class.java)
        .should().haveSimpleNameEndingWith("Document")

    @ArchTest
    val repositoryPortsSuffix: ArchRule = classes()
        .that().resideInAPackage("..domain.port.outbound..")
        .and().areInterfaces()
        .should().haveSimpleNameEndingWith("Port")
        .orShould().haveSimpleNameEndingWith("Repository")
}
```

Full suffix table (enforced by the rules above unless marked convention-only):

| Element | Suffix |
|---|---|
| Inbound use-case interfaces | `UseCase` |
| Application services | `Service` (or `ApplicationService`) |
| Use-case inputs | `Command` or `Query` |
| REST controllers | `Controller` |
| Persistence adapters | `Adapter` |
| Spring Data repositories | `Repository` (e.g. `RecipeJpaRepository`) |
| JPA entities | `Entity` |
| Domain outbound ports | `Port` or `Repository` |
| DTOs (convention only) | `*RequestDto` / `*ResponseDto` |
| Domain errors (convention only) | `DomainError` base + `<Context>DomainError` per context |
| Application errors (convention only) | `UseCaseError` |

---

## Application Service Rules

```kotlin
@AnalyzeClasses(packages = ["com.beetween.juryapi"])
class ApplicationServiceRulesTest {

    @ArchTest
    val servicesMustImplementUseCaseInterface: ArchRule = classes()
        .that().resideInAPackage("..application.service..")
        .and().areAnnotatedWith(Service::class.java)
        .should().implement(
            resideInAPackage("..application.port.inbound..")
        )
        .because("Application services must implement a use case interface")

    @ArchTest
    val servicesMustNotBeCalledDirectlyFromControllers: ArchRule = noClasses()
        .that().resideInAPackage("..adapter.inbound.web..")
        .should().dependOnClassesThat()
        .resideInAPackage("..application.service..")
        .because("Controllers must inject use case interfaces, not service implementations")

    @ArchTest
    val useCasesMustBeImplementedByApplicationLayer: ArchRule = classes()
        .that().resideInAPackage("..application.port.inbound..")
        .and().areInterfaces()
        .should(beImplementedByClassesIn("..application.service.."))
}
```

---

## Cross-Domain Boundary Rules

```kotlin
@AnalyzeClasses(packages = ["com.beetween.iamapi"])
class CrossDomainBoundaryTest {

    @ArchTest
    val groupDomainMustNotDependOnUserDomain: ArchRule = noClasses()
        .that().resideInAPackage("..group.domain..")
        .should().dependOnClassesThat()
        .resideInAPackage("..user.domain..")
        .because("Cross-domain domain dependencies forbidden")

    @ArchTest
    val boundedContextsMustNotShareDomainModels: ArchRule = slices()
        .matching("com.beetween.iamapi.(*).domain..")
        .should().notDependOnEachOther()
        .because("Bounded context domain models must be independent")
}
```

---

## Cycle Detection

```kotlin
@ArchTest
val noCyclicDependencies: ArchRule = slices()
    .matching("com.beetween.juryapi.(*)..")
    .should().beFreeOfCycles()
    .because("Cyclic dependencies cause architectural rot and make testing impossible")
```

---

## Custom ArchCondition helpers

```kotlin
// Reusable condition: class in package X implements interface from package Y
fun beImplementedByClassesIn(packagePattern: String): ArchCondition<JavaClass> =
    object : ArchCondition<JavaClass>("be implemented by classes in $packagePattern") {
        override fun check(javaClass: JavaClass, events: ConditionEvents) {
            val hasImpl = javaClass.allSubclasses.any {
                it.packageName.matches(packagePattern.toRegex())
            }
            if (!hasImpl) events.add(SimpleConditionEvent.violated(javaClass,
                "${javaClass.name} has no implementation in $packagePattern"))
        }
    }
```

---

## Recommended Test File Structure

```
src/test/kotlin/{base_package}/architecture/
├── CleanArchitectureTest.kt     ← onion + layered + cycle rules
├── NamingRulesTest.kt           ← all naming suffix rules
├── ApplicationServiceRulesTest.kt ← service → interface, controller → interface
├── CrossDomainBoundaryTest.kt   ← no cross-domain domain deps (multi-context services)
└── DomainIsolationTest.kt       ← no Spring/JPA/Jackson in domain
```

---

## Do Not

- Put `@AnalyzeClasses` on a base class that is extended — put it on the concrete test class
- Flip `ImportOption.DoNotIncludeTests()` on/off casually — pick per suite, deliberately: structural/layer rules exclude test classes; naming-rule suites may deliberately include them so test doubles obey the suffix table (then every test class must comply — see Suites That Analyze Test Classes)
- Write architecture tests that check implementation details (method count, line count) — check structure only
- Skip the cycle check — cyclic packages always indicate an architectural problem
- Use `allowEmptyShould(true)` to silence failures on rules whose match must exist (e.g. controllers must not depend on service implementations, a use case must have an implementation) — investigate the root cause instead. It IS required on `noClasses()`/`slices()` rules that may legitimately match zero classes in a given service (domain/config isolation, naming suffixes, cycle detection) so the suite stays portable across services
