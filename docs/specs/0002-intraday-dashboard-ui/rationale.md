# 0002. Implement Intraday Stock Tracker Dashboard UI (Rationale)

## Context

The UI for the Intraday Stock Tracker has been designed in Stitch. We need to implement these designs with high visual fidelity, covering the dashboard, signal details, trade entry flows, and journal auditing. Importantly, this phase strictly separates presentation from the backend: there are no real APIs, no Supabase connection, and no Angel One SmartAPI integration. The UI must be fully navigable and demonstrate complex state transitions (like signal expiration and trade risk validation) purely on the client so that the backend can be wired up smoothly in a later phase.

## Options considered

### Option 1: Implement full stack (UI + Backend APIs)
Wait to build the UI until the backend endpoints and real strategy calculations are ready.
**Pros**:
- Only build state management once (using real server data).
**Cons**:
- Blocks UI progress on complex backend logic.
- Harder to iterate on pixel-perfect designs while debugging API failures.

### Option 2: Implement pure UI shell (Facade approach)
Build the complete interactive frontend using React Context and mock data providers, enforcing strict separation of concerns.
**Pros**:
- Unblocks frontend development immediately.
- Allows rapid iteration on design fidelity and state transition UX (e.g., risk validation).
- Simplifies swapping in real APIs later by adhering to defined context boundaries.
**Cons**:
- Requires throwing away or refactoring the mock state providers later when connecting real endpoints.

## Rationale

The Facade approach is the most appropriate delivery strategy for this feature. By focusing entirely on the UI, we can achieve the pixel-perfect fidelity required by the Stitch designs without being bogged down by backend complexity or live broker integrations. The PRD explicitly restricts this phase from touching APIs or Supabase, making local React Context and mock data the only viable path to demonstrate the required state transitions (like signal expiry and risk validation).

## Consequences

**Positive**:
- Extremely fast iteration loop on UI and user experience.
- The product's visual identity and interaction rules are solidified without backend blockers.
- Allows stakeholders to test drive the interface early.

**Negative / tradeoffs**:
- Context state management will eventually need to be ripped out and replaced by real API data fetching (e.g., React Query or similar).

**Neutral**:
- URL Search Params will be heavily leaned on to mock routing and modal state.

## Follow-up

- [ ] Ensure the mock state context is designed cleanly so that replacing it with a real API client is straightforward.
