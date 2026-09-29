import { SignalSnapshot } from './signalSnapshot.js';
import crypto from "crypto";

export function generateSignalIdentity(signal: SignalSnapshot): string {
  const parts = [
    signal.symbol,
    signal.direction,
    signal.setupFamily,
    signal.strategyVersion,
    signal.referenceEntry.toFixed(4)
  ];
  const identityString = parts.join("|");
  return crypto.createHash("sha256").update(identityString).digest("hex");
}

export function isDuplicate(
  newSignal: SignalSnapshot,
  activeSignals: SignalSnapshot[],
  // cooldown_minutes could be pulled from strategy config in a real implementation
  cooldown_minutes: number | null
): boolean {
  if (cooldown_minutes === null) {
    // If cooldown is unresolved, assume no deduplication or report config incomplete in higher layer
    return false;
  }

  const newIdentity = generateSignalIdentity(newSignal);
  const newTime = new Date(newSignal.createdAt).getTime();

  for (const active of activeSignals) {
    const activeIdentity = generateSignalIdentity(active);
    if (activeIdentity === newIdentity) {
      const activeTime = new Date(active.createdAt).getTime();
      const minutesSince = (newTime - activeTime) / 60000;
      if (minutesSince < cooldown_minutes) {
        return true;
      }
    }
  }

  return false;
}
