---
name: i18n-messageformat2-syntax
description: Reference for writing MessageFormat 2 (MF2) translation strings. Use when authoring, reviewing, or migrating MF2 translation keys and message patterns (plurals, selectors, markup). Stack-agnostic syntax guide.
---

# MessageFormat 2 Syntax Reference

MessageFormat 2 (MF2) is a [Unicode standard](https://messageformat.unicode.org/) for localizable dynamic messages, superseding ICU MessageFormat 1 (MF1). Beetween uses [`i18next`](https://www.i18next.com/) with the [`i18next-mf2`](https://github.com/i18next/i18next-mf2) plugin to parse and format MF2 messages. This document covers MF2 syntax only — not framework-specific APIs.

## Pattern Strings

A message is a pattern string with placeholders. Variables use `{$varName}`:

```json
{ "greeting": "Bonjour {$name} !" }
```

Literal `{` and `}` are escaped as `\{` and `\}`:

```json
{ "escapeDemo": "This is \\{literal braces\\} in text." }
```

Use `|...|` quoted literals for characters that would otherwise be parsed as syntax:

```json
{ "quoted": "The value is {|{|}special{|}|}" }
```

Variables can access nested properties with dot notation: `{$user.name}`, `{$address.city}`.

## Selectors

Selectors dispatch between variants based on a variable. Declare the selector with `.match`, then list `key {{ pattern }}` pairs:

```json
{
  "items": ".match {$count :number}\n0   {{ Aucun élément }}\none {{ 1 élément }}\n*   {{ {$count} éléments }}"
}
```

`.input` can factor the annotation out of `.match`:

```json
{
  "items": ".input {$count :number}\n.match $count\n0   {{ Aucun }}\none {{ 1 }}\n*   {{ {$count} }}"
}
```

`.local` declares intermediate variables:

```json
{
  "welcome": ".local {$gender = {$subject :string}}\n.match $gender\nmale   {{ Bienvenue {$subject} }}\nfemale {{ Bienvenue {$subject} }}\n*     {{ Bienvenue * }}"
}
```

- The `*` wildcard **must always** be present as the last variant — it catches unmatched input.
- Selector functions: `:number` (plural category matching), `:string` (exact match), `:integer` (integer match).

## Function Options

Functions can receive options to control formatting. Syntax: `{$var :function option=value option2=value2}`.

```json
{ "price": "Prix : {$amount :number minimumFractionDigits=2}" }
{ "date": "Créé le {$date :date style=long}" }
{ "time": "À {$date :time style=short}" }
{ "datetime": "Le {$d :datetime dateStyle=full timeStyle=short}" }
{ "percent": "Taux : {$rate :number style=percent maximumFractionDigits=1}" }
{ "currency": "Total : {$total :number currency=EUR}" }
```

When the `:currency` option is set on `:number`, the `currency` value must be an ISO 4217 code (`EUR`, `USD`, `GBP`, `JPY`).

### Built-in formatter reference

| Function    | Purpose             | Key options                                                           |
| ----------- | ------------------- | --------------------------------------------------------------------- |
| `:number`   | Locale-aware number | `style`, `currency`, `minimumFractionDigits`, `maximumFractionDigits` |
| `:date`     | Locale-aware date   | `style` (`short`, `medium`, `long`, `full`)                           |
| `:time`     | Locale-aware time   | `style`                                                               |
| `:datetime` | Combined date+time  | `dateStyle`, `timeStyle`                                              |
| `:string`   | String matching     | none                                                                  |
| `:integer`  | Integer matching    | none                                                                  |

The `messageformat` v4 `DraftFunctions` set also includes `:currency` (shorthand wrapping `:number` with `style=currency`), `:unit` (wrapping `:number` with `style=unit`), and `:math` (basic arithmetic on placeholders).

## Markup

MF2 supports safe inline markup tags — the framework renders them, MF2 just marks structure:

```json
{ "bold": "Ceci est {#bold}important{/bold}." }
{ "link": "Cliquez {#link url=\"https://example.com\"}ici{/link}." }
{ "br": "Ligne 1{#br/}Ligne 2" }
```

- Opening tag: `{#tagName option=value}`
- Closing tag: `{/tagName}`
- Self-closing: `{#tagName/}`
- Attributes are passed through; semantics are framework-defined.

## Best-Practice Rules

**Always include the `*` wildcard.** Every `.match` block must end with `* {{ … }}` to handle unmatched keys. Without it, undefined input produces empty output.

**Use `:number` for plurals, not `:plural`.** Raw `:plural` was an MF2 draft concept that was removed before stabilization. Always apply `:number` to the count variable and match on the plural category (`zero`, `one`, `two`, `few`, `many`, `other`).

```json
// ✅ Correct
{ "results": ".input {$n :number}\n.match $n\none {{ 1 résultat }}\n*   {{ {$n} résultats }}" }

// ❌ Wrong — :plural does not exist
{ "results": ".match {$n :plural}\none {{ 1 }}\n*   {{ {$n} }}" }
```

**One key = one message.** Never concatenate translated strings in code. Each key is a complete MF2 message with its own variables.

```json
// ✅ Single message
{ "savedBy": "Sauvegardé par {$name}" }

// ❌ Concatenation — breaks RTL languages and translation context
// Don't do: t('saved') + ' ' + t('by') + ' ' + name
```

**Key naming convention** (referenced from [i18n-messageformat2-usage](../skills/i18n-messageformat2-usage/SKILL.md)): `<feature>.<entity>.<state>`.

**Date/number formatting is locale-aware.** Pass raw `Date` or `Number` values as arguments; apply MF2 functions (`:date`, `:number`) in the message string, never format in templates.

## Common Pitfalls

**Missing wildcard.** The most common bug — a `.match` without `*` that silently produces empty output for unrecognized keys. Always add `* {{ … }}`.

**MF1 syntax in MF2 messages.** ICU MessageFormat 1 uses `{count, plural, one {…} other {…}}`. This is NOT valid MF2. MF2 uses `.match $count :number` with `{{ … }}` (double braces) for variants. Migrate all MF1 strings.

```json
// ❌ MF1 — will fail or produce raw text
{ "old": "Vous avez {count, plural, one {# message} other {# messages}}" }

// ✅ MF2
{ "new": ".input {$count :number}\n.match $count\none {{ 1 message }}\n*   {{ {$count} messages }}" }
```

**JSON escaping of curly braces.** In JSON files, MF2's `{{` and `}}` (double braces for variant bodies) are just JSON string characters — no special escaping needed. Only escape MF2's `\{` and `\}` when you need literal single braces in output.

**Variable name mismatch.** The `$` prefix only exists in the MF2 string — when passing values in code, use the variable name without `$`. Example: `{ "greeting": "Bonjour {$name}" }` → `t('greeting', { name: 'Alice' })`, not `{ $name: 'Alice' }`.

## Quick Reference

| Syntax             | Example                      | Description                                |
| ------------------ | ---------------------------- | ------------------------------------------ |
| `{$var}`           | `Hello {$name}`              | Placeholder                                |
| `{$var :fn}`       | `{$n :number}`               | Placeholder with formatter                 |
| `{$var :fn opt=v}` | `{$d :date style=long}`      | Formatter with option                      |
| `{....}`           | `{...}`                      | Expression (placeholder, function, markup) |
| `{{ ... }}`        | `{{ Hello }}`                | Variant body (in .match)                   |
| `.match`           | `.match $count :number`      | Selector dispatch                          |
| `.local`           | `.local {$x = {$y :number}}` | Local variable                             |
| `{#tag}{/tag}`     | `{#bold}text{/bold}`         | Markup open/close                          |
| `{#tag/}`          | `{#br/}`                     | Self-closing markup                        |
| `\{ \}`            | `\{escaped\}`                | Literal braces                             |
| `*`                | `* {{ fallback }}`           | Wildcard variant                           |
| `one`, `other`, …  | `one {{ 1 }}`                | Plural category keys                       |
| `\n`               | (line break in JSON)         | Multi-line `.match`                        |

## References

- [Unicode MF2 specification](https://messageformat.unicode.org/)
- [i18next-mf2 npm package](https://www.npmjs.com/package/i18next-mf2) — MF2 plugin used by `@beetween/translation`
- [messageformat v4 npm package](https://www.npmjs.com/package/messageformat)
- [messageformat v4 GitHub repository](https://github.com/messageformat/messageformat)
- [MF2 functions documentation](https://messageformat.unicode.org/docs/guide/functions/)
