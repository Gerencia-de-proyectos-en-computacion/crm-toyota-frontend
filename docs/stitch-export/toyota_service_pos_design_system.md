---
name: "Toyota Service POS Design System"
description: "High-efficiency enterprise B2B SaaS design system for an automotive service counter specialized in Toyota vehicles, optimized for 1366x768 desktop density."
---

## Overview

The **Toyota Service POS** design system is built for fast-paced automotive service receptionists and parts counter specialists. It balances **corporate precision** with **high-density operational clarity**—pairing crisp white and slate-50 work surfaces with high-contrast slate-900 typography and disciplined Toyota-inspired crimson red (`#DC2626`) accents reserved for primary actions, active states, and critical alerts.

Every token is tuned for 1366x768 desktop monitors where zero horizontal scroll, scannable tabular numbers, and immediate stock-level recognition are essential.

## Colors

The palette anchors on clean enterprise neutrals (`#F8FAFC` slate-50 canvas, `#FFFFFF` pure white cards, `#0F172A` slate-900 text) with `#DC2626` crimson red as the primary action accent. Semantic status colors (`success`, `warning`, `error`, `info`) are strictly reserved for stock semaphores, autosave indicators, and WhatsApp/approval actions.

```yaml
colors:
  success: "#15803D"
  on-success: "#FFFFFF"
  success-container: "#DCFCE7"
  on-success-container: "#14532D"
  warning: "#B45309"
  on-warning: "#FFFFFF"
  warning-container: "#FEF3C7"
  on-warning-container: "#78350F"
  info: "#0369A1"
  on-info: "#FFFFFF"
  info-container: "#E0F2FE"
  on-info-container: "#0C4A6E"
  whatsapp: "#16A34A"
  on-whatsapp: "#272727"
  light:
    primary: "#DC2626"
    on-primary: "#FFFFFF"
    primary-container: "#FEE2E2"
    on-primary-container: "#991B1B"
    secondary: "#334155"
    on-secondary: "#FFFFFF"
    secondary-container: "#E2E8F0"
    on-secondary-container: "#1E293B"
    tertiary: "#005E8D"
    on-tertiary: "#FFFFFF"
    tertiary-container: "#E0F2FE"
    on-tertiary-container: "#003450"
    error: "#B91C1C"
    on-error: "#FFFFFF"
    error-container: "#FEE2E2"
    on-error-container: "#7F1D1D"
    background: "#F8FAFC"
    on-background: "#0F172A"
    surface: "#F8FAFC"
    surface-dim: "#E2E8F0"
    surface-bright: "#FFFFFF"
    surface-container-lowest: "#FFFFFF"
    surface-container-low: "#F1F5F9"
    surface-container: "#E2E8F0"
    surface-container-high: "#CBD5E1"
    surface-container-highest: "#94A3B8"
    on-surface: "#0F172A"
    surface-variant: "#F1F5F9"
    on-surface-variant: "#475569"
    outline: "#64748B"
    outline-variant: "#E2E8F0"
    inverse-surface: "#0F172A"
    inverse-on-surface: "#F8FAFC"
    inverse-primary: "#FCA5A5"
  dark:
    primary: "#F87171"
    on-primary: "#450A0A"
    primary-container: "#991B1B"
    on-primary-container: "#FEE2E2"
    secondary: "#94A3B8"
    on-secondary: "#0F172A"
    secondary-container: "#334155"
    on-secondary-container: "#F1F5F9"
    tertiary: "#7DD3FC"
    on-tertiary: "#082F49"
    tertiary-container: "#0369A1"
    on-tertiary-container: "#E0F2FE"
    error: "#FCA5A5"
    on-error: "#450A0A"
    error-container: "#7F1D1D"
    on-error-container: "#FEE2E2"
    background: "#0F172A"
    on-background: "#F8FAFC"
    surface: "#0F172A"
    surface-dim: "#020617"
    surface-bright: "#1E293B"
    surface-container-lowest: "#020617"
    surface-container-low: "#1E293B"
    surface-container: "#334155"
    surface-container-high: "#475569"
    surface-container-highest: "#64748B"
    on-surface: "#F8FAFC"
    surface-variant: "#1E293B"
    on-surface-variant: "#CBD5E1"
    outline: "#94A3B8"
    outline-variant: "#334155"
    inverse-surface: "#F8FAFC"
    inverse-on-surface: "#0F172A"
    inverse-primary: "#DC2626"
```

## Typography

A technical pairing from Google Fonts: **Alatsi** brings crisp geometric authority to large totals and KPIs, **Instrument Sans** delivers high legibility across compact UI controls and dense catalog rows, and **Spline Sans Mono** ensures exact alignment for OEM part codes, license plates, SKUs, and Soles (`S/`) currency figures.

