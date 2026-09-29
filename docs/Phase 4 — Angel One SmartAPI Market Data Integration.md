# Phase 4 — Angel One SmartAPI Market Data Integration

## Objective

Phase 3 — Real API Implementation — is complete and accepted.

Now implement **Phase 4: Angel One SmartAPI market-data integration**.

The goal is to replace the scanner's simulated market-data source with a real Angel One SmartAPI market-data connection while preserving the existing architecture and security boundaries.

This phase is **market-data only**.

Do NOT implement broker trading functionality.

---

# 1. Non-negotiable architecture

The system must remain:

```text
Browser
   ↓
Next.js / Vercel
   ↓
Supabase
   ↑
Scanner Worker
   ↑
Angel One SmartAPI
```

The Angel One connection belongs exclusively to the Scanner Worker.

The browser must never receive:

- Angel One API key
- Client code
- MPIN
- TOTP secret
- JWT/auth token
- feed token
- scanner-worker credentials

Next.js must NOT connect directly to Angel One.

---

# 2. Explicitly prohibited

Do NOT implement or call:

- order placement
- order modification
- order cancellation
- order status
- order book
- trade book
- funds
- holdings
- positions
- portfolio
- automatic execution
- broker-side trade automation

This product remains a decision-support and manual-journal application.

The user executes trades separately through Angel One.

---

# 3. Source documents

Before modifying code, read and reconcile:

- `PRD.md`
- `Architecture.md`
- `DESIGN_SYSTEM.md`
- `STRATEGY_SPEC.md`
- `STRATEGY_DECISIONS.md`
- `STRATEGY_CONFIG.md`
- `AGENTS.md`
- existing Phase 3 implementation
- existing scanner/mock market-data implementation

Do not invent a new architecture if the existing documents already define the required boundary.

If implementation and documentation disagree, stop and report the discrepancy before making architectural changes.

---

# 4. PLAN FIRST

Before writing code:

1. Inspect repository structure.
2. Locate the Scanner Worker.
3. Locate the current market-data abstraction.
4. Locate mock/simulated market-data implementation.
5. Locate instrument/token representation.
6. Locate feed-health persistence.
7. Locate Supabase repository interfaces.
8. Locate strategy-engine input contracts.
9. Locate environment/configuration handling.
10. Locate existing tests.

Produce a concise implementation plan before execution.

The plan must identify:

- files to create
- files to modify
- interfaces to preserve
- environment variables required
- authentication flow
- WebSocket lifecycle
- tick normalization
- candle aggregation
- feed-health handling
- test strategy

Then execute the plan.

---

# 5. Angel One integration boundary

Create an adapter around SmartAPI.

Do not allow Angel One SDK types to spread throughout the application.

Preferred structure:

```text
scanner/
  market-data/
    MarketDataProvider.ts
    AngelOneMarketDataProvider.ts
    MockMarketDataProvider.ts
    types.ts
    TickNormalizer.ts
    CandleAggregator.ts
    FeedHealthMonitor.ts
```

Adapt the actual directory structure to the existing repository.

The rest of the scanner should depend on an internal interface such as:

```ts
interface MarketDataProvider {
  connect(): Promise<void>;

  disconnect(): Promise<void>;

  subscribe(instruments: InstrumentSubscription[]): Promise<void>;

  unsubscribe(instruments: InstrumentSubscription[]): Promise<void>;

  onTick(handler: (tick: MarketTick) => void): void;

  getHealth(): FeedHealth;
}
```

Do not couple the strategy engine directly to SmartAPI.

---

# 6. Angel One authentication

Implement server-side authentication only.

Use environment variables/secrets.

Never hardcode credentials.

Expected configuration should be equivalent to:

```env
ANGEL_ONE_API_KEY=
ANGEL_ONE_CLIENT_CODE=
ANGEL_ONE_TOTP_SECRET=
```

Do not assume exact variable names if the existing project already has a convention. Follow the project's existing secret/configuration conventions.

Authentication should:

