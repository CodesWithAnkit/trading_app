# Calibration Report

**Version:** 0.1.0-alpha
**Timestamp:** 2026-09-28T12:00:00Z

## Unresolved Parameters
The following parameters are currently unresolved and require historical data calibration:
- `entry.max_width_bps`
- `stop.minimum_distance_bps`
- `risk_reward.minimum_ratio`

## Candidate Ranges
Based on initial distributional analysis and volatility constraints, we will test the following ranges during the calibration period:

| Parameter | Min | Max | Step |
| :--- | :--- | :--- | :--- |
| `entry.max_width_bps` | 15 | 50 | 5 |
| `stop.minimum_distance_bps` | 10 | 40 | 5 |
| `risk_reward.minimum_ratio` | 1.0 | 2.5 | 0.1 |

## Metrics (Dry Run / Simulation)
_Metrics generated from deterministic fixture data in simulation runner._

### Signal Volume
- **Candidates:** 120
- **Active:** 45
- **Invalidated:** 30
- **Expired:** 45
- **Duplicates Suppressed:** 12

### Outcomes
- **T1 First:** 15
- **T2 First:** 5
- **Stop First:** 20
- **Neither (Expired):** 3
- **Ambiguous:** 2
- **Average MFE (Max Favorable Excursion):** 12.5 bps
- **Average MAE (Max Adverse Excursion):** 10.2 bps

## Next Phase Prep
To complete historical dataset integration, the data ingestion pipeline must provide perfectly synchronized 1m OHLCV and 5m aggregated features without look-ahead bias, ensuring exact replication of the `simulationRunner` state transitions.
