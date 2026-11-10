# 0025. News Aware Trade Analysis: rationale

## Context

> ⚠️ Premise note: the backtest lab only tests NIFTY and SENSEX, and news collection started on 2026-11-10 with a 30 day delete. A "news aware backtest" over years of history would either need a historical news source or would silently run on a few weeks of data. The engineer chose to use only collected news and to judge it honestly, so this spec keeps HIGH news for good (a 0024 update) and compares only on days with news coverage, with the sample size shown.

Spec 0024 now stores real NSE, BSE, RSS, and Alpha Vantage items, each classified by rules, Gemini, or a neutral default. None of that reaches trading decisions yet. The explainable analysis (spec 0017) has a Gate 06 "event risk" check, but it passes whenever the newest item is an official filing, whatever that filing says, and its trade plan assumes `LONG` for every symbol. Scanner signals and the guru index signals (spec 0023) ignore news entirely.

The backtest lab (specs 0020, 0022) replays guru rules on NIFTY and SENSEX and stores each trade's side and entry time. It is the natural place to test whether a news filter helps, but only if the test cannot see the future: live trading only knows news already published, so any backtest rule that blocks a trade because of news published after entry would overstate the benefit.

Forces: the classification is new and partly AI driven, so a block must be explainable and reviewable; signals must stay auditable after the fact; the same rule must run live and in the backtest, or the backtest proves nothing about live behaviour.

## Options considered

### Option 1: Separate rules, live and backtest

The live side gets a Gate 06 style rule tuned for the screen; the backtest gets its own filter tuned for statistics.

**Pros**:
- Each side can evolve on its own.

**Cons**:
- The backtest no longer measures what runs live, which defeats its purpose.
- Two rules drift; nobody can say which one is "the news rule".

### Option 2: One shared pure gate, stored live, computed in the backtest (chosen)

A pure function (no I/O, given items in, verdict out) used by both sides. Live verdicts are stored on the signal and only ever escalate; the backtest comparison is computed on request.

**Pros**:
- What the backtest shows is exactly the live behaviour.
- Pure function is trivial to test with fixtures; versioned like the other lab rules.
- Stored live verdicts stay auditable even after news is pruned or reclassified.

**Cons**:
- The shared rule is a compromise: the backtest cannot use late news that the live side uses to update an open signal (it measures entry filtering only).

### Option 3: News as a confidence score adjustment

News raises or lowers each signal's score instead of a pass, warn, or block verdict.

**Pros**:
- More nuance than three states.

**Cons**:
- Much harder to explain why a trade was taken or skipped; conflicts with the app's explainable evidence approach.
- Needs tuning data the project does not have yet.

## Rationale

Option 2 is chosen because the whole point of the backtest work is to decide whether to trust the live gate, and that only works if both run the same rule. The past only 60 minute window removes look ahead by construction, which keeps the comparison honest at the cost of ignoring scheduled future events (results dates), which the same day earnings and board meeting warning partly covers.

Live verdicts are stored rather than computed on read because a signal's verdict should not change silently when news is reclassified or pruned; it may only escalate when new news lands, with a timestamp. The backtest comparison is the reverse: it is computed on request because its value grows with every day of collected news, and storing it would make every run stale until rerun.

Blocked signals are shown, not suppressed, so the trader keeps their judgement and the system keeps outcome data on skipped trades, which is itself evidence for or against the gate. Unclassified items never block because a Low / Neutral default is "we don't know", not a direction.

Cross check fixes applied on 2026-11-10 (engineer approved): a real `signals.symbol` column; entry and after entry verdicts kept apart so the live entry verdict is exactly what the backtest measures; stale news warns instead of passing; coverage judged per trade, not per day; atomic escalation in SQL; deciding items embedded on the signal.

Recommendations made in writing this spec: stocks see their own news plus `MARKET` items (macro news moves every stock; runner up: own symbol only, which misses RBI days); a live re-check can only escalate (pass to warn to block), never relax (runner up: full re-evaluation, which would make a block flicker away as items age out of the window); the backtest flags a sample under 30 covered trades as too small (runner up: no flag, which invites over reading two weeks of data); Gate 06 takes `side` from the symbol's latest active signal today and, with none, can only warn (runner up: assume `LONG` as today, which is wrong for shorts).
