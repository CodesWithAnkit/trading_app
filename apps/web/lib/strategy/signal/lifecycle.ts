import { SignalSnapshot, SignalLifecycleState } from "./signalSnapshot";

export type TransitionResult = {
  success: boolean;
  newState: SignalLifecycleState;
  reason?: string;
};

export function transitionSignal(
  signal: SignalSnapshot,
  action: "ACTIVATE" | "INVALIDATE" | "EXPIRE" | "SKIP" | "ENTER",
  reason?: string
): TransitionResult {
  const current = signal.state;

  if (action === "ACTIVATE" && current === "CANDIDATE") {
    signal.state = "ACTIVE";
    return { success: true, newState: "ACTIVE" };
  }

  if (current !== "ACTIVE" && current !== "CANDIDATE") {
    return { success: false, newState: current, reason: "Signal is no longer active" };
  }

  switch (action) {
    case "INVALIDATE":
      signal.state = "INVALIDATED";
      return { success: true, newState: "INVALIDATED", reason };
    case "EXPIRE":
      signal.state = "EXPIRED";
      return { success: true, newState: "EXPIRED", reason };
    case "SKIP":
      signal.state = "SKIPPED";
      return { success: true, newState: "SKIPPED", reason };
    case "ENTER":
      signal.state = "ENTERED";
      return { success: true, newState: "ENTERED", reason };
    default:
      return { success: false, newState: current, reason: "Invalid transition" };
  }
}
