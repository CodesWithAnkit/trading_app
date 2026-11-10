# 0023 Rationale: Guru Strategy Live Promotion

## Context

Spec 0020 built a lab that tests five rules on NIFTY and SENSEX history, with a pre registered gate. It deliberately left live use for later. Three facts shape this phase. The live scanner today subscribes only to NSE cash stocks (`exchangeType 1`) and evaluates on 1 minute candles. Its signal building and exit tracking assume LONG only. And the rules were tested on index bars, not stocks, so a gate pass says nothing about stocks. Index history (for warm up and daily context) comes from the `candles` table, which the backfill fills when a provider works (spec 0022, currently blocked on Angel One's AG8004).

## Rationale

Reusing the exact rule functions is the whole point of 0020: the rule that passed is the rule that runs. Keeping guru evaluation in its own service, instead of mixing it into `multiStrategyEngine` (which is stock focused, 1 minute driven, and LONG only), avoids changing the behavior of your existing strategies. Index only promotion keeps the gate honest, because only what was tested can go live. Firing stop entries on the actual trigger, rather than as pending alerts, keeps live entries the same as the backtest fills. Controls sit in the lab, next to the evidence that justifies them.

Options considered: promote into `multiStrategyEngine` as another setup (less code, but 1 minute and LONG only assumptions would distort the rules); also run on F&O stocks (more signals, all untested); pending alert signals for stop entries (earlier notice, but most expire unfilled and the entry differs from the backtest).
