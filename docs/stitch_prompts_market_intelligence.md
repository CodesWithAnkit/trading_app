# Stitch UI Generation Prompts — Market Intelligence & Explainable Analysis

This document provides production-ready, Stitch-optimized prompts for generating the UI components and pages required by **Intraday Stock Tracker Requirements v1.1**.

All prompts strictly follow the design tokens from `design/stitch_intraday_stock_tracker_dashboard (4)/DESIGN.md` and the visual fidelity standards from `docs/STITCH_UI_IMPLEMENTATION_PLAN.md`.

---

## 1. Explainable Analysis Card & Drawer

A comprehensive, transparent decision-support card and sliding inspection drawer that presents a complete evidence breakdown for an intraday stock setup, contrasting positive factors against contradictory signals, evaluating deterministic risk gates, and displaying the trade plan.

**DESIGN SYSTEM (REQUIRED):**
- Platform: Web, Desktop-first (responsive down to tablet 768px)
- Theme: Light, calm, information-dense, precision financial engineering
- Background: Surface `#f8f9ff`
- Surface Containers:
  - Base Card Surface: Surface Container Lowest `#ffffff`
  - Subtle Sections & Insets: Surface Container Low `#eff4ff` and Surface Container `#e5eeff`
  - High Elevation Panels: Surface Container High `#dce9ff`
- Text & Typography:
  - Font Primary: `Inter` for all UI text, headings, and labels
  - Font Numeric: `JetBrains Mono` for prices, targets, percentages, and timestamps with `tabular-nums`
  - Text Primary: On Surface `#0e1c2d`
  - Text Secondary: On Surface Variant `#434655`
- Accent & Semantic Colors:
  - Primary Brand: Deep Blue `#0037b0` (Container `#1d4ed8`, On Container `#cad3ff`)
  - Long / Bullish Direction: Secondary Deep Emerald `#006c4e` (Container `#97f5cc`, On Container `#007353`)
  - Short / Bearish Direction: Tertiary Amber Rust `#733100` (Container `#984300`, On Container `#ffcaae`)
  - Destructive / Risk Stop: Error Crimson `#ba1a1a` (Container `#ffdad6`, On Container `#93000a`)
  - Outline & Dividers: Outline Variant `#c4c5d7` with 30% opacity
- Component Styling:
  - Border Radius: Cards 12px, badges 6px, buttons 8px
  - Elevation: Soft subtle drop shadows (`0 1px 3px rgba(14,28,45,0.06)`)
  - No sensational neon glows or blinking alerts

**Page & Component Structure:**
1. **Header Block:**
   - Back button to dashboard (`ArrowLeft` icon)
   - Stock Symbol (`display-lg`, 32px bold Inter) paired with live price in JetBrains Mono (`₹2,485.50`)
   - Day Change Pill (`+1.85%` in emerald badge or `-1.20%` in amber badge)
   - Strategy Setup Badge: "VWAP Pullback Breakout" in primary container
   - Direction Tag: "↑ LONG" or "↓ SHORT"
   - Timestamp and Data Freshness Badge: "Live Tick: 2s ago" with green pulse dot

2. **Market Context & Regime Strip (Top Banner):**
   - Compact horizontal breadcrumb showing:
     - Market Regime: "Trending Bullish (Nifty Breadth: 72% Above VWAP)"
     - Sector Alignment: "Energy Sector (+1.42% vs Benchmark)"
     - Event Risk Status: "No Earnings Today (Clean Session)"

3. **Two-Column Evidence Layout:**
   - **Column A: Positive Evidence (The Bull Case):**
     - Container in `#f0fdf4` with subtle emerald left-border (3px)
     - Header: "Supporting Factors (+4)"
     - Item 1: "Price above rising 20-EMA and VWAP anchor (₹2,472.00)"
     - Item 2: "Relative Volume surge: 2.8x 20-period average"
     - Item 3: "Official Announcement: Q3 Board meeting confirmed positive dividend"
     - Item 4: "Institutional Flow Context: DII Net Inflow in Oil & Gas (+₹380 Cr today)"
   - **Column B: Contradictory & Risk Evidence (The Bear Case / Skepticism):**
     - Container in `#fffbeb` with subtle amber left-border (3px)
     - Header: "Contradictory Factors & Headwinds (2)"
     - Item 1: "Heavy resistance cluster near R1 pivot at ₹2,510.00"
     - Item 2: "FII overall cash market net sellers (-₹420 Cr today)"
     - Warning: "Never hide conflicting data. The user must weigh both sides before manual execution."