1. authenticate with Angel One
2. obtain the required authentication/session token
3. obtain feed token
4. initialize WebSocket V2
5. expose only internal authenticated state to the scanner

Do not persist authentication secrets in Supabase.

Do not log secrets or tokens.

---

# 7. WebSocket V2

Use Angel One's current SmartAPI WebSocket V2 implementation.

The official JavaScript SDK exposes `WebSocketV2`.

Use NSE cash-equity subscriptions.

NSE cash-equity exchange type is:

```text
NSE_CM
```

Do not subscribe to derivatives.

Do not subscribe to options.

Do not subscribe to indices as tradable instruments.

Start with a small configurable instrument allowlist.

Example:

```env
SCANNER_INSTRUMENTS=...
```

Use the existing instrument model/token mapping where available.

---

# 8. Connection lifecycle

Implement an explicit connection state machine:

```text
DISCONNECTED
    ↓
CONNECTING
    ↓
AUTHENTICATING
    ↓
CONNECTED
    ↓
RECONNECTING
    ↓
CONNECTED
```

Failure states must be observable.

Handle:

- authentication failure
- WebSocket connection failure
- WebSocket close
- heartbeat failure
- malformed tick
- subscription failure
- unexpected disconnect
- repeated reconnect failure
- session expiry

Implement bounded retry/backoff.

Do not create an infinite uncontrolled reconnect loop.

Every reconnect attempt must be observable through structured logs and feed health.

---

# 9. Tick normalization

Create an internal canonical tick model.

Example:

```ts
interface MarketTick {
  instrumentToken: string;
  exchange: 'NSE';
  symbol: string;

  ltp: number;

  timestamp: Date;

  volume?: number;

  open?: number;
  high?: number;
  low?: number;
  close?: number;

  rawTimestamp?: number;
}
```

Adapt this to the existing domain types if they already exist.

Requirements:

- normalize prices
- normalize timestamps
- normalize instrument token
- map token → symbol
- reject malformed ticks
- reject impossible prices
- reject invalid timestamps
- never pass raw SmartAPI payloads into strategy code

Preserve raw provider data only if there is an explicit diagnostic requirement.

Do not persist every raw tick to Supabase unless the existing architecture specifically requires it.

---

# 10. Candle aggregation

Implement deterministic candle aggregation.

Required timeframes:

```text
1 minute
5 minutes
```

Strategy architecture:

```text
Ticks
  ↓
1m candles
  ↓
5m candles
  ↓
Strategy engine
```

The strategy engine must consume canonical candles, not Angel One payloads.

Required candle fields:

```ts
interface Candle {
  symbol: string;
  instrumentToken: string;

  timeframe: '1m' | '5m';

  open: number;
  high: number;
  low: number;
  close: number;

  volume: number;

  startTime: Date;
  endTime: Date;

  isComplete: boolean;
}
```

Follow the existing strategy contracts if they differ.

Important:

- completed candles are used for confirmation
- forming candles may be used for monitoring only
- do not treat an incomplete candle as confirmed strategy evidence
- handle ticks arriving out of order
- handle duplicate ticks
- handle missing intervals
- handle market-open/session boundaries

---

# 11. Feed-quality gate

Implement the feed-quality boundary before strategy evaluation.

The strategy must fail closed when feed quality is insufficient.

At minimum detect:

```text
STALE
DISCONNECTED
MISSING_DATA
INVALID_TICK
TIMESTAMP_ANOMALY
CANDLE_GAP
```

The strategy must not generate a live signal from invalid/stale market data.

The dashboard must eventually be able to distinguish:

```text
Live
Delayed
Stale
Disconnected
Simulated
```

Do not report `Live` simply because the WebSocket process is running.

`Live` requires recent valid market-data updates.

---

# 12. Feed health

Persist scanner feed health to the existing Supabase feed-health mechanism.

Include information equivalent to:

