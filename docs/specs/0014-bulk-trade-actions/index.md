# 0014. Add bulk actions to manage multiple trades

**Date**: 2026-09-30
**Status**: Proposed

## Summary

This enhancement adds bulk actions to the Trades page so users can manage multiple positions at once. It introduces checkboxes on each row with a floating action bar to close selected trades. A client side loop executes the existing close logic for each trade and reports successes and failures via a toast notification.

## Requirements

**User stories**:
- As a trader, I want to select multiple open trades and close them together so that I can exit positions quickly.
- As a trader, I want to see which bulk operations succeeded and which failed so that I can retry any failed exits.

**Acceptance criteria**:
- **AC-1**: The Trades table includes a checkbox column on the left with a "Select All" checkbox in the header.
- **AC-2**: When one or more rows are selected, a floating action bar appears with a "Close X Selected" button.
- **AC-3**: Clicking the bulk close button iterates through selected trades and calls the existing exit logic for each.
- **AC-4**: Upon completion, a toast notification displays the number of successful and failed closures, and any failed trades remain selected in the table.

## Decision

**Chosen option**: Option 1: Client side loop over existing endpoints

We will implement the bulk close using a client side loop over the existing trade close logic.

## Feature design

**Data model sketch**:
- No schema changes.
- UI State: `selectedTradeIds: string[]` maintained in the Trades page component.

**API surface**:
- No new endpoints. Reuses existing `updateTrade` context hook method.

**Value sourcing**:
| Action | Value produced / displayed | Source |
|---|---|---|
| Render checkboxes | Row selection state | Local component state (`selectedTradeIds`) |
| Bulk close button | Number of selected trades | `selectedTradeIds.length` |
| Toast notification | Success/failure counts | Accumulated results from the client side loop |

**Key invariants**:
- The bulk action bar must only appear when `selectedTradeIds.length > 0`.
- The "Select All" checkbox must only select visible trades currently rendered in the list.

**Security model**:
- Inherits existing authorization. Only trades belonging to the current mock session can be closed.

**Configuration required**:
- None

**Critical test scenarios**:
- Happy path: Select two trades, click bulk close, both close successfully, toast shows 2 successes, selection clears, verifies **AC-1**, **AC-2**, **AC-3**.
- Failure case: One trade fails to close during the loop, toast shows 1 success and 1 failure, the failed trade remains selected, verifies **AC-4**.

## Build plan

1. [x] Add a checkbox column to the `TradeTable` component, including a "Select All" header, and manage `selectedTradeIds` state, satisfies **AC-1**
2. [x] Create a floating action bar component that appears when selection is active, satisfies **AC-2**
3. [x] Implement the bulk close handler to loop over `selectedTradeIds` and call the existing exit logic, satisfies **AC-3**
4. [x] Add success/failure tracking to the loop and trigger a toast notification upon completion, leaving failed IDs in the selection state, satisfies **AC-4**

## Consequences

**Positive**:
- Significantly faster workflow for exiting multiple positions.
- Low implementation risk due to reusing existing logic.

**Negative / tradeoffs**:
- A loop of individual requests is less efficient than a single bulk network call.

**Neutral**:
- We may need to revisit this design (Option 2) if the number of trades typically closed at once grows very large.

## Rationale

See [rationale.md](./rationale.md)
