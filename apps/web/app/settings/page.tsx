"use client"

import * as React from "react"
import { useSettings } from "@/lib/contexts/SettingsContext"

export default function SettingsPage() {
  const { dailyRiskBudget, theme, brokerConnected, updateSettings } = useSettings()

  return (
    <div className="px-space-xl py-space-lg flex flex-col gap-space-lg max-w-[1720px] mx-auto w-full">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-space-md pb-space-xs border-b border-outline-variant/30">
        <div className="flex flex-col">
          <h1 className="font-headline-lg text-headline-lg text-on-surface tracking-tight flex items-center gap-space-xs">
            Settings
          </h1>
          <p className="font-body-sm text-body-sm text-on-surface-variant flex items-center gap-2 mt-0.5">
            Manage your application preferences
          </p>
        </div>
      </div>

      <div className="bg-surface-container-lowest border border-outline-variant/40 rounded-xl p-space-lg shadow-sm max-w-2xl">
        <h2 className="font-headline-sm text-headline-sm text-on-surface mb-space-md">Preferences</h2>
        <div className="space-y-6 font-body-sm text-body-sm">
          <div className="flex justify-between items-center pb-4 border-b border-outline-variant/30">
            <div className="flex flex-col">
              <span className="font-semibold text-on-surface text-body-md">Daily Risk Budget (₹)</span>
              <span className="text-on-surface-variant text-body-sm">Maximum loss allowed per day before trading is blocked</span>
            </div>
            <input
              type="number"
              value={dailyRiskBudget}
              onChange={(e) => updateSettings({ dailyRiskBudget: Number(e.target.value) })}
              className="bg-surface-container border border-outline/50 rounded-md px-3 py-1.5 text-on-surface w-32 text-right focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
            />
          </div>
          
          <div className="flex justify-between items-center pb-4 border-b border-outline-variant/30">
            <div className="flex flex-col">
              <span className="font-semibold text-on-surface text-body-md">Theme</span>
              <span className="text-on-surface-variant text-body-sm">Application visual appearance</span>
            </div>
            <select
              value={theme}
              onChange={(e) => updateSettings({ theme: e.target.value as "light" | "dark" | "system" })}
              className="bg-surface-container border border-outline/50 rounded-md px-3 py-1.5 text-on-surface w-32 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
            >
              <option value="system">System</option>
              <option value="light">Light</option>
              <option value="dark">Dark</option>
            </select>
          </div>
          
          <div className="flex justify-between items-center pb-4">
            <div className="flex flex-col">
              <span className="font-semibold text-on-surface text-body-md">Broker Connection</span>
              <span className="text-on-surface-variant text-body-sm">Toggle mock broker connection status</span>
            </div>
            <button
              onClick={() => updateSettings({ brokerConnected: !brokerConnected })}
              className={`px-4 py-1.5 rounded-md font-medium transition-colors ${
                brokerConnected 
                  ? "bg-primary text-on-primary hover:bg-primary/90" 
                  : "bg-surface-container-high text-on-surface hover:bg-surface-container-highest"
              }`}
            >
              {brokerConnected ? "Connected" : "Disconnected"}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
