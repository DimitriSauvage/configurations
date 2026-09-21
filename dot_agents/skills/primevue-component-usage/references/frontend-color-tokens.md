# Beetween Color Token Reference

The `BeetweenPrimePreset` maps all UI colors through a three-tier token system.

---

## Primitive Palette (Tier 1)

| Palette        | Range  | Key stops                                                  |
| -------------- | ------ | ---------------------------------------------------------- |
| `blue`         | 50–950 | 50=`#fafdff`, 100=`#def0fc`, 500=`#108fea`, 900=`#06375a`  |
| `gray`         | 50–950 | 100=`#f6f7f8`, 300=`#d3d9de`, 600=`#728695`, 900=`#3a4752` |
| `green`        | 50–950 | 200=`#e7f8f7`, 900=`#4ecdc4`, 950=`#2fa29a`                |
| `red`          | 50–950 | 100=`#fff0f3`, 900=`#ff2d55`                               |
| `yellow`       | 50–950 | 400=`#fff9f0`, 900=`#ffc971`, 950=`#cc942b`                |
| `surfaceLight` | 0–950  | 0=`#ffffff`, 50=`#f6f7f8`, 600=`#728695`                   |

---

## Semantic Roles (Tier 2 — Light Mode)

| Token                  | Value                      | Use                        |
| ---------------------- | -------------------------- | -------------------------- |
| `primary.color`        | `{blue.900}` = `#06375a`   | Primary brand color        |
| `primary.inverseColor` | `{blue.50}` = `#fafdff`    | Text on primary background |
| `primary.hoverColor`   | `{blue.700}`               | Primary hover state        |
| `surface.0`            | `#ffffff`                  | White background           |
| `surface.50`           | `#f6f7f8`                  | Subtle background          |
| `surface.100`          | `#eff1f3`                  | Ground / page background   |
| `surface.300`          | `#d3d9de`                  | Default border             |
| `surface.600`          | `#728695`                  | Secondary text             |
| `surface.card`         | `{blue.50}` = `#fafdff`    | Card background            |
| `surface.border`       | `{gray.300}`               | Border color               |
| `surface.ground`       | `{surface.100}`            | Page ground                |
| `success.color`        | `{green.900}` = `#4ecdc4`  |                            |
| `warning.color`        | `{yellow.900}` = `#ffc971` |                            |
| `danger.color`         | `{red.900}` = `#ff2d55`    |                            |
| `info.color`           | `{blue.500}` = `#108fea`   |                            |
| `smart-gradient`       | `#108fea → #4ecdc4`        | AI / magic actions         |

---

## Form Field Tokens (Tier 2)

| Token                           | Value                    |
| ------------------------------- | ------------------------ |
| `form.field.background`         | `#ffffff`                |
| `form.field.border.color`       | `#e5e5e5` (neutral-200)  |
| `form.field.hover.border.color` | `#d4d4d4` (neutral-300)  |
| `form.field.focus.border.color` | `{primary.color}` = navy |

---

## Tailwind CSS Variable Aliases

In Tailwind utility classes inside the project, Beetween tokens are available as:

```
bg-bt-bg-card          → surface.card (#fafdff)
bg-bt-bg-page          → surface.ground
text-bt-text-primary   → surface.900 / primary.color
text-bt-text-secondary → surface.600 (#728695)
text-bt-text-muted     → surface.400 (#b8c1c9)
border-bt-border       → surface.border (#d3d9de)
bg-bt-primary-600      → blue.600
text-bt-primary-600    → blue.600
focus-visible:ring-bt-primary-600 → focus ring
```
