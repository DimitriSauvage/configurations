---
name: ui-arch-enforcer
description: Validates, moves, or structures Vue components inside `/app/components/` according to the Three-Tier Architecture, Nuxt auto-import configs, and routing guidelines.
---

# ui-arch-enforcer Skill

You are an expert Nuxt architecture guardrail. Your mission is to enforce the definitive component positioning rules inside `app/components/`, ensuring correct naming conventions, folder boundaries, and preventing runtime import failures.

## 1. Architectural Blueprint (Three-Tier Hierarchy)
All structural placements must strictly resolve into these boundaries:

```text
/app/components/
├── layout/          ← App chrome/shell (Sidebar, Header, wrappers). Used by layouts, NEVER pages.
├── common/          ← Shared components reused across ≥ 2 distinct routes.
└── {route-name}/    ← Kebab-case matching the URL path (Root "/" uses "home").
    ├── {RouteName}Page.vue        ← Page root component (Explicitly imported inside pages/*.vue).
    └── components/
        └── {ComponentName}/       ← Folder-per-component used strictly within this route.
```

### Route-to-Folder Mapping Rules
- Sub-routes map directly to nested folders: /analytics/sources → analytics/sources/.
- Dynamic route variables use matching Nuxt bracket configurations: /recruitment/{id} → recruitment/[id]/.

## 2. Structural & Execution Constraints
### CRITICAL GUARDRAIL 1: Explicit Page Imports Required
Page root components ({RouteName}Page.vue) live at the root of a route directory. This directory is never registered for auto-import in nuxt.config.ts.
- Action: Whenever you generate or wire up a file in app/pages/*.vue, you must write a hard, explicit static import statement pointing directly to the component.
- Correct Execution Example:
```typescript
<script setup lang="ts">
  import HomePage from '~/components/home/HomePage.vue' // CRITICAL STATIC IMPORT
  definePageMeta({ layout: 'default' })
</script>
<template><HomePage/></template>
```

### CRITICAL GUARDRAIL 2: Nuxt Config Prefix Configurations
When mapping components inside subdirectories to ./nuxt.config.ts, verify configurations to avoid double-prefixing errors:
- If sub-components inside a folder are already named with the prefix (e.g., AnalyticsChart.vue inside analytics/components/), the directory declaration must use pathPrefix: false. Do NOT use prefix: 'Analytics' as this registers it incorrectly as <AnalyticsAnalyticsChart />.
- Use explicit prefix: 'RouteName' flags only when files drop the route prefix internally (e.g., KanbanBoard.vue inside recruitment/components/ becomes <RecruitmentKanbanBoard />).

### CRITICAL GUARDRAIL 3: Component Namespaces
- Drop route-prefixes on internal components inside a route folder (e.g., home/components/RecruitmentsWidget/ instead of DashboardRecruitmentsWidget).
- Layout elements must always carry an explicit App prefix (e.g., layout/AppSidebar/AppSidebar.vue).
- Common elements (common/) must be descriptive PascalCase without structural modifiers.

## 3. Operational Protocols
#### Phase 1: Component Location Audit & Placement Validation
When asked to evaluate, find, or generate components within folder:

1. Parse the target route structure or current location.
2. Run shell verification to look for conflicting component registrations:
```bash
find /app/components -type d -name "components"
```
3. Evaluate if a component needs structural promotion: If it is shared between a parent route and a sub-route, position it in the parent route's components/ block. If it hits a second distinct top-level route boundary, immediately refactor it to common/.

## 4. Enforcement Checklist (System Blockades)
Do NOT complete a file execution block if any of the following parameters fail:
- [ ] A component file sits loosely inside a route root without its matching ComponentName/ sub-folder (except the primary {RouteName}Page.vue file).
- [ ] Cross-component sharing is attempted via relative dot paths (e.g., ../analytics/). Force refactoring to common/ instead.
- [ ] An active route directory was set up without updating the dirs configuration in nuxt.config.ts.
- [ ] A template page uses auto-resolutions for a Page root component rather than establishing a direct import statement.

## 5. Summary Delivery Form
When communicating structural alterations back to the user, output:
1. Architectural location updates (From -> To paths).
2. The exact syntax modifications introduced into nuxt.config.ts or local pages/ declarations.
3. Any template tag rewrites applied globally across the codebase.