4. **Deterministic Risk Gates Card:**
   - Header: "Pre-Trade Safety Gates (Deterministic Rules)"
   - 4-item checklist with pass/fail iconography (`CheckCircle2` in green or `XCircle` in red):
     - Gate 1: "Invalidation level mathematically defined prior to entry (Pass: ₹2,468.00)"
     - Gate 2: "Minimum Net Reward-to-Risk ratio >= 1.8x after estimated charges (Pass: 2.15x)"
     - Gate 3: "Extended move limit: Stock not overextended beyond 1.5 ATR (Pass)"
     - Gate 4: "Feed Health check: Zero packet loss, feed latency < 1.2s (Pass)"
   - Overall Verdict: "Setup Qualified for Observation" or "Rejected: Risk Gate 2 Failed"

5. **Trade Plan Blueprint Panel (Right Sticky Column):**
   - Entry Zone Box: `₹2,482.00 - ₹2,486.00` (Reference: `₹2,484.00`)
   - Stop-Loss Box: `₹2,468.00` (-0.68% risk per share, ₹16.00 risk)
   - Target 1: `₹2,508.00` (+0.97% move, 1.5R)
   - Target 2: `₹2,525.00` (+1.65% move, 2.5R)
   - Trailing Guidance: "Trail stop to breakeven once Target 1 closes on 5m candle"
   - Estimated Costs & Charges: "₹18.50 per trade (Brokerage + STT + Exchange turnover)"
   - Primary Action: "Save to Trade Journal" button (Deep Blue `#0037b0` with Save icon)
   - Secondary Action: "Dismiss / Mark Expired" button (Outline)

6. **Historical Comparable Setup Context & Rule Version:**
   - Metric Grid:
     - "Similar historical setups in same regime: 48 cases"
     - "Target 1 hit rate: 64.5% (Out-of-sample validated)"
     - "Average holding time: 18 minutes"
     - "Rule Version: v1.1-20261014"
   - Disclaimer: "Historical statistics are past observations, not future profit guarantees. Manual execution only."

---

## 2. Market & Sector Context Dashboard Widget

An information-dense overview widget for the top of the Markets page or Main Dashboard that communicates broad NSE equity market breadth, sector participation, and macro regime status without overwhelming the trader.

**DESIGN SYSTEM (REQUIRED):**
- Platform: Web, Desktop & Tablet
- Theme: Calm, clean financial interface
- Background: Surface `#f8f9ff`
- Container Surface: Surface Container Lowest `#ffffff` with border in `#c4c5d7` (30% opacity)
- Typography: Inter headings, JetBrains Mono numbers (`tabular-nums`)
- Colors:
  - Advancing / Favorable: `#006c4e` (Surface soft `#d1fae5`)
  - Declining / Unfavorable: `#ba1a1a` (Surface soft `#ffdad6`)
  - Neutral / Unchanged: `#434655` (Surface soft `#eff4ff`)

**Component Structure:**
1. **Regime Banner:**
   - Title: "NSE Cash Market Regime"
   - Regime State Tag: "TRENDING BULLISH" (Emerald badge with upward trendline icon)
   - Summary sentence: "Broad market participation is strong with 68% of the F&O universe trading above VWAP. Trend setups prioritized."
   - Session Time Clock: "11:42:15 IST · Market Open"

2. **Market Breadth Gauge Bar:**
   - Visual segmented ratio bar:
     - Green segment (Advancing): 152 stocks (66%)
     - Red segment (Declining): 68 stocks (30%)
     - Gray segment (Unchanged): 10 stocks (4%)
   - Key Metrics in JetBrains Mono:
     - New 52-Week Highs: `14` | New 52-Week Lows: `2`
     - Advance/Decline Ratio: `2.24`
     - Universe Median Day Change: `+0.85%`

3. **Sector Heat & Relative Strength Grid:**
   - 6-sector compact cards showing relative percentage performance vs Nifty Benchmark:
     - NIFTY AUTO: `+1.82%` (Strong Outperformer, Green bar)
     - NIFTY ENERGY: `+1.45%` (Outperformer, Green bar)
     - NIFTY BANK: `+0.62%` (Neutral, Light Green)
     - NIFTY PHARMA: `-0.15%` (Lagging, Light Red)
     - NIFTY METAL: `-0.74%` (Underperformer, Red bar)
     - NIFTY IT: `-1.20%` (Heavy Drag, Deep Red bar)
   - Clickable sector filter to isolate setups belonging to that sector.

---

## 3. News & Corporate Announcements Timeline

