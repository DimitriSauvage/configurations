# PrimeVue Component Catalog — Beetween Usage Examples

Full usage examples for PrimeVue components within the Beetween design system (`BeetweenPrimePreset` + `BeetweenPassThrough`).

---

## Input Components

### Standard InputText

```vue
<label :for="`${id}-email`" class="text-sm font-medium text-bt-text-primary">
  Email <span aria-hidden="true" class="text-red-500">*</span>
</label>
<InputText
  :id="`${id}-email`"
  v-model="email"
  type="email"
  required
  :aria-describedby="emailError ? `${id}-email-error` : undefined"
  :invalid="!!emailError"
/>
<small
  v-if="emailError"
  :id="`${id}-email-error`"
  class="text-red-600 text-xs"
  role="alert"
>{{ emailError }}</small>
```

### FloatLabel

```vue
<FloatLabel>
  <InputText :id="`${id}-firstname`" v-model="val" class="w-full" />
  <label :for="`${id}-firstname`">Prénom</label>
</FloatLabel>
```

### InputGroup (prefix / suffix)

```vue
<InputGroup>
  <InputGroupAddon><i class="pi pi-search" /></InputGroupAddon>
  <InputText v-model="val" placeholder="Rechercher un candidat" />
</InputGroup>
```

### Password

```vue
<!-- Always :feedback="false" and toggleMask -->
<Password
  :id="`${id}-pwd`"
  v-model="password"
  :feedback="false"
  toggleMask
  placeholder="Mot de passe"
  class="w-full"
/>
```

### Textarea

```vue
<!-- Auto-expand: use autoResize -->
<Textarea
  v-model="val"
  rows="4"
  autoResize
  class="w-full"
  placeholder="Description…"
/>

<!-- Fixed height (e.g. compact panels): omit autoResize, set rows -->
<Textarea
  v-model="val"
  :rows="3"
  class="w-full overflow-y-auto"
  placeholder="Note…"
/>
```

---

## Form Controls

### Checkbox

```vue
<!-- Single checkbox (binary) -->
<div class="flex items-center gap-2">
  <Checkbox :inputId="`${id}-terms`" v-model="accepted" :binary="true" />
  <label :for="`${id}-terms`" class="cursor-pointer text-sm">J'accepte les conditions</label>
</div>

<!-- Checkbox group -->
<div v-for="opt in options" :key="opt.value" class="flex items-center gap-2">
  <Checkbox :inputId="`${id}-opt-${opt.value}`" v-model="selected" :value="opt.value" />
  <label :for="`${id}-opt-${opt.value}`" class="cursor-pointer text-sm">{{ opt.label }}</label>
</div>
```

### RadioButton

> **Critical:** Use `:inputId` (not `:id`) — `RadioButton` uses `inheritAttrs: false`. `:id` is silently dropped and the `<label :for>` link breaks.

```vue
<div v-for="opt in options" :key="opt.value" class="flex items-center gap-2">
  <RadioButton
    :inputId="`${id}-radio-${opt.value}`"
    v-model="selected"
    :value="opt.value"
    name="status"
  />
  <label :for="`${id}-radio-${opt.value}`" class="cursor-pointer text-sm">
    {{ opt.label }}
  </label>
</div>
```

### ToggleSwitch

```vue
<div class="flex items-center gap-3">
  <ToggleSwitch :inputId="`${id}-notif`" v-model="enabled" />
  <label :for="`${id}-notif`" class="text-sm cursor-pointer">Notifications par e-mail</label>
</div>
```

### SelectButton (segmented)

```vue
<SelectButton
  :id="`${id}-view`"
  v-model="view"
  :options="[
    { label: 'Liste', value: 'list', icon: 'pi pi-list' },
    { label: 'Grille', value: 'grid', icon: 'pi pi-th-large' },
  ]"
  optionLabel="label"
  optionValue="value"
/>
```

---

## Select / Dropdown Components

### Select (single)

```vue
<Select
  :id="`${id}-dept`"
  v-model="department"
  :options="departments"
  optionLabel="label"
  optionValue="value"
  placeholder="Choisir un département"
  filter
  class="w-full"
/>
```

### MultiSelect

```vue
<MultiSelect
  :id="`${id}-tags`"
  v-model="selectedTags"
  :options="tags"
  optionLabel="label"
  optionValue="value"
  display="chip"
  placeholder="Sélectionner…"
  class="w-full"
/>
```

### AutoComplete

```vue
<AutoComplete
  :id="`${id}-candidate`"
  v-model="query"
  :suggestions="suggestions"
  @complete="onSearch"
  placeholder="Rechercher un candidat"
  class="w-full"
/>
```

---

## DataTable

### Beetween Token Reference

| Area                | Token                                     | Value               |
| ------------------- | ----------------------------------------- | ------------------- |
| Container border    | `datatable.root.borderColor`              | `{surface.300}`     |
| Header toolbar      | `datatable.header.background`             | `{surface.0}` white |
| Column header bg    | `datatable.headerCell.background`         | `{surface.50}`      |
| Column header hover | `datatable.headerCell.hoverBackground`    | `{surface.100}`     |
| Selected header     | `datatable.headerCell.selectedBackground` | `{blue.100}`        |
| Row background      | `datatable.row.background`                | `{surface.0}`       |
| Row hover           | `datatable.row.hoverBackground`           | `{blue.50}`         |
| Row selected        | `datatable.row.selectedBackground`        | `{blue.100}`        |
| Cell border         | `datatable.bodyCell.borderColor`          | `{surface.100}`     |
| Striped row         | `datatable.row.stripedBackground`         | `{surface.50}`      |
| Sort icon           | `datatable.sortIcon.color`                | `{surface.400}`     |

