---
name: ITBIS Design System
colors:
  surface: '#faf8ff'
  surface-dim: '#d9d9e5'
  surface-bright: '#faf8ff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f3f3fe'
  surface-container: '#ededf9'
  surface-container-high: '#e7e7f3'
  surface-container-highest: '#e1e2ed'
  on-surface: '#191b23'
  on-surface-variant: '#434655'
  inverse-surface: '#2e3039'
  inverse-on-surface: '#f0f0fb'
  outline: '#737686'
  outline-variant: '#c3c6d7'
  surface-tint: '#0053db'
  primary: '#004ac6'
  on-primary: '#ffffff'
  primary-container: '#2563eb'
  on-primary-container: '#eeefff'
  inverse-primary: '#b4c5ff'
  secondary: '#585f6c'
  on-secondary: '#ffffff'
  secondary-container: '#dce2f3'
  on-secondary-container: '#5e6572'
  tertiary: '#943700'
  on-tertiary: '#ffffff'
  tertiary-container: '#bc4800'
  on-tertiary-container: '#ffede6'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#dbe1ff'
  primary-fixed-dim: '#b4c5ff'
  on-primary-fixed: '#00174b'
  on-primary-fixed-variant: '#003ea8'
  secondary-fixed: '#dce2f3'
  secondary-fixed-dim: '#c0c7d6'
  on-secondary-fixed: '#151c27'
  on-secondary-fixed-variant: '#404754'
  tertiary-fixed: '#ffdbcd'
  tertiary-fixed-dim: '#ffb596'
  on-tertiary-fixed: '#360f00'
  on-tertiary-fixed-variant: '#7d2d00'
  background: '#faf8ff'
  on-background: '#191b23'
  surface-variant: '#e1e2ed'
typography:
  page-title:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '700'
    lineHeight: 32px
    letterSpacing: -0.02em
  section-title:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: '600'
    lineHeight: 28px
    letterSpacing: -0.01em
  card-title:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '600'
    lineHeight: 24px
  body-base:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  body-sm:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '400'
    lineHeight: 16px
  label-caps:
    fontFamily: Inter
    fontSize: 11px
    fontWeight: '600'
    lineHeight: 16px
    letterSpacing: 0.05em
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  base: 4px
  xs: 4px
  sm: 8px
  md: 16px
  lg: 24px
  xl: 32px
  container-padding: 24px
  gutter: 16px
---

## Brand & Style
The design system for ITBIS is engineered for professional security operations, prioritizing clarity, precision, and rapid cognition. It adopts a **Corporate / Modern** aesthetic that leans into "Safe" visual identity—a standard-bearer for SaaS environments where high-density data and behavioral intelligence must be parsed without visual fatigue.

The brand personality is authoritative yet calm, utilizing a structured layout to instill a sense of control and reliability. By emphasizing systematic neutrality, the interface recedes to let critical security alerts and analytical patterns take center stage. The emotional response is one of calculated confidence, essential for analysts managing insider threat risks.

## Colors
The color palette is built on a foundation of "Security Blue" for primary actions, supported by a rigorous neutral scale for UI structure. 

### Semantic Strategy
Color is the primary vehicle for risk communication in this design system.
- **Background & Surface:** A crisp white surface sits atop a very light gray background to create subtle layered depth.
- **Risk Spectrum:** A five-tier semantic scale ranges from Green (Low) to Red (Critical). These colors must be used sparingly and only to denote severity or system status to maintain their psychological impact.
- **Typography:** Dark slate is used for maximum legibility of data, while muted slate provides hierarchy for metadata and secondary labels.

## Typography
This design system utilizes **Inter** across all roles to ensure a systematic, utilitarian feel. The type scale is optimized for information density, favoring a slightly smaller base size (14px) to accommodate complex data tables and multi-pane dashboards.

For mobile environments, titles scale down slightly (Page Title to 20px) to prevent excessive wrapping, while body text remains constant to preserve legibility. Tracking is tightened on headlines for a more "locked-in" professional look and widened on uppercase labels for readability at small scales.

## Layout & Spacing
The layout follows a **Fluid Grid** model with a 12-column structure for desktop dashboard views. It utilizes an 8px rhythmic scale (derived from a 4px base unit) to ensure consistent alignment of interactive elements.

- **Desktop:** 12 columns, 24px outer margins, 16px gutters.
- **Tablet:** 8 columns, 16px margins, 16px gutters.
- **Mobile:** 4 columns, 16px margins, 12px gutters.

The philosophy is "Content-First," where the sidebar navigation remains fixed (240px width) while the main analytical staging area expands to fill the viewport. Spacing is used to group related behavioral metrics into distinct "pods" or cards.

## Elevation & Depth
This design system employs **Low-Contrast Outlines** as the primary method of separation, reflecting an operational, "flat" aesthetic. 

- **Level 0 (Background):** #F9FAFB.
- **Level 1 (Cards/Content):** #FFFFFF with a 1px border (#E5E7EB). No shadow is used for static elements to keep the interface feeling fast and lightweight.
- **Level 2 (Overlays/Modals):** For dialogs and dropdowns, a subtle ambient shadow is introduced (0px 10px 15px -3px rgba(0,0,0,0.1)) to provide focus and context-shifting, while maintaining the same 1px border.

## Shapes
A **Rounded (2)** shape language is applied to soften the industrial nature of security data without compromising its professional rigor.

- **Base Components:** 8px (0.5rem) radius for buttons, inputs, and selection triggers.
- **Cards & Containers:** 12px (0.75rem) radius for primary content containers.
- **Status Badges:** Full pill-shape (9999px) to clearly differentiate categorical labels and risk statuses from interactive buttons.
- **Data Visualizations:** Bar charts and sparklines should use the 4px (Soft) radius for a modern, refined finish.

## Components
- **Buttons:** Primary buttons use Security Blue (#2563EB) with white text. Secondary buttons use a white fill with the #E5E7EB border. Ghost buttons are reserved for utility actions within data tables.
- **Inputs:** 1px border (#E5E7EB), 8px radius. Active states use a 2px Security Blue ring with an offset to indicate focus clearly.
- **Status Badges (Pills):** Backgrounds use a 10% opacity version of the semantic color (e.g., Critical Red), with the text using the 100% saturation value for high contrast and accessibility.
- **Data Tables:** Row height set to 48px for density. Row hover states use a subtle #F9FAFB highlight. Borders are only used horizontally between rows.
- **Risk Indicators:** Small 8px circles (Status Dots) are used in lists to provide immediate visual cues of threat levels without occupying significant real estate.
- **Cards:** White background, 12px radius, 1px light gray border. Titles should be Semibold (16px) with a clear bottom border separating the header from the content area.