## Brand & Style
The brand personality is disciplined, analytical, forensic, and unsparingly objective. Designed specifically for professional NSE intraday cash-equity trading, this interface functions as a high-density, low-glare decision-support workspace rather than an automated execution bot or an gamified retail app. 

The aesthetic is Modern Financial Utilitarian: an evolution of high-clarity institutional terminals adapted for clean desktop web environments. It emphasizes explainability over black boxes, making counter-evidence, staleness warnings, and explicit rejection states ("NO TRADE") as visually prominent as breakout targets. The workspace prioritizes high legibility under continuous market surveillance, strict structural borders, and compact vertical cadence.

## Layout & Spacing
The layout follows a high-density, multi-pane dashboard architecture calibrated for intense trading session monitoring.

- **Grid & Sizing:** A responsive 12-column layout on desktop (>1280px), collapsing to an 8-column layout on tablet (768px–1279px), and a single-column layout on mobile (<768px). The default horizontal gutter is set to a compact `0.75rem` (`12px`) to maximize data real estate.
- **Rhythm & Padding:** Component internal padding uses strict 4px/6px increments. Data-dense rows employ `space-xs` (`4px`) vertical padding and `space-sm` (`6px`) horizontal padding to deliver high information density without visual crowding.
- **Panel Priority:** 
  - Left / Main Deck (Cols 1–8): Live Signal Queue, Invalidation Calculator, and Explainable Evidence Cards.
  - Right Deck (Cols 9–12): Market Context (Nifty/BankNifty regimes), Sector Performance, Ingestion Freshness monitors, and Trade Journal entries.

## Elevation & Depth
Elevation is achieved almost entirely through clean structural borders and tonal variation rather than deep shadows, ensuring zero distraction under ambient office or monitor lighting.

- **Base Layer (Level 0):** Viewport canvas styled with `#F6F8FB`.
- **Panel Layer (Level 1):** Primary operational modules (Cards, Signal Scanners, Journal Views) rendered on `#FFFFFF` with a crisp `1px` border of `#D9E1EC`.
- **Sub-Layer / Inset (Level -1):** Sub-tables, evidence groups, metric rows, and metadata containers styled using `#EDF2F7` with subtle dividers.
- **Overlays & Modals (Level 2):** Floating menus and journal popovers use a restrained, high-precision shadow: `box-shadow: 0 4px 12px -2px rgba(19, 34, 56, 0.08), 0 0 0 1px #CBD5E1`.
- **Stale State Degraded Elevation:** When a stream becomes stale (>5s) or disconnected, the card drops to `opacity: 0.85` and its border shifts to dashed `#CBD5E1` or amber/red semantic outlines.

## Components

### 1. Action Buttons
- **Primary:** Background `#1D4ED8`, text `#FFFFFF`, font-weight 500, height `32px`, padding `0 12px`, radius `4px`. Hover state `#1E40AF`.
- **Secondary / Journal Action:** Border `1px solid #CBD5E1`, background `#FFFFFF`, text `#132238`. Hover state `#F1F5F9`.
- **Destructive / Invalidation:** Border `1px solid #DC2626`, background `#FEF2F2`, text `#B91C1C`.

### 2. Status & Freshness Chips
- Compact dimensions: height `20px`, padding `0 6px`, font `JetBrains Mono`, `0.6875rem` (`11px`), weight 500, uppercase.
- **Live:** Background `#ECFDF5`, text `#047857`, border `1px solid #A7F3D0`. Includes a 6px pulsing green indicator dot.
- **Stale (>5s):** Background `#FFFBEB`, text `#B45309`, border `1px solid #FDE68A`.
- **Disconnected:** Background `#FEF2F2`, text `#B91C1C`, border `1px solid #FECACA`.
- **Delayed / Simulated:** Background `#F1F5F9`, text `#475569`, border `1px solid #CBD5E1`.

### 3. Risk Gate & Direction Badges
- **Long:** Background `#ECFDF5`, text `#065F46`, border `1px solid #6EE7B7`, prefix `▲ LONG`.
- **Short:** Background `#FFFBEB`, text `#92400E`, border `1px solid #FCD34D`, prefix `▼ SHORT`.
- **Risk Gates:**
  - `PASS`: Background `#ECFDF5`, text `#047857`.
  - `REJECT`: Background `#FEF2F2`, text `#B91C1C`, weight 600.
  - `NO TRADE`: Background `#132238`, text `#FFFFFF`, weight 700, radius `3px`, tracking `0.05em`.

### 4. Input Fields
- Height `32px`, font-size `0.8125rem`, border `1px solid #D9E1EC`, background `#FFFFFF`. Focus ring: `1px solid #1D4ED8` without soft glow. Numeric inputs always default to `JetBrains Mono`.

### 5. Cards & Explainable Modules
- White background `#FFFFFF`, border `1px solid #D9E1EC`, padding `12px` to `16px`.
- Card Header: Flex row layout containing Instrument Ticker, Direction badge, Active Lifespan countdown (e.g., `24:12 remaining`), and Data Freshness status.
- Card Body: Split-pane contrast layout separating **Positive Factors** (prefixed with green indicator bars) and **Contradictory / Negative Factors** (prefixed with amber or crimson indicator bars).
- Card Footer: Micro-metadata band containing Ingestion Timestamp, Exchange Source, and Rule Engine Snapshot ID (`rule_v1.2.4`) in `label-code` typography.