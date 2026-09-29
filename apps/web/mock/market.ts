export type MarketState = "SIMULATED" | "LIVE" | "DELAYED" | "DISCONNECTED"

export const mockMarketState = {
  state: "SIMULATED" as MarketState,
  updatedAt: new Date().toISOString()
}
