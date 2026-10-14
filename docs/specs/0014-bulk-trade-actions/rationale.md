# Rationale for 0014

## Context

Traders often need to exit multiple open positions quickly, especially during volatile market conditions or at the end of the trading day. Currently, the Trades page only supports managing one trade at a time through individual row actions. Closing multiple trades requires repetitive clicking, which is slow and error prone. We need a way to select multiple trades and apply an action to all of them at once.

## Options considered

### Option 1: Client side loop over existing endpoints

The client UI maintains the selection state and iterates through the selected trades, calling the existing individual close endpoint for each.

**Pros**:
- Reuses existing backend and state logic without API changes
- Easy to report partial success per trade

**Cons**:
- Multiple network requests could be slow if selecting many trades

### Option 2: Dedicated bulk update endpoint

Create a new API endpoint that accepts an array of trade IDs and processes the bulk close transactionally on the backend.

**Pros**:
- Single network request
- Backend can optimize the bulk operation

**Cons**:
- Requires new backend logic and API surface
- More complex to handle and report partial failures

## Rationale

Since the application currently relies heavily on mock data and local state transitions (as established in previous UI specs), a client side loop is the simplest and most direct path to deliver the UX. It reuses the exact same logic already proven for individual exits. If network latency becomes an issue when a real backend is connected, we can migrate to a dedicated bulk endpoint later.