```ts
interface FeedHealth {
  status:
    | 'CONNECTED'
    | 'DELAYED'
    | 'STALE'
    | 'DISCONNECTED'
    | 'RECONNECTING';

  lastTickAt: Date | null;
  lastCandleAt: Date | null;

  connectionStartedAt: Date | null;

  reconnectCount: number;

  subscribedInstrumentCount: number;

  lastErrorCode?: string;
  lastErrorMessage?: string;
}
```

Do not expose secrets.

Sanitize provider error messages before persistence if necessary.

---

# 13. Instrument universe

Do not immediately build an unrestricted NSE scanner.

For the first real-data milestone:

```text
small explicit NSE cash-equity allowlist
```

This is intentional.

First prove:

```text
authentication
→ WebSocket
→ tick
→ normalization
→ candle
→ feed health
→ persistence
```

Then expand the instrument universe.

Use the existing `instruments` domain.

Each instrument must have a stable Angel One symbol token mapping.

---

# 14. Market session handling

Respect the existing market-session configuration.

Do not assume the scanner should operate 24/7.

Outside the configured market session:

- do not generate live trading signals
- mark feed/scanner state appropriately
- avoid treating stale overnight data as live data
- reset/roll candle aggregation correctly for a new session

Use Asia/Kolkata / IST according to the project strategy configuration.

Do not hardcode session times in multiple places.

---

# 15. Strategy integration boundary

DO NOT rewrite the strategy engine during this phase.

The strategy engine should already consume deterministic inputs.

Wire real candles into the existing strategy input contract.

The intended flow is:

```text
Angel One
    ↓
MarketDataProvider
    ↓
MarketTick
    ↓
CandleAggregator
    ↓
1m / 5m completed candles
    ↓
Feed Quality Gate
    ↓
Existing Strategy Engine
    ↓
Signal
    ↓
Supabase
```

If the strategy engine is not ready for live inputs, stop at the candle/feed-validation boundary and report that instead of bypassing the contract.

---

# 16. Paper mode

The strategy configuration currently uses paper mode.

Preserve this.

Real market data does NOT mean real broker execution.

The initial runtime must be:

```text
REAL MARKET DATA
+
PAPER STRATEGY
+
MANUAL EXECUTION
+
NO BROKER ORDERS
```

Never add a flag that accidentally enables broker execution.

---

# 17. Logging

Use structured logs.

Log:

```text
worker started
authentication started
authentication successful
websocket connecting
websocket connected
subscription successful
tick received
candle completed
feed health changed
reconnect started
reconnect succeeded
reconnect failed
```

Do NOT log:

- API keys
- TOTP
- MPIN
- JWT
- feed token
- passwords
- authorization headers

Avoid logging every tick at INFO level in production.

Tick-level diagnostics should be DEBUG/trace controlled.

---

# 18. Testing

Tests must exist at multiple levels.

## Unit tests

Test:

- tick normalization
- invalid tick rejection
- token → instrument mapping
- 1m aggregation
- 5m aggregation
- candle completion
- duplicate tick handling
- out-of-order tick handling
- missing interval handling
- feed stale detection
- reconnect state transitions
- market session boundaries

## Integration tests

Mock the Angel One provider/WebSocket boundary.

Verify:

```text
connect
→ subscribe
→ receive tick
→ normalize
→ aggregate candle
→ feed health update
```

Do not require live Angel One credentials for CI.

## Contract tests

Verify the normalized provider output remains compatible with:

- candle model
- feed-health repository
- strategy-engine input

## Live smoke test

Provide a manually triggered live smoke-test command.

Example conceptually:

```bash
npm run scanner:angelone:smoke
```

It should:

1. authenticate
2. connect
3. subscribe to a tiny configured symbol list
4. receive ticks
5. print sanitized tick/candle information
6. report connection health
7. disconnect cleanly

It must NOT create orders.

It must NOT call any broker trading endpoint.

---

# 19. Environment safety

Local development should remain safe.

Default:

```text
MOCK MARKET DATA
```

Real Angel One integration should require an explicit environment/configuration switch.

Example:

```env
MARKET_DATA_PROVIDER=mock
```

and:

