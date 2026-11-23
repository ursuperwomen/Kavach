---
name: Citizen Cyber Trust
colors:
  surface: '#f8f9ff'
  surface-dim: '#cbdbf5'
  surface-bright: '#f8f9ff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#eff4ff'
  surface-container: '#e5eeff'
  surface-container-high: '#dce9ff'
  surface-container-highest: '#d3e4fe'
  on-surface: '#0b1c30'
  on-surface-variant: '#45464d'
  inverse-surface: '#213145'
  inverse-on-surface: '#eaf1ff'
  outline: '#76777d'
  outline-variant: '#c6c6cd'
  surface-tint: '#565e74'
  primary: '#000000'
  on-primary: '#ffffff'
  primary-container: '#131b2e'
  on-primary-container: '#7c839b'
  inverse-primary: '#bec6e0'
  secondary: '#515f74'
  on-secondary: '#ffffff'
  secondary-container: '#d5e3fd'
  on-secondary-container: '#57657b'
  tertiary: '#000000'
  on-tertiary: '#ffffff'
  tertiary-container: '#00174b'
  on-tertiary-container: '#497cff'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#dae2fd'
  primary-fixed-dim: '#bec6e0'
  on-primary-fixed: '#131b2e'
  on-primary-fixed-variant: '#3f465c'
  secondary-fixed: '#d5e3fd'
  secondary-fixed-dim: '#b9c7e0'
  on-secondary-fixed: '#0d1c2f'
  on-secondary-fixed-variant: '#3a485c'
  tertiary-fixed: '#dbe1ff'
  tertiary-fixed-dim: '#b4c5ff'
  on-tertiary-fixed: '#00174b'
  on-tertiary-fixed-variant: '#003ea8'
  background: '#f8f9ff'
  on-background: '#0b1c30'
  surface-variant: '#d3e4fe'
typography:
  display-hero:
    fontFamily: Plus Jakarta Sans
    fontSize: 44px
    fontWeight: '800'
    lineHeight: 56px
    letterSpacing: -0.03em
  display-hero-mobile:
    fontFamily: Plus Jakarta Sans
    fontSize: 32px
    fontWeight: '800'
    lineHeight: 40px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 36px
    fontWeight: '700'
    lineHeight: 44px
    letterSpacing: -0.02em
  headline-lg-mobile:
    fontFamily: Plus Jakarta Sans
    fontSize: 26px
    fontWeight: '700'
    lineHeight: 34px
    letterSpacing: -0.01em
  headline-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 28px
    fontWeight: '700'
    lineHeight: 36px
    letterSpacing: -0.015em
  headline-sm:
    fontFamily: Plus Jakarta Sans
    fontSize: 22px
    fontWeight: '600'
    lineHeight: 30px
    letterSpacing: -0.01em
  body-xl:
    fontFamily: Inter
    fontSize: 20px
    fontWeight: '400'
    lineHeight: 32px
  body-lg:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: '400'
    lineHeight: 28px
  body-lg-medium:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: '500'
    lineHeight: 28px
  body-lg-semibold:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: '600'
    lineHeight: 28px
  label-lg:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '600'
    lineHeight: 24px
    letterSpacing: 0.01em
  label-caps:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '700'
    lineHeight: 20px
    letterSpacing: 0.06em
  code-investigative:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '500'
    lineHeight: 24px
    letterSpacing: 0.02em
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  gutter: 1.5rem
  gutter-mobile: 1rem
  margin: 3rem
  margin-mobile: 1.25rem
  space-xs: 0.375rem
  space-sm: 0.75rem
  space-md: 1.25rem
  space-lg: 2rem
  space-xl: 3rem
---

## Brand & Style

This design system establishes an unshakeable sense of security, official authority, and approachable clarity. Bridging two distinct audiences—older citizens reporting alarming cyber incidents and specialized cybercrime investigators processing triage cases—the visual identity avoids both cold bureaucratic intimidation and tech-bro novelty.

