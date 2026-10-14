---
name: Intraday Equity Terminal
colors:
  surface: '#f8f9ff'
  surface-dim: '#cddbf2'
  surface-bright: '#f8f9ff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#eff4ff'
  surface-container: '#e5eeff'
  surface-container-high: '#dce9ff'
  surface-container-highest: '#d5e3fb'
  on-surface: '#0e1c2d'
  on-surface-variant: '#434655'
  inverse-surface: '#233143'
  inverse-on-surface: '#eaf1ff'
  outline: '#747686'
  outline-variant: '#c4c5d7'
  surface-tint: '#2151da'
  primary: '#0037b0'
  on-primary: '#ffffff'
  primary-container: '#1d4ed8'
  on-primary-container: '#cad3ff'
  inverse-primary: '#b7c4ff'
  secondary: '#006c4e'
  on-secondary: '#ffffff'
  secondary-container: '#97f5cc'
  on-secondary-container: '#007353'
  tertiary: '#733100'
  on-tertiary: '#ffffff'
  tertiary-container: '#984300'
  on-tertiary-container: '#ffcaae'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#dce1ff'
  primary-fixed-dim: '#b7c4ff'
  on-primary-fixed: '#001551'
  on-primary-fixed-variant: '#0039b5'
  secondary-fixed: '#97f5cc'
  secondary-fixed-dim: '#7bd8b1'
  on-secondary-fixed: '#002115'
  on-secondary-fixed-variant: '#00513a'
  tertiary-fixed: '#ffdbca'
  tertiary-fixed-dim: '#ffb68e'
  on-tertiary-fixed: '#331200'
  on-tertiary-fixed-variant: '#763300'
  background: '#f8f9ff'
  on-background: '#0e1c2d'
  surface-variant: '#d5e3fb'
typography:
  display-lg:
    fontFamily: Inter
    fontSize: 2rem
    fontWeight: '700'
    lineHeight: 2.5rem
  headline-lg:
    fontFamily: Inter
    fontSize: 1.5rem
    fontWeight: '600'
    lineHeight: 2rem
  headline-sm:
    fontFamily: Inter
    fontSize: 1.125rem
    fontWeight: '600'
    lineHeight: 1.5rem
  body-lg:
    fontFamily: Inter
    fontSize: 0.9375rem
    fontWeight: '500'
    lineHeight: 1.375rem
  body-md:
    fontFamily: Inter
    fontSize: 0.875rem
    fontWeight: '400'
    lineHeight: 1.25rem
  body-sm:
    fontFamily: Inter
    fontSize: 0.8125rem
    fontWeight: '400'
    lineHeight: 1.125rem
  label-numeric-lg:
    fontFamily: JetBrains Mono
    fontSize: 1.25rem
    fontWeight: '600'
    lineHeight: 1.5rem
    letterSpacing: -0.02em
  label-numeric-md:
    fontFamily: JetBrains Mono
    fontSize: 0.875rem
    fontWeight: '500'
    lineHeight: 1.25rem
    letterSpacing: -0.01em
  label-numeric-sm:
    fontFamily: JetBrains Mono
    fontSize: 0.75rem
    fontWeight: '500'
    lineHeight: 1rem
    letterSpacing: 0em
  label-caps:
    fontFamily: Inter
    fontSize: 0.6875rem
    fontWeight: '700'
    lineHeight: 0.875rem
    letterSpacing: 0.06em
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  gutter: 0.75rem
  margin: 1rem
  space-xs: 0.25rem
  space-sm: 0.5rem
  space-md: 0.75rem
  space-lg: 1rem
  space-xl: 1.5rem
---

## Brand & Style

The design system establishes a high-fidelity, cognitive-calm workspace tailored for Indian National Stock Exchange (NSE) intraday equity traders. Operating during peak market volatility (09:15 to 15:30 IST), the interface avoids sensory overload, flashing distractions, and aggressive gamification. Instead, it prioritizes rapid spatial scanning, clinical precision, and institutional confidence.

The design movement combines **Modern High-Density Utility** with **Tonal Restraint**:
- **Cognitive Clarity:** Dense financial data is balanced against soft, low-glare cool surfaces, preventing eye fatigue during six-hour market sessions.
- **Directional Semantics:** Signals rely on disciplined chromatic anchors: deep emerald for bullish momentum, warm amber for short setups (eschewing generic neon greens/reds for position bias), and targeted crimson strictly reserved for risk parameters, stop-loss violations, and hard drawdowns.
- **Institutional Reliability:** The atmosphere matches tier-1 trading desks—sharp, systematic, tabular, and immutably aligned.