```env
MARKET_DATA_PROVIDER=angelone
```

If `angelone` is selected but credentials are missing:

```text
fail fast
```

Do not silently fall back to mock data.

That would make the dashboard falsely appear live.

---

# 20. Database safety

The scanner worker must use a restricted server-side database credential.

It must not use a browser Supabase anon key.

The worker should only have access to the tables/actions required for:

- instruments
- feed health
- candles if persisted
- signals
- signal metrics
- signal status history
- strategy versions where required

Do not grant unnecessary user-data access.

---

# 21. Dashboard integration

Do not redesign the dashboard.

Use the existing Phase 3 UI.

Only connect its existing data contracts to real persisted scanner data.

The dashboard must correctly display:

```text
Live
Delayed
Stale
Disconnected
Simulated
```

The UI must never display `Live` when the worker has no recent valid tick.

The existing `I entered` / `I exited` actions remain journal-only.

---

# 22. Security audit

Before completion, search the repository for:

```text
placeOrder
modifyOrder
cancelOrder
orderBook
tradeBook
funds
holdings
position
portfolio
```

Any new Angel One usage related to those capabilities is a blocker.

Also search for:

```text
ANGEL_ONE_API_KEY
ANGEL_ONE_CLIENT_CODE
ANGEL_ONE_TOTP
JWT
FEED_TOKEN
```

Verify that no secret is:

- committed
- logged
- exposed to client bundles
- returned by Next.js APIs
- persisted in user-facing tables

---

# 23. Definition of Done

Phase 4 is complete only when all of the following are true:

### Authentication

- [ ] Angel One authentication works from the Scanner Worker.
- [ ] Credentials are server-side only.
- [ ] Session/feed token handling works.
- [ ] Authentication failures are observable.

### WebSocket

- [ ] SmartAPI WebSocket V2 connects.
- [ ] NSE cash-equity subscriptions work.
- [ ] Reconnection works.
- [ ] Heartbeat/connection health works.
- [ ] Subscription failures are handled.

### Market data

- [ ] Real ticks are received.
- [ ] Ticks are normalized.
- [ ] Invalid ticks are rejected.
- [ ] 1m candles are generated.
- [ ] 5m candles are generated.
- [ ] Completed/forming candle semantics are correct.

### Feed health

- [ ] Connected state works.
- [ ] Delayed state works.
- [ ] Stale state works.
- [ ] Disconnected state works.
- [ ] Reconnecting state works.
- [ ] Health is persisted to Supabase.

### Strategy boundary

- [ ] Existing strategy engine receives canonical candles.
- [ ] Feed-quality gate runs before strategy evaluation.
- [ ] No strategy rewrite was performed unnecessarily.
- [ ] Paper mode remains enabled.

### Security

- [ ] No Angel One secrets reach browser code.
- [ ] No secrets are committed.
- [ ] No secrets are logged.
- [ ] No broker order APIs are called.
- [ ] No funds/holdings/position/portfolio APIs are called.

### Tests

- [ ] Unit tests pass.
- [ ] Integration tests pass.
- [ ] Existing Phase 3 tests still pass.
- [ ] Live smoke test works with real credentials.
- [ ] CI does not require Angel One credentials.

### Documentation

Update the relevant project documentation with:

- Angel One integration architecture
- environment variables
- worker deployment requirements
- authentication lifecycle
- WebSocket lifecycle
- feed-health states
- smoke-test instructions
- security boundary

Do not document actual credentials or secrets.

---

# 24. Final implementation report

At completion report:

1. Files created.
2. Files modified.
3. Angel One SDK/version used.
4. Authentication flow.
5. WebSocket implementation.
6. Instrument subscription approach.
7. Tick normalization.
8. Candle aggregation.
9. Feed-health implementation.
10. Strategy integration status.
11. Tests added.
12. Live smoke-test result.
13. Environment variables required.
14. Any remaining blockers.
15. Confirmation that no broker order APIs were added.

Do not mark the phase complete if the real Angel One connection has not been successfully smoke-tested.