The aesthetic blends **Corporate/Modern Precision** with **Accessible Clarity**:
- **Generous Canvas & Spatial Breathing Room:** Reduces anxiety for distressed non-technical users while providing dense clarity for investigators scanning evidentiary timelines.
- **High-Contrast Decisiveness:** Stark, unambiguous visual hierarchies ensure critical alerts, case IDs, and actionable next steps cannot be misinterpreted under stress.
- **Tactile Steadiness:** Clean hairline dividers, solid pill indicators, and intentional, grounded geometry foster institutional confidence without feeling sterile.

## Colors

The palette relies on deliberate contrast against a pristine, clinical foundation.

- **Background & Canvas:** Crisp off-white (`#F8FAFC`) forms the base layer, mitigating ocular strain while offering higher contrast and warmth than harsh pure white. Surface cards sit atop this base in pure `#FFFFFF`.
- **Primary Anchor:** Trust Navy Blue (`#0F172A`) commands primary actions, major headings, and active global navigation elements. It projects gravity, institutional authority, and stability.
- **Secondary Slate:** Slate (`#334155` and `#475569`) provides high-legibility secondary text, metadata labels, and subtle boundary framing.
- **Traffic-Light Status Hierarchy:**
  - **Severe / Threat / Urgent:** Red (`#DC2626`) with light tint container (`#FEF2F2`) and border (`#FCA5A5`) for compromised accounts, urgent alerts, and critical evidence flags.
  - **Review / Pending / Caution:** Amber (`#D97706`) with light tint container (`#FFFBEB`) and border (`#FCD34D`) for verification pending, warnings, and under-review reports.
  - **Verified / Safe / Resolved:** Green (`#16A34A`) with light tint container (`#F0FDF4`) and border (`#86EFAC`) for secure connections, validated evidence, and closed resolutions.
- **Accent Interactive Blue:** Royal Blue (`#2563EB`) strictly for functional text links and secondary workflow focal points.

## Typography

Legibility is non-negotiable. The scale deliberately establishes an 18px baseline for standard body prose to eliminate squinting, cognitive overload, and accessibility failures for senior users, while maintaining sufficient typographic density for forensic reading.

- **Headlines (Plus Jakarta Sans):** Selected for its open apertures, rounded counters, and human-yet-authoritative geometric finish. It invites confidence and removes institutional harshness in headings without losing gravity.
- **Body & Labels (Inter):** Engineered for pixel-level clarity across screens. Tall x-height and distinct glyph design ensure characters like `1`, `l`, and `I` or `0` and `O` are instantly differentiable—critical for incident numbers, case files, and verification tokens.
- **Hierarchy Rules:**
  - Never allow primary operational instructions to drop below `18px` (`body-lg`).
  - Use `label-caps` strictly for category tags, incident reference prefixes, or pill badges; never for running body text.

## Layout & Spacing

The layout model uses a disciplined 12-column responsive fluid grid designed around ample touch targets and generous margins to prevent mis-clicks or information clutter.

- **Desktop (1024px+):** 12-column grid, max-width bounded at 1280px for standard reporting workflows and 1440px for multi-pane investigator dashboards. Outer margin set to `3rem` (`48px`) with `1.5rem` (`24px`) gutters.
- **Tablet (768px - 1023px):** 8-column grid with `2rem` (`32px`) margins and `1.25rem` (`20px`) gutters.
- **Mobile (<768px):** 4-column grid with `1.25rem` (`20px`) margins and `1rem` (`16px`) gutters. Stack forms and status summaries into single-column vertical sequences.

Vertical spacing prioritizes chunking: input groups and related evidence items use `space-md` (`20px`), while distinct incident phases, questionnaire sections, and dashboard panels decouple via `space-xl` (`48px`).

## Elevation & Depth

Visual hierarchy uses crisp boundaries paired with soft, structural elevation rather than fuzzy, heavy drop shadows:

- **Surface Tonal Strategy:** The background rests at `#F8FAFC`. Elevated surfaces (cards, side sheets, dialogs) sit on solid `#FFFFFF`.
- **Low-Contrast Structural Outlines:** Every card, field, and container utilizes a 1px crisp border in `#E2E8F0` (`slate-200`) to guarantee high-contrast definition independent of display calibration.
- **Ambient Micro-Shadows:**
  - **Resting Cards:** `0 1px 3px 0 rgba(15, 23, 42, 0.05), 0 1px 2px -1px rgba(15, 23, 42, 0.05)` gives cards tactile substance without visual murkiness.
  - **Active / Elevated Modals:** `0 10px 15px -3px rgba(15, 23, 42, 0.08), 0 4px 6px -4px rgba(15, 23, 42, 0.04)`.
