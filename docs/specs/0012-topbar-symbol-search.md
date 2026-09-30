# 0012. Top bar symbol search

**Date**: 2026-09-30
**Status**: In Progress

## Summary

The search box in the top bar looks real but does nothing. This spec makes it a quick jump box for today's watched F&O stocks (about 210, spec 0009). You type a few letters, see up to 8 matching stocks with live price, day change and status tags, and press Enter or click to open that stock. A stock with an open plan today opens its analysis page; any other stock opens its market page. ⌘K or Ctrl+K focuses the box from anywhere, and it works before the market opens too.

## Context

The top bar (`apps/web/components/layout/Topbar.tsx`) has shown a search input with a ⌘K hint since the UI shell (spec 0002), but it has no state, handler or navigation. Traders expect it to jump to a stock. Since spec 0009 the scanner streams every F&O stock (about 210) and the web app already receives live prices, day change, approaching setups and signals over the stream (`SignalContext`). The market page (`/dashboard/markets/[symbol]`) and the analysis page (`/dashboard/analysis/[symbol]`) both accept any symbol. Before 09:15 IST no ticks exist, so the live momentum list is empty; the full watched list only lives in the backend's `UniverseService`.

## Requirements

**User stories**:
- As a trader, I want to type part of a symbol and jump straight to that stock, so I don't have to scroll lists during the session.
- As a trader, I want to see price, change and whether a stock has a plan before I open it, so I pick the right one.
- As a trader, I want to reach search from the keyboard, so I stay fast.

