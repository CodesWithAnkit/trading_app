// Live trade plan tracking (spec 0010).

export type ExitReason = 'TARGET' | 'STOP' | 'TIME';
export type ExitStatus = 'TARGET_HIT' | 'STOP_HIT' | 'TIME_EXIT';

export const EXIT_STATUS: Record<ExitReason, ExitStatus> = { TARGET: 'TARGET_HIT', STOP: 'STOP_HIT', TIME: 'TIME_EXIT' };

export type Plan = {
  /** Null while the signal insert is still in flight. */
  signalId: string | null;
  symbol: string;
  setup: string;
  direction: 'LONG' | 'SHORT';
  entry: number;
  stop: number;
  target: number;
  /** Start of the trigger candle (the signal's created_at). */
  firedAt: string;
};

/** Target or stop, or null if the price is between them (spec 0010 AC-2). */
export function checkExit(plan: Plan, price: number): Exclude<ExitReason, 'TIME'> | null {
  if (!(price > 0)) return null;
  if (plan.direction === 'SHORT') {
    if (price <= plan.target) return 'TARGET';
    if (price >= plan.stop) return 'STOP';
    return null;
  }
  if (price >= plan.target) return 'TARGET';
  if (price <= plan.stop) return 'STOP';
  return null;
}

export function pnlPct(plan: Plan, exitPrice: number): number {
  const raw = ((exitPrice - plan.entry) / plan.entry) * 100;
  return Math.round((plan.direction === 'SHORT' ? -raw : raw) * 100) / 100;
}

const keyOf = (symbol: string, setup: string) => `${symbol}|${setup}`;

/** Open plans, at most one per stock and strategy (spec 0010 AC-4). */
export class PlanBook {
  private readonly plans = new Map<string, Plan>();

  has(symbol: string, setup: string): boolean {
    return this.plans.has(keyOf(symbol, setup));
  }

  /** Claims the slot synchronously, before any await; false if one is already open. */
  reserve(plan: Plan): boolean {
    const key = keyOf(plan.symbol, plan.setup);
    if (this.plans.has(key)) return false;
    this.plans.set(key, plan);
    return true;
  }

  attach(symbol: string, setup: string, signalId: string) {
    const plan = this.plans.get(keyOf(symbol, setup));
    if (plan) plan.signalId = signalId;
  }

  release(symbol: string, setup: string) {
    this.plans.delete(keyOf(symbol, setup));
  }

  /** Removes and returns the plan, so it can only exit once. */
  take(symbol: string, setup: string): Plan | undefined {
    const key = keyOf(symbol, setup);
    const plan = this.plans.get(key);
    this.plans.delete(key);
    return plan;
  }

  openFor(symbol: string): Plan[] {
    return [...this.plans.values()].filter(p => p.symbol === symbol);
  }

  all(): Plan[] {
    return [...this.plans.values()];
  }

  clear() {
    this.plans.clear();
  }
}