- **Zero Glassmorphism:** No translucent overlays, frosted blurs, or ambiguous gradients. Every element presents opaque, solid contrast to assist users with lower visual acuity or heightened cognitive fatigue.

## Shapes

The geometric signature combines reliable rectangular containers with friendly, unambiguous rounded corners (`0.5rem` / `8px` default).

- **Cards, Panels, Inputs, and Standard Buttons:** `rounded-md` (`8px`) maintains order, institutional authority, and visual alignment.
- **Badges, Status Indicators, and Pill Chips:** Fully pill-shaped (`9999px`) to immediately set them apart from clickable rectangular inputs and buttons.
- **Nested Shapes:** Inner content blocks within a card use `0.375rem` (`6px`) to preserve harmonious visual concentricity.

## Components

### Buttons
- **Primary Button:** Background `#0F172A` (Trust Navy), text `#FFFFFF`, font weight 600, minimum height 56px for touch safety. Padding: 16px 28px. On hover: background shifts to `#1E293B`. Focus state: 3px solid outline in `#2563EB` with 2px offset.
- **Secondary Button:** Surface pure `#FFFFFF`, border 2px solid `#CBD5E1`, text `#0F172A`, font weight 600, minimum height 56px. Hover: background `#F1F5F9`.
- **Destructive Button:** Background `#DC2626`, text `#FFFFFF`. Hover: `#B91C1C`.

### Pill Badges & Status Chips
- Distinct oval pills (`border-radius: 9999px`) used for immediate status triage:
  - **Red Alert Pill:** Background `#FEF2F2`, border 1px solid `#F87171`, text `#991B1B`, weight 700. Prepended by a solid 8px `#DC2626` circular dot.
  - **Amber Alert Pill:** Background `#FFFBEB`, border 1px solid `#FBBF24`, text `#92400E`, weight 700. Prepended by a solid 8px `#D97706` circular dot.
  - **Green Safe Pill:** Background `#F0FDF4`, border 1px solid `#4ADE80`, text `#166534`, weight 700. Prepended by a solid 8px `#16A34A` circular dot.
- Text rendered in `label-caps` (14px uppercase, letter-spacing +0.06em) for instant triage scanning.

### Input Fields
- Minimum height 56px with 18px body font (`Inter`, 400).
- Pure `#FFFFFF` background with a 1.5px border in `#94A3B8`.
- Placeholder text in `#64748B`.
- Persistent labels positioned strictly above the input field (never floating or replacing labels), styled in `label-lg` with explicit helper text beneath the input in 16px `#475569`.
- Focus state: 2px border `#0F172A` with an outer ring of 3px `#93C5FD`.

### Checkboxes & Radio Buttons
- Enlarged hitboxes: minimum 24px x 24px checkbox/radio size surrounded by a minimum 48px touch target container.
- High contrast: 2px border in `#0F172A`. Checked state fills `#0F172A` with a crisp white checkmark/dot.
- Accompanied by full-width card-style label rows so users can tap anywhere on the label row to toggle.

### Evidence & Incident Cards
- Background `#FFFFFF`, 1px border `#E2E8F0`, rounded 8px.
- Padding: 24px (`space-lg`) on mobile, 32px (`space-xl`) on desktop.
- Header contains an incident reference ID in monospaced/code style (`#0F172A`, 16px, bold) alongside a high-visibility status pill badge on the top right.
- Separators within cards use 1px solid `#F1F5F9`.

### Timelines & Investigator File Logs
- Left-aligned continuous 2px vertical rail `#CBD5E1`.
- Timeline nodes rendered as 16px circular badges color-coded to status (Green, Amber, Red, Navy).
- Chronological time stamps rendered in high-contrast `16px` `#334155` weight 600.