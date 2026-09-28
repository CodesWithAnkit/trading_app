# Intraday Stock Tracker — Design System

**Version:** 1.0  
**Principle:** Calm, information-dense, and deliberately non-sensational. Price movement and risk must be readable at a glance without making the interface feel like a trading terminal.

## 1. Design principles

1. **Clarity before urgency.** Use alerts to communicate state, not to pressure a trade.
2. **Risk travels with reward.** Every target view must visually include the stop/invalidation level.
3. **One clear action at a time.** Trade-journal actions are explicit and reversible only through a recorded correction.
4. **Live data is honest.** Clearly mark stale, delayed, simulated, and disconnected data.
5. **Accessible by default.** Never use red/green alone to communicate a direction or result.

## 2. Visual foundations

### 2.1 Color tokens

| Token | Value | Use |
| --- | --- | --- |
| `--color-canvas` | `#F6F8FB` | App background |
| `--color-surface` | `#FFFFFF` | Cards, panels, dialogs |
| `--color-surface-muted` | `#EEF2F7` | Table headers, inactive areas |
| `--color-border` | `#D9E1EC` | Borders and dividers |
| `--color-text` | `#132238` | Primary text |
| `--color-text-muted` | `#5E6C80` | Secondary text |
| `--color-primary` | `#1D4ED8` | Links, primary actions, focus |
| `--color-primary-hover` | `#1E40AF` | Primary-action hover |
| `--color-long` | `#047857` | Long direction / favorable movement |
| `--color-long-soft` | `#D1FAE5` | Long background |
| `--color-short` | `#B45309` | Short direction / downward setup |
| `--color-short-soft` | `#FEF3C7` | Short background |
| `--color-risk` | `#B91C1C` | Stop, loss, destructive warning |
| `--color-risk-soft` | `#FEE2E2` | Risk background |
| `--color-warning` | `#A16207` | Stale/pending caution |
| `--color-warning-soft` | `#FEF9C3` | Warning background |
| `--color-info` | `#0F5F9D` | Informational status |
| `--color-info-soft` | `#E0F2FE` | Informational background |

Direction is always paired with a label and icon: `↑ Long`, `↓ Short`; gains/losses are paired with signed values and text.

### 2.2 Typography

Use **Inter** for interface text and **JetBrains Mono** for prices, quantities, time, percentage changes, and P&L.

| Token | Size / line height | Weight | Use |
| --- | --- | --- | --- |
| `--text-display` | 28px / 36px | 700 | Page titles |
| `--text-heading` | 20px / 28px | 650 | Card / section title |
| `--text-subheading` | 16px / 24px | 650 | Subsection title |
| `--text-body` | 14px / 20px | 400 | Normal UI text |
| `--text-label` | 12px / 16px | 600 | Labels, badges, table heading |
| `--text-number` | 14px / 20px | 550 | Numeric default |
| `--text-number-lg` | 22px / 28px | 650 | Price and P&L summary |

Use tabular numerals (`font-variant-numeric: tabular-nums`) for all changing values to avoid layout shift.

### 2.3 Spacing, layout, and depth

Base unit: **4px**.

| Token | Value |
| --- | --- |
| `--space-1` | 4px |
| `--space-2` | 8px |
| `--space-3` | 12px |
| `--space-4` | 16px |
| `--space-5` | 20px |
| `--space-6` | 24px |
| `--space-8` | 32px |
| `--radius-sm` | 6px |
| `--radius-md` | 10px |
| `--radius-lg` | 14px |
| `--shadow-card` | `0 1px 2px rgb(16 24 40 / 6%), 0 1px 3px rgb(16 24 40 / 8%)` |

Desktop uses a 12-column grid with a 24px gutter and 32px outer margin. Content width is capped at 1440px. Cards use a 1px border, `--radius-md`, and `--shadow-card` only when separating a floating surface.

## 3. Application shell

### Desktop

- Left navigation: 248px wide; collapsible to 72px.
- Top status bar: market state, feed freshness, notifications, profile.
- Main canvas: page title/actions followed by responsive card grid.

### Tablet and mobile

- At 1024px: left navigation collapses to icon rail; dense tables scroll horizontally.
- At 768px: use top navigation and a bottom sheet for filters.
- At 480px: single-column cards; make journal actions full-width; preserve number alignment.

## 4. Components

### 4.1 Button

| Variant | Purpose |
| --- | --- |
| Primary | Main page action, e.g. `Log trade` |
| Secondary | Neutral supporting action |
| Ghost | Low-emphasis inline action |
| Danger | Confirm a destructive or risk-related action |
| Journal enter | `I entered` — dark blue, never green as a buy signal |
| Journal exit | `I exited` — neutral outlined action |

Buttons have a minimum 40px height, 12px horizontal padding, visible keyboard focus, and disabled/loading states. Confirm trade-changing actions in a compact modal showing symbol, side, quantity, price, and timestamp.

### 4.2 Status badge

Badges are compact, rounded rectangles with text and an optional 8px dot.

| Status | Label | Treatment |
| --- | --- | --- |
| Connected | `Live` | info/green text, dot |
| Delayed | `Delayed` | warning |
| Disconnected | `Disconnected` | risk |
| Simulated | `Simulated` | neutral/info |
| Active signal | `Active · 12m` | primary |
| Expiring | `Expires in 2m` | warning |
| Expired | `Expired` | muted |
| Open trade | `Open` | primary |
| Closed trade | `Closed` | muted |

