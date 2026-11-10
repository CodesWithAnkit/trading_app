/** Maps a `signals` row to the Signal shape the web app consumes. */
export function toApiSignal(signal: any) {
  const snap = signal.snapshot_json || {};
  const referenceEntry = referenceEntryOf(signal);

  return {
    id: signal.id,
    symbol: snap.symbol,
    exchange: snap.exchange || 'NSE',
    direction: signal.direction,
    setup: signal.setup_family,
    status: signal.status || 'ACTIVE',
    price: snap.price || referenceEntry,
    entryZone: {
      low: signal.entry_low || referenceEntry * 0.9995,
      high: signal.entry_high || referenceEntry * 1.0005,
    },
    referenceEntry,
    stop: stopOf(signal),
    targets: snap.targets || { t1: signal.target_1 },
    confidence: snap.confidence,
    confidenceBand: snap.confidence_band || 'MEDIUM',
    createdAt: signal.created_at,
    expiresAt: snap.expires_at || new Date(Date.now() + 1800000).toISOString(),
    rationale: snap.rationale || 'Automated Strategy',
    metrics: snap.metrics || { relativeVolume: '1x', trendAlignment: 'Neutral', volatility: 'Normal', liquidity: 'High', riskReward: '1:2' },
    // Live exit (spec 0010); null while the plan is open.
    exitPrice: signal.exit_price === null || signal.exit_price === undefined ? null : Number(signal.exit_price),
    exitAt: signal.exit_at ?? null,
    exitReason: signal.exit_reason ?? null,
    // spec 0023: guru rule evidence (null for other strategies).
    guru: snap.guru ?? null,
    // spec 0025: entry news verdict (fixed at insert) and after entry verdict (only escalates).
    newsGate: signal.news_gate ?? null,
    newsGateReason: signal.news_gate_reason ?? null,
    newsGateItems: signal.news_gate_items ?? [],
    newsGateCheckedAt: signal.news_gate_checked_at ?? null,
    newsAfterGate: signal.news_after_gate ?? null,
    newsAfterReason: signal.news_after_reason ?? null,
    newsAfterItems: signal.news_after_items ?? [],
    newsAfterCheckedAt: signal.news_after_checked_at ?? null,
  };
}

export function referenceEntryOf(signal: any): number {
  const snap = signal.snapshot_json || {};
  return snap.reference_entry || signal.entry_low || 0;
}

export function stopOf(signal: any): number {
  const snap = signal.snapshot_json || {};
  return snap.stop?.level || referenceEntryOf(signal) * 0.99;
}

export function target1Of(signal: any): number | null {
  const snap = signal.snapshot_json || {};
  const t1 = signal.target_1 ?? snap.targets?.t1;
  if (typeof t1 === 'number') return t1;
  if (typeof t1?.level === 'number') return t1.level;
  return null;
}