## Colors

The palette employs a calibrated, daylight-friendly system engineered to ensure absolute legibility of figures, timestamps, and order books under dynamic desktop monitor configurations.

### Canvas & Surface Hierarchy
- **Base Canvas (`#F6F8FB`):** A soft, cool tint that eliminates the harsh glare of pure white screens while establishing crisp contrast against elevated widgets.
- **Surface Elevation (`#FFFFFF`):** High-opacity pure white dedicated to actionable cards, order execution tickets, market depth ladders, and data tables.
- **Subtle Boundaries (`#D9E1EC`):** Architectural 1px hairpins establishing strict perimeter separation without optical weight.

### Typography Hierarchy
- **Primary Text (`#132238`):** Deep rich navy-slate, offering WCAG AAA contrast ratio on white surfaces without the harsh contrast of pitch black.
- **Secondary / Supporting Text (`#5E6C80`):** Muted slate for metadata, sector tags, lot multipliers, order lifecycle stamps, and inactive field labels.
- **Disabled / Hairline Text (`#94A3B8`):** Restrained placeholder text and inactive stepper indicators.

### Functional & Trading Semantics
- **Brand Primary (`#1D4ED8`):** Vibrant royal blue reserved for focal points: execution triggers, selected tab indicators, active segment filters, and primary button actions.
- **Bullish / Long Direction:**
  - Foreground / Accent: `#047857` (Deep Emerald)
  - Surface Wash / Tint: `#D1FAE5` (Pale Green Mint)
  - Badge Indicator: `↑ Long`
- **Bearish / Short Direction:**
  - Foreground / Accent: `#B45309` (Warm Amber Ochre)
  - Surface Wash / Tint: `#FEF3C7` (Pale Amber)
  - Badge Indicator: `↓ Short`
- **Critical Risk & Hard Stop-Loss:**
  - Foreground / Alert: `#B91C1C` (Crimson Red)
  - Surface Wash / Danger: `#FEE2E2` (Soft Pale Red)
  - Usage: Strictly reserved for stop-loss triggers, trailing risk thresholds, circuit limit warnings, and rejected orders.

## Typography

The typography architecture uses a dual-engine hierarchy: **Inter** governs UI architecture, labels, navigation, and contextual tooltips, while **JetBrains Mono** governs all numerical data, currency figures, and time records.

### Numerical Engine Rules
- All rupee amounts (`₹`), order quantities, lot sizes, index percentages, strike prices, and live quotes must be typeset in `JetBrains Mono` with `font-feature-settings: "tnum" 1` (tabular figures). This guarantees zero optical jitter during tick updates.
- IST timestamps (e.g., `09:15:02.418 IST`) utilize `label-numeric-sm` to maintain vertical alignment in chronological trade logs.
- All column headers for numerical data align right (`text-align: right`), matching the alignment of their data cells.

## Layout & Spacing

The terminal uses a docked, persistent cockpit layout designed for rapid interaction across standard multi-monitor desktop setups and laptops.

### Architectural Shell
- **Fixed Sidebar:** Fixed width of `248px`, pinned to the left canvas, accommodating watchlists, algorithmic scanner navigation, order book states, and platform settings.
- **Top Utility Bar:** Fixed height of `48px`, spanning the remaining viewport width. It houses the market phase ticker (`NSE: LIVE`), dynamic ping indicator (e.g., `12ms Freshness`), localized IST timekeeper, and index snapshot ribbons (NIFTY 50, BANKNIFTY).
- **Core Workspace:** A multi-panel fluid grid with a baseline `0.75rem` (12px) gutter. Density is optimized to present maximum actionable rows above the fold without horizontal scrolling.

### Density and Responsive Handling
- **Desktop (1440px+):** Tri-panel view featuring Market Screener/Depth on the left, primary TradingView/Candle chart in center, and Execution Ticket/Position Matrix on the right.
- **Compact Desktop (1024px – 1439px):** Bi-panel layout with collapsing slide-over drawers for order placement tickets and execution confirmations.
- **Hit-Targets:** While typographic lines remain compact, every interactive trigger (order entry switches, quick-cancel buttons, price stepper triggers) provides a minimum touch/click target of `44px` or uses isolated padding envelopes to prevent mis-clicks.