A real-time news and official filings feed component displaying timestamped announcements from verified primary exchange sources (NSE/BSE, RBI, corporate filings) with clear separation between official facts and AI-inferred interpretations.

**DESIGN SYSTEM (REQUIRED):**
- Platform: Web, Desktop & Mobile
- Theme: Light, editorial precision
- Background: Surface Container Lowest `#ffffff`
- Borders: Outline Variant `#c4c5d7` (30% opacity)
- Badges:
  - Primary Official Filing: Solid Deep Blue `#0037b0` pill with Document icon
  - Market News / Media: Subtle Gray `#eff4ff` pill with Newspaper icon
  - Bullish Sentiment: Emerald `#006c4e` tag
  - Bearish Sentiment: Amber Rust `#733100` tag
  - High Impact Flag: Crimson `#ba1a1a` outline pill

**Component Structure:**
1. **Filter & Header Bar:**
   - Title: "News & Regulatory Filings"
   - Filter Tabs: "All (24)" | "Official Disclosures Only (8)" | "High Impact (4)" | "Current Stock (RELIANCE)"
   - Search input for keyword filtering

2. **Timeline Feed List:**
   - Each timeline entry card includes:
     - **Metadata Line:**
       - Source Badge: "NSE Corporate Filing" (Official) or "Financial Press (Reuters)"
       - Publication Timestamp: "10:14:02 IST (12m ago)"
       - Ingestion Timestamp: "10:14:08 IST" (Shows 6-second ingestion latency)
       - Impact Rating: "HIGH IMPACT" or "MEDIUM IMPACT"
     - **Headline & Excerpt:**
       - Bold headline in 15px Inter: "Reliance Industries completes acquisition of 100% stake in green hydrogen subsidiary"
       - 2-line clean excerpt with key financial figures in JetBrains Mono
     - **Classification & Sentiment Tag:**
       - Badge: "↑ Bullish (Confidence: 88%)"
       - Inferred vs Confirmed Indicator:
         - Blue lock icon: "Confirmed Exchange Filing (Official Fact)"
         - Sparkle icon: "AI Interpretation: Corporate expansion likely supports intraday valuation"
     - **Action Link:**
       - "View Original Filing PDF" with external link icon (opens in new tab)
       - "Inspect Associated Setup" link if the stock is currently in active signals

---

## 4. Institutional Activity Context Widget

An executive context panel displaying daily Foreign Institutional Investor (FII/FPI) and Domestic Institutional Investor (DII) cash market activity alongside recent NSE bulk and block deal disclosures, clearly marked as delayed/historical context.

**DESIGN SYSTEM (REQUIRED):**
- Platform: Web
- Theme: Light, data-dense
- Surface: `#ffffff`
- Numbers: JetBrains Mono with signed values (`+₹1,240.50 Cr` in green, `-₹850.20 Cr` in red)
- Notice Banner: Warning Soft `#fef9c3` background with Warning `#a16207` text

**Component Structure:**
1. **Disclaimer Notice Strip (MANDATORY):**
   - "Context Only: Institutional flow and bulk deal reports reflect delayed official exchange publications (previous day / scheduled disclosures). They are not live order-book feeds and do not trigger signals independently."

2. **FII / DII Flow Summary Cards:**
   - Two side-by-side cards:
     - **FII / FPI Activity (Reporting Date: Yesterday EOD):**
       - Gross Buy: `₹8,420.15 Cr`
       - Gross Sell: `₹9,265.40 Cr`
       - Net Position: `-₹845.25 Cr` (Bold Red, JetBrains Mono)
     - **DII Activity (Reporting Date: Yesterday EOD):**
       - Gross Buy: `₹7,110.80 Cr`
       - Gross Sell: `₹5,820.30 Cr`
       - Net Position: `+₹1,290.50 Cr` (Bold Green, JetBrains Mono)
   - Net Institutional Cash Balance: `+₹445.25 Cr`

3. **NSE Bulk & Block Deals Table:**
   - Table headers: "Time / Date", "Symbol", "Client Name", "Deal Type", "Action", "Quantity", "Trade Price", "Value (Cr)"
   - Sample row:
     - Date: "14-Oct 14:15"
     - Symbol: `HDFCBANK`
     - Client: `SOCIETE GENERALE`
     - Deal Type: `BLOCK`
     - Action: `BUY` (Emerald pill)
     - Quantity: `1,250,000` (JetBrains Mono)
     - Price: `₹1,642.50`
     - Total Value: `₹205.31 Cr`
   - Pagination / "Show Last 10 Deals" toggle