**Acceptance criteria**:
- **AC-1**: Search looks only through today's watched F&O list (the stocks the scanner streams, spec 0009 AC-12), including before 09:15 and on days with no ticks.
- **AC-2**: Matching is case insensitive on the symbol: symbols that start with the typed text come first (alphabetical), then symbols that contain it elsewhere (alphabetical). Leading and trailing spaces are ignored. An empty box shows no list.
- **AC-3**: The list shows at most 8 results. Each row shows the symbol, the live price and the day change % (green up, red down), or "–" for both when no tick has arrived yet, plus tags when they apply: "Top 20" (in the current top 20 gainers), "Open plan" (an open signal today), "Approaching" (within 1% of a trigger).
- **AC-4**: When nothing matches, the list shows "No F&O stock matches "<text>"".
- **AC-5**: Choosing a result opens `/dashboard/analysis/<SYMBOL>` if the stock has an open plan today, otherwise `/dashboard/markets/<SYMBOL>`. After navigating, the box clears and the list closes.
- **AC-6**: Keyboard: ⌘K on Mac or Ctrl+K elsewhere focuses the box from anywhere on a dashboard page (and stops the browser's own shortcut). ↑ and ↓ move the highlight, wrapping at the ends. Enter opens the highlighted result, the first by default. Esc clears the text and closes the list; a second Esc leaves the box. Clicking a result opens it. Clicking outside closes the list.
- **AC-7**: The box is an accessible combobox: screen readers hear the list open, the number of results, and the highlighted result, and every result is reachable by keyboard alone.
- **AC-8**: If the watched list can't be loaded, the box still works over the stocks the live stream has already sent, and the list says "Showing live stocks only" at the bottom.

## Decision

A client side combobox (`SymbolSearch`) replaces the static input in the top bar. It fetches today's watched list once, from a new read only `GET /api/v1/scanner/universe`, on first focus. It filters that list in the browser, and it decorates each row with live data the app already has in `SignalContext` (the momentum ranking, approaching setups, open signals). No new streaming, no search service, no new library. Filtering about 210 symbols in the browser is instant, so there is no debounce and no server search.

**Implementation skills**: `nestjs-best-practices` (`kadajett/agent-nestjs-skills`, `.agents/skills/nestjs-best-practices/`), for the one endpoint.

**Why this shape.** You chose the watched list because every result then has live data and a real chart page. Searching all NSE stocks (about 2,000) would mostly return pages with no data, since we only stream F&O. Adding signals and the journal as grouped results was the runner up; it's a larger design and can come later (see Follow-up).

Picking the page by open plan puts the entry, stop and target in front of you when they exist. A static list plus the live data we already stream keeps the build small and the results always current. The runner up there was filtering only the live momentum list, which needs no new API but finds nothing before 09:15.

The combobox follows the WAI-ARIA combobox pattern, which is the standard for accessible search suggestions.

## Feature design

**Data model**: none. No schema change.

**API surface**:

| Endpoint | Method | Key inputs | Key outputs | Auth | Key errors |
|---|---|---|---|---|---|
| `/api/v1/scanner/universe` | GET | none | `{ data: { symbol: string }[] }`, sorted by symbol; the scanner's current watched list (`UniverseService.watching()`) | none (internal, same origin) | 200 with `data: []` when nothing is loaded yet |

**Components**: `apps/web/components/domain/SymbolSearch.tsx` (new), used by `Topbar.tsx` in place of the static input. It keeps the current look: the same width, placeholder and ⌘K hint. On a Windows or Linux browser the hint reads "Ctrl K".

**Value sourcing**:

| Action | Value produced / displayed | Source |
|---|---|---|
| Searchable symbols | list to filter | `GET /api/v1/scanner/universe`, fetched once on first focus per page load; fallback: symbols in `SignalContext.momentum` (AC-8) |
| Ranking of matches | result order | the AC-2 rule on the typed text (trimmed, upper cased) |
| Price, day change | row values | `SignalContext.momentum` entry for the symbol (`ltp`, `dayChangePct`); "–" when absent or `ranked` is false |
| "Top 20" tag | row tag | the symbol is among the first 20 `momentum` entries with `ranked` true (the same order the backend ranks by) |
| "Open plan" tag and navigation target | row tag, route | the symbol is in `SignalContext.activeSignals` |
| "Approaching" tag | row tag | the symbol is in `SignalContext.approachingSignals` |
| Mac vs other shortcut label | hint text | `navigator.platform` / `userAgent` contains "Mac" |

**Key invariants**:
- Search never calls the backend per keystroke; the only request is the one list fetch on first focus.
- At most 8 rows are ever rendered.
- Navigation always uses the symbol exactly as the list gives it, URL encoded (`M&M` → `M%26M`).
- ⌘K / Ctrl+K works on every dashboard page, and never while a modal dialog is open.

**Security model**: read only, internal endpoint returning public symbols. No auth change, no user data.

**Configuration required**: none.

**Failure and edge cases**:
- List fetch fails: fall back to the live momentum symbols, and show "Showing live stocks only" (AC-8). The fetch is retried on the next focus.
- Typing before the list arrives: show "Loading stocks…" until it does.
- Symbols with special characters (`M&M`, `BAJAJ-AUTO`) match and navigate correctly.
- A stock leaves the top 20 or closes its plan while the list is open: tags update live from the context.

**Critical test scenarios**:
- Typing "rel" lists RELIANCE first, with price, change and tags, verifies **AC-2**, **AC-3**
- Typing "bank" puts symbols starting with BANK before AXISBANK and HDFCBANK, verifies **AC-2**
- Typing "zzzz" shows "No F&O stock matches "zzzz"", verifies **AC-4**
- Enter on a stock with an open plan opens its analysis page; on another stock, its market page, verifies **AC-5**
- ⌘K / Ctrl+K focuses the box; ↑↓ wrap; Esc clears, and a second Esc blurs, verifies **AC-6**
- Before 09:15, typing "ide" finds IDEA with "–" for price and change, verifies **AC-1**, **AC-3**
- The list endpoint fails, and search still finds a stock the stream has sent, with the "live stocks only" note, verifies **AC-8**
- Screen reader roles: combobox, listbox, and options with the active one announced, verifies **AC-7**
- `M&M` navigates to `/dashboard/markets/M%26M`, verifies **AC-5**

## Build plan

Thin end to end first (Tracer Bullet, the project default): one typed symbol reaches its page, then live decoration, then the keyboard and accessibility polish.

1. **Universe endpoint**: add `GET /api/v1/scanner/universe` to `ScannerController`, returning `UniverseService.watching()` symbols sorted, with a controller test, satisfies **AC-1**
2. **Search core**: pure `matchSymbols(list, text, limit)` (ranking rule and 8 cap) and `searchTarget(symbol, activeSignals)` (route choice) in `apps/web/lib/`, unit tested, satisfies **AC-2**, **AC-5**
3. **SymbolSearch component**: the list fetch on first focus with the momentum fallback, rows with price, change and tags from `SignalContext`, the no match and loading states, navigation, and clearing after navigating; replace the static input in `Topbar.tsx`, satisfies **AC-1**, **AC-3**, **AC-4**, **AC-5**, **AC-8**
4. **Keyboard and accessibility**: the global ⌘K / Ctrl+K listener, arrow keys with wrap, Enter, the two step Esc, click outside, and combobox roles (`role="combobox"`, `aria-expanded`, `aria-controls`, `aria-activedescendant`, `role="listbox"` / `option`, and a polite live region for the result count), satisfies **AC-6**, **AC-7**
5. **Tests**: component tests for ranking, tags, keyboard and ARIA, plus one Playwright flow (type, Enter, land on the page) with the list stubbed, satisfies **AC-2** to **AC-8**

## Consequences

**Positive**:
- The top bar stops looking broken, and jumping to a stock takes a few keystrokes.
- There's no new infrastructure: one small endpoint and data already on the client.
- Results always carry live context (price, change, plan status).

**Negative / tradeoffs**:
- Only F&O stocks can be found. A non F&O stock someone expects to see is missing on purpose.
- The list is fetched once per page load. If the backend reloads a different list during the session (it only ever adds), new names appear after a refresh.
- There's no company name search: Angel's file only gives trading symbols, so "Reliance Industries" won't match (though "reli" does).

**Neutral**:
- The journal page's own search control (Stitch plan item 11) is a separate, page level feature and is unaffected.

## Follow-up

- [ ] Grouped results for today's signals and journal entries (the runner up option), if quick jumps to them become useful
- [ ] Company name search, if a source of names is added to the universe
- [ ] Recent searches, shown when the box is focused and empty

## Options considered

### Option 1: Watched F&O list, one fetch, live decoration (chosen)
- Pros: every result has live data and a real chart; tiny build; works before the open.
- Cons: non F&O stocks can't be found; a list change mid session needs a refresh.

### Option 2: All NSE cash stocks
- Pros: finds any stock.
- Cons: most results would open empty pages, since only F&O stocks stream; needs a 2,000 row list, or a server side search.

### Option 3: Grouped stocks, signals and journal
- Pros: one box for everything.
- Cons: more to design (grouping, ranking across types, where each opens); a bigger build for a need not yet shown.

### Option 4: Filter only the live momentum list (no new endpoint)
- Pros: zero backend work.
- Cons: finds nothing before 09:15, or on quiet stocks with no tick yet.

## Rationale

The engineer chose to search the stocks the app actually tracks, with the live context shown in each row. Option 1 delivers that with the least new surface: one read only endpoint, and data the client already receives. Option 4 was the closest runner up, but an empty search box before the open would feel broken, which is the very problem this spec fixes. Opening the analysis page for stocks with an open plan follows the engineer's choice, because that is where the plan's levels live.