## Elevation & Depth

Visual depth is achieved through structural borders and restrained ambient shadows, avoiding exaggerated floating elements that cause visual noise in data-heavy screens.

### Elevation Hierarchy
- **Level 0 (App Canvas):** Flat `#F6F8FB` background.
- **Level 1 (Docked Containers & Grid Cards):** Surface `#FFFFFF` encased in a uniform `1px solid #D9E1EC` border. Zero projection shadow at rest; visual grouping is maintained strictly via edge definition.
- **Level 2 (Hovered Rows & Active Cards):** Surface `#FFFFFF` with a crisp `1px solid #BAC7D5` border and subtle ambient shadow: `0 2px 4px -1px rgba(19, 34, 56, 0.04), 0 4px 6px -2px rgba(19, 34, 56, 0.02)`.
- **Level 3 (Dropdowns, Flyouts & Modals):** Pinned order tickets, depth popovers, and context menus use a crisp border `1px solid #CBD5E1` combined with an authoritative anchor shadow: `0 10px 15px -3px rgba(19, 34, 56, 0.08), 0 4px 6px -4px rgba(19, 34, 56, 0.04)`.

## Shapes

The system relies on structural, disciplined geometry with a standard base radius of `10px` (`rounded-lg`) on all primary interface cards and execution modules.

### Component Geometry
- **Primary Dashboard Cards:** Styled with `border-radius: 10px` to deliver modern visual ergonomics without wasting corner surface area.
- **Interactive Inputs & Segment Switches:** Styled with `border-radius: 6px` to maintain a sharp, mechanical feel inside execution tickets.
- **Status Pills & Direction Badges:** Fully rounded `border-radius: 9999px` to immediately contrast against square data grids.

## Components

### Buttons
- **Primary Action (Buy / Submit Order):** `#1D4ED8` background, `#FFFFFF` text, `font-weight: 600`. Hover: `#1E40AF`. Active: `#1D3A8A`.
- **Directional Buy Quick-Trigger:** Emerald `#047857` background, white text, subtle focus ring `rgba(4, 120, 87, 0.2)`.
- **Directional Short Quick-Trigger:** Amber `#B45309` background, white text, subtle focus ring `rgba(180, 83, 9, 0.2)`.
- **Destructive / Stop-Loss Emergency Exit:** Crisp outline button with `#B91C1C` border and text, shifting to full `#B91C1C` fill on hover with white text. Minimum hit-box target: `44px`.

### Directional Badges & Signal Pills
- **Long Bias Badge:** Background `#D1FAE5`, text `#047857`, uppercase label `↑ LONG`, `font-size: 0.6875rem`, `font-weight: 700`, padded `2px 8px`, rounded pill.
- **Short Bias Badge:** Background `#FEF3C7`, text `#B45309`, uppercase label `↓ SHORT`, `font-size: 0.6875rem`, `font-weight: 700`, padded `2px 8px`, rounded pill.
- **Risk / Stop-Loss Indicator:** Background `#FEE2E2`, text `#B91C1C`, padded `2px 8px`, monospaced numerical stop target.

### Tabular Data Grids
- **Header Cells:** `#5E6C80` text, uppercase `label-caps` typography, `height: 32px`, bordered on bottom with `1px solid #D9E1EC`.
- **Data Rows:** Alternating non-intrusive hover state `#F8FAFC`. Compact row height of `36px` to ensure data density.
- **Alignment Rules:** Left-align stock ticker/symbol; center status tags; right-align Last Traded Price (LTP), Change %, VWAP, and Intraday Volume.

### Input Fields & Price Steppers
- **Default State:** Background `#FFFFFF`, border `1px solid #D9E1EC`, text `#132238`, `font-family: JetBrains Mono`. Height: `36px`.
- **Focus State:** Border `#1D4ED8`, box-shadow `0 0 0 3px rgba(29, 78, 216, 0.15)`, smooth outline transition.
- **Increment Steppers:** Integrated `+` / `-` buttons embedded within the border container with minimum `44px` interactive touch targets.

### Status Bar & Market Freshness Pulse
- Slim `48px` surface with a bottom border `1px solid #D9E1EC`.
- Features an animated live pulse dot: `#047857` with an expanding radial ripple indicating continuous WebSocket connectivity to the NSE feed.
- Accompanied by latency metadata (`12ms`) and an IST clock styled in `label-numeric-sm` (`#132238`).