### DataTable with Skeleton Loading

```vue
<DataTable
  :id="`${id}-table`"
  :value="loading ? skeletonRows : rows"
  :row-class="rowClass"
  stripedRows
  responsiveLayout="scroll"
>
  <Column field="name" header="Nom">
    <template #body="{ data }">
      <Skeleton v-if="!data" width="8rem" height="1rem" />
      <span v-else>{{ data.name }}</span>
    </template>
  </Column>
  <Column field="status" header="Statut">
    <template #body="{ data }">
      <Skeleton v-if="!data" width="5rem" height="1.5rem" />
      <Tag v-else :value="data.status" :severity="data.statusSeverity" />
    </template>
  </Column>
</DataTable>
```

> Define `skeletonRows` as a `computed` ref — never `Array(n).fill(null)` inline.

---

## Dialog / Overlay

### Dialog (modal)

```vue
<Button
  :id="`${id}-open-btn`"
  label="Ouvrir"
  icon="pi pi-external-link"
  @click="visible = true"
/>

<Dialog
  :id="`${id}-confirm-dialog`"
  v-model:visible="visible"
  header="Confirmation"
  :modal="true"
  :draggable="true"
  style="width: 400px"
>
  <p class="text-sm text-bt-text-secondary">Êtes-vous sûr de vouloir archiver ce recrutement ?</p>
  <template #footer>
    <Button label="Annuler" severity="secondary" outlined @click="visible = false" />
    <Button label="Confirmer" severity="danger" icon="pi pi-check" @click="confirm" />
  </template>
</Dialog>
```

### Popover (context panel)

```vue
<Button
  :id="`${id}-actions-btn`"
  label="Actions"
  icon="pi pi-ellipsis-v"
  severity="secondary"
  outlined
  @click="popover.toggle($event)"
/>
<Popover ref="popover">
  <div class="flex flex-col gap-1 min-w-[160px]">
    <Button label="Modifier" icon="pi pi-pencil" text severity="secondary" class="justify-start" />
    <Button label="Dupliquer" icon="pi pi-copy" text severity="secondary" class="justify-start" />
    <Divider class="my-1" />
    <Button label="Supprimer" icon="pi pi-trash" text severity="danger" class="justify-start" />
  </div>
</Popover>
```

---

## Display Components

### Card

```vue
<Card>
  <template #title>Titre de la carte</template>
  <template #subtitle>Sous-titre optionnel</template>
  <template #content>
    <p class="text-sm text-bt-text-secondary">Contenu principal.</p>
  </template>
  <template #footer>
    <Button label="Action" size="small" />
  </template>
</Card>
```

### Avatar

```vue
<!-- Image with fallback to initials -->
<Avatar
  :image="profile.pictureURL ?? undefined"
  :label="
    profile.initials ?? profile.firstName?.charAt(0)?.toUpperCase() ?? '?'
  "
  shape="circle"
  class="size-8 text-xs"
/>
```

### Skeleton (loading state)

```vue
<!-- Text line skeleton -->
<Skeleton width="10rem" height="1rem" class="mb-2" />

<!-- Avatar skeleton -->
<Skeleton shape="circle" size="2rem" />

<!-- Table row skeleton — define in computed, never inline Array.fill() -->
const skeletonRows = computed(() => Array.from({ length: pageSize.value }, () => null))
```

---

## Tag — Severity → Color Mapping

```vue
<Tag value="Ouvert" severity="success" />
<!-- green  #e7f8f7 / #2fa29a -->
<Tag value="En cours" severity="info" />
<!-- blue   #def0fc / #108fea -->
<Tag value="En attente" severity="warn" />
<!-- amber  #fff9f0 / #cc942b -->
<Tag value="Refusé" severity="danger" />
<!-- red    #fff0f3 / #ff2d55 -->
<Tag value="Neutre" severity="secondary" />
<!-- gray   #eff1f3 / #728695 -->
<Tag value="Contraste" severity="contrast" />
<!-- dark   #2a343e / #ffffff -->

<!-- Rounded pill -->
<Tag value="Ouvert" severity="success" rounded />

<!-- With icon -->
<Tag value="RecVal" severity="warn" icon="pi pi-user" />
```

---

## Accessibility Reminders

- **Icon-only buttons** must always have `aria-label` + matching `v-tooltip.bottom`.
- **RadioButton** must use `:inputId` (not `:id`) — `inheritAttrs: false` silently drops `:id`.
- **ToggleSwitch / Checkbox** must use `inputId` + `<label :for>`.
- **Form inputs** must use `<label :for>` + `InputText :id` — never placeholder as only label.
- **Invalid fields** must set `:invalid="true"` (triggers red border from preset) and link error via `:aria-describedby`.
- **Dialog** manages its own focus trap — do not add `tabindex` inside dialogs.
