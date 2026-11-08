// Cost model v1 (spec 0020). One index futures contract round trip.
// Rates carry an as_of date: a rate change means a new cost model version, never an edit.

export type Exchange = 'NSE' | 'BSE';

export const COST_MODEL_V1 = {
  version: 'v1',
  asOf: '2026-11-06',
  brokeragePerOrder: 20,
  sttSellPct: 0.02 / 100,
  exchangeTxnPct: { NSE: 0.00173 / 100, BSE: 0.00325 / 100 } as Record<Exchange, number>,
  sebiPerCrore: 10,
  gstPct: 18 / 100,
  stampBuyPct: 0.002 / 100,
  /** Slippage in index points per side, applied in the fill price only (never in cost_r). */
  slippagePoints: { NIFTY: 1, SENSEX: 3 } as Record<string, number>,
} as const;

export type CostModel = typeof COST_MODEL_V1;

/** Total rupee charges for one round trip of `lot` units. */
export function roundTripCharges(
  model: CostModel,
  exchange: Exchange,
  buyPrice: number,
  sellPrice: number,
  lot: number,
): number {
  const buyTurnover = buyPrice * lot;
  const sellTurnover = sellPrice * lot;
  const turnover = buyTurnover + sellTurnover;
  const brokerage = model.brokeragePerOrder * 2;
  const stt = sellTurnover * model.sttSellPct;
  const exchangeCharges = turnover * model.exchangeTxnPct[exchange];
  const sebi = (turnover / 1e7) * model.sebiPerCrore;
  const gst = (brokerage + exchangeCharges) * model.gstPct;
  const stamp = buyTurnover * model.stampBuyPct;
  return brokerage + stt + exchangeCharges + sebi + gst + stamp;
}

/** cost_r = total rupee charges / (R in points x lot size). */
export function costInR(charges: number, riskPoints: number, lot: number): number {
  if (riskPoints <= 0 || lot <= 0) return 0;
  return charges / (riskPoints * lot);
}
