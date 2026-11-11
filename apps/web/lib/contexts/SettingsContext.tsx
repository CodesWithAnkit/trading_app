"use client"

import React, { createContext, useContext, useState, useEffect } from "react"

/** Local UI settings only. Risk limits live in the API (spec 0028, `/api/v1/settings/risk`). */
export interface SettingsState {
  theme: "light" | "dark" | "system"
  brokerConnected: boolean
}

interface SettingsContextType extends SettingsState {
  updateSettings: (newSettings: Partial<SettingsState>) => void
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined)

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<SettingsState>({
    theme: "system",
    brokerConnected: true,
  })

  // In a real app we'd load this from localStorage here
  // For the facade, we'll just keep it in state

  const updateSettings = (newSettings: Partial<SettingsState>) => {
    setSettings((prev) => ({ ...prev, ...newSettings }))
  }

  return (
    <SettingsContext.Provider value={{ ...settings, updateSettings }}>
      {children}
    </SettingsContext.Provider>
  )
}

export function useSettings() {
  const context = useContext(SettingsContext)
  if (context === undefined) {
    throw new Error("useSettings must be used within a SettingsProvider")
  }
  return context
}