### 4.3 Signal card

Use for active opportunities. A card contains:

```text
[↑ Long]  RELIANCE                     Active · 18m
₹1,452.80      +0.62%                  High confidence

Entry   ₹1,450–₹1,454     Stop    ₹1,438
T1      ₹1,468            T2      ₹1,482

Strong relative volume · Breakout above 5-minute range

[ View plan ]  [ I entered ]
```

- Direction badge appears before the symbol.
- Keep stop in a dedicated risk column; do not visually hide it below targets.
- `I entered` opens a confirmation flow and never implies broker execution.
- Countdown changes from primary to warning at five minutes remaining.

### 4.4 Metric card

For compact dashboard summaries: `Open P&L`, `Today's net P&L`, `Active signals`, `Win rate`.

It includes a label, large tabular number, a comparison or period label, and an optional trend indicator. Use a neutral border, not a colored card, for financial values; apply color only to the value and its accessible label.

### 4.5 Data table

- Header remains visible while scrolling on desktop.
- Numeric columns are right aligned; text columns left aligned.
- 44px minimum row height.
- Include a clear empty state, loading skeleton, and stale-data state.
- Do not rely on hover for essential information; use an explicit details action.

### 4.6 Form fields

- Label above the control; helper/error text below it.
- Price inputs use rupee prefix and tabular numbers.
- Quantity accepts whole numbers by default; validate market constraints at submission.
- Required fields: symbol, side, time, price, quantity.
- Warn, rather than silently override, when entry/exit prices fall outside a linked signal’s plan.

### 4.7 Chart

- Use a light background with subtle grid lines (`#E8EDF4`).
- Price series: `#1D4ED8`; volume: `#93C5FD`.
- Long entry and targets: `--color-long`; stop: `--color-risk`; short plan markers: `--color-short`.
- Mark signal creation and expiry with labelled vertical lines.
- Tooltips must show timestamp, OHLC, volume, and any signal level.

## 5. Page patterns

### Dashboard

1. Market-status banner (only when delayed/disconnected/simulated).
2. Four metric cards.
3. Active Signals section: separate Long and Short tabs, defaulted to a ranked list.
4. Open Trades section.
5. Recent Journal / Alerts history.

### Signal detail

- Header: symbol, side, setup, live price, status and expiry.
- Main: chart and a fixed trade-plan panel.
- Secondary: reasoning metrics, similar-setup history, audit timeline.
- Actions: `I entered`, `Skip`, and `Watch`; all clearly state that no broker order will be placed.

### Trade journal

- Default view: all trades with date, symbol, side, quantity, entry, exit, net P&L, and status.
- Detail drawer: planned levels versus actual fills, partial exit timeline, charges, notes, and corrections.

## 6. Interaction and accessibility rules

- WCAG AA contrast minimum for text and controls.
- Keyboard focus uses a 2px `--color-primary` ring with 2px offset.
- Support full keyboard navigation, including table row actions and modal focus trapping.
- Announce market connection changes and confirmation results through an ARIA live region.
- Avoid auto-refreshing a focused form field; show `Data updated` unobtrusively.
- Use Indian numbering and currency format: `₹1,45,280.50`.
- Always include timezone (`IST`) for time-sensitive values when context may be unclear.

## 7. Implementation tokens

```css
:root {
  --color-canvas: #F6F8FB;
  --color-surface: #FFFFFF;
  --color-surface-muted: #EEF2F7;
  --color-border: #D9E1EC;
  --color-text: #132238;
  --color-text-muted: #5E6C80;
  --color-primary: #1D4ED8;
  --color-primary-hover: #1E40AF;
  --color-long: #047857;
  --color-long-soft: #D1FAE5;
  --color-short: #B45309;
  --color-short-soft: #FEF3C7;
  --color-risk: #B91C1C;
  --color-risk-soft: #FEE2E2;
  --color-warning: #A16207;
  --color-warning-soft: #FEF9C3;
  --color-info: #0F5F9D;
  --color-info-soft: #E0F2FE;
  --radius-sm: 6px;
  --radius-md: 10px;
  --radius-lg: 14px;
  --space-1: 4px;
  --space-2: 8px;
  --space-3: 12px;
  --space-4: 16px;
  --space-5: 20px;
  --space-6: 24px;
  --space-8: 32px;
}
```

## 8. Initial component inventory

- AppShell, Sidebar, Topbar, PageHeader
- Button, IconButton, Badge, Tooltip, Tabs
- Card, MetricCard, EmptyState, Skeleton
- SignalCard, SignalPlan, ConfidenceMeter, ExpiryTimer
- MarketStatus, DataFreshnessIndicator
- TradeTable, JournalDrawer, TradeLegTimeline
- PriceInput, QuantityInput, Select, DateRangePicker
- ConfirmationModal, Toast, ErrorBanner
- CandlestickChart, VolumeChart, Legend, ChartTooltip

## 9. Content style

- Plain language: `Signal expired` rather than `Signal invalidated due to TTL`.
- State facts precisely: `Data delayed by 42 seconds` rather than `Live`.
- Never phrase a signal as certainty: use `Potential long setup`, `Estimated target likelihood`, and `Plan invalid if price reaches ₹…`.
- Financial actions are explicit: `Record entry` and `Record exit` in confirmation dialogs; reserve `I entered` / `I exited` for the fast dashboard action labels.
