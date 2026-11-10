# Backtest lab (backend)

Admin only backtests of the guru rules on NIFTY and SENSEX history. Governing specs: [0020](../../../../docs/specs/0020-guru-strategy-backtest-lab/index.md) (lab, rules, gate) and [0022](../../../../docs/specs/0022-backtest-history-provider/index.md) (history provider).

- **Files:**
  - `engine/simulate.ts`: bar by bar simulation (precision rules v1: closed bars only, warm up, 14:45 last entry, 15:15 time exit, stop first on a two sided bar, gap fills at the open, slippage in the fill only).
  - `engine/costModel.ts`: cost model v1 constants (versioned with `asOf`). `engine/metrics.ts`: metrics, 70/30 split, full years, buy and hold. `engine/gate.ts`: gate v1 constants and `judgedSymbols`.
  - `history/backfill.ts`: pluggable history provider (`angelone` | `kite`), chunked fetch with retry and resume, DB lock in `backtest_locks`, `unavailable` detection.
  - `runner.ts`: queue (all or nothing), atomic claim (`queued → running`), execute, store, recompute the gate across symbols.
  - `backtest.service.ts` / `backtest.controller.ts`: in process worker and the admin API under `/api/v1/backtest`.
  - `definitions.ts`: read only text of rule definitions v1 shown in the UI.
  - `newsComparison.ts`: spec 0025 with and without the news gate on covered trades (pure; `GET /runs/:id/news-comparison` loads the rows, computed on request, writes nothing).
  - The rules themselves live in `scanner/strategy/guru/` (pure, reused by the future live promotion spec).

- **Conventions:**
  - Never edit definitions, cost model, or gate values in place: a change is a new version (`v2`) with a fresh out of sample window.
  - Rule functions stay pure and import nothing from this folder.
  - Claim a run before executing it (`update … where status = 'queued'`); never mark `running` unconditionally.
  - A symbol with no history is `unavailable` (run `done`, `out_of_sample.unavailable`), not `failed`; the gate judges only symbols with data.
  - Each run records `cost_model.notes.history_provider`.

- **Commands** (from `apps/backend`): `npm run backtest -- --backfill NIFTY,SENSEX [--provider angelone|kite]`, `npm run backtest -- --run all --symbols NIFTY,SENSEX`.
- **Tables:** `backtest_runs`, `backtest_trades`, `backtest_locks` (migration `20261106120000_backtest_lab.sql`, RLS on, service role only); history in `candles`.
- **Env:** `HISTORY_PROVIDER`, `ANGEL_ONE_HISTORICAL_API_KEY` (optional), Angel One credentials; Kite keys once its token flow is decided.
- **Known blocker:** Angel One returns `AG8004` for historical candles on the Trading key (see spec 0022 and `docs/research/historical_index_data_sources.md`).

_Drafted by /sync from the introducing change, worth a quick human pass._
