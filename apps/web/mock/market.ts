export type MarketState = "SIMULATED" | "LIVE" | "DELAYED" | "DISCONNECTED" | "STALE"

export const mockMarketState = {
  state: "SIMULATED" as MarketState,
  updatedAt: new Date().toISOString()
}