```yaml
typography:
  display-lg:
    fontFamily: "Alatsi"
    fontSize: 32px
    fontWeight: 400
    lineHeight: 36px
    letterSpacing: -0.5px
  headline-lg:
    fontFamily: "Instrument Sans"
    fontSize: 20px
    fontWeight: 700
    lineHeight: 26px
    letterSpacing: -0.25px
  headline-md:
    fontFamily: "Instrument Sans"
    fontSize: 16px
    fontWeight: 700
    lineHeight: 22px
    letterSpacing: -0.1px
  title-sm:
    fontFamily: "Instrument Sans"
    fontSize: 14px
    fontWeight: 600
    lineHeight: 20px
    letterSpacing: 0px
  body-md:
    fontFamily: "Instrument Sans"
    fontSize: 13px
    fontWeight: 400
    lineHeight: 18px
    letterSpacing: 0px
  body-sm:
    fontFamily: "Instrument Sans"
    fontSize: 12px
    fontWeight: 400
    lineHeight: 16px
    letterSpacing: 0px
  label-lg:
    fontFamily: "Instrument Sans"
    fontSize: 13px
    fontWeight: 600
    lineHeight: 16px
    letterSpacing: 0px
  label-md:
    fontFamily: "Instrument Sans"
    fontSize: 12px
    fontWeight: 600
    lineHeight: 16px
    letterSpacing: 0.1px
  label-sm:
    fontFamily: "Instrument Sans"
    fontSize: 11px
    fontWeight: 600
    lineHeight: 14px
    letterSpacing: 0.2px
  mono-md:
    fontFamily: "Spline Sans Mono"
    fontSize: 12px
    fontWeight: 500
    lineHeight: 16px
    letterSpacing: 0px
  mono-sm:
    fontFamily: "Spline Sans Mono"
    fontSize: 11px
    fontWeight: 500
    lineHeight: 14px
    letterSpacing: 0px
```

## Layout & Spacing

Designed around a fixed **1366x768 desktop viewport** with **zero horizontal scroll** and **compact vertical density**. The shell pairs a 64px collapsible left navigation rail, a 48px top status bar, and a 2-column workspace split (`62%` catalog & customer intake / `38%` live quote ticket). A 4px base unit keeps tables, inputs, and cards tight so all primary workflows fit above the fold.

```yaml
spacing:
  gutter-xs: 4px
  gutter-sm: 8px
  gutter-md: 12px
  gutter-lg: 16px
  gutter-xl: 24px
  section: 16px
  page-margin: 12px
```

## Elevation & Depth

**Low-contrast outlines** define structural hierarchy without visual clutter. Cards and panels sit on `surface-container-lowest` (`#FFFFFF`) over a `background` (`#F8FAFC`) canvas, separated by crisp `1px` borders using `outline-variant` (`#E2E8F0`). Shadows are omitted on standard cards to preserve maximum flatness and scannability; only floating popovers or sticky action bars use subtle hairline separation.

## Shapes

Sharp, technical corners communicate enterprise reliability. Cards and panels use `8px` (`DEFAULT`), while compact table buttons, badges, and inputs use `6px` (`sm`) or `4px` (`xs`). Status pills and filter chips use `full` (`9999px`) for instant visual distinction from clickable rectangular buttons.

```yaml
rounded:
  xs: 4px
  sm: 6px
  DEFAULT: 8px
  md: 10px
  lg: 12px
  full: 9999px
```

## Motion & Micro-interaction

Interactions are immediate and mechanical—hover states, tab switches, and quantity stepper feedback resolve in `100ms` so counter staff never wait on animations. No decorative loops or layout-shifting transitions are permitted.

```yaml
motion:
  state-change:
    duration: 100ms
    delay: 0ms
    timingFunction: ease-out
  surface-enter:
    duration: 150ms
    delay: 0ms
    timingFunction: cubic-bezier(0.2, 0, 0, 1)
```

## Voice & Content Strategy

- **Tone of voice:** Direct, operational, and Peruvian Spanish automotive service terminology (e.g., *Proforma*, *Repuestos Compatibles*, *Mano de Obra*, *inc. IGV*, *S/*).
- **Capitalisation:** Title Case for section headers, tabs, and primary action buttons; uppercase tracked micro-labels (`11px`) for role badges (`RECEPCIONISTA`) and brand tags (`TOYOTA OEM`, `DENSO`, `AISIN`).
- **Numbers & Currency:** Always prefix Peruvian Soles with `S/ ` and two decimals (`S/ 85.00`, `S/ 480.00`) using `tabular-nums`. License plates and OEM codes use monospace formatting (`ABC-123`, `04152-YZZA6`).

## Components

Component implementations live as individual HTML sticker sheet files in
`components/`. Each file contains the canonical, styled HTML components with
`<!-- COMPONENT: name -->` comment markers. Read each file before use.

- **Badge** → `@components/badge.html` — `badge-numeric`, `badge-dot`
- **Button** → `@components/button.html` — `button-primary`, `button-icon`, `button-with-icon`
- **Card** → `@components/card.html` — `card-elevated`, `card-action`, `card-interactive`, `card-interactive-2`
- **Input Field** → `@components/input-field.html` — `input-field-text`, `input-field-icon`
- **Table** → `@components/table.html` — `table-standard`, `table-interactive`, `table-selectable`
- **Tabs** → `@components/tabs.html` — `tabs-horizontal`, `tabs-with-icon`
