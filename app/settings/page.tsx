"use client"

import * as React from "react"

export default function SettingsPage() {
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

      <div className="bg-surface-container-lowest border border-outline-variant/40 rounded-xl p-space-lg shadow-sm">
        <h2 className="font-headline-sm text-headline-sm text-on-surface mb-space-md">Preferences</h2>
        <div className="space-y-4 font-body-sm text-body-sm">
          <div className="flex justify-between items-center py-2 border-b border-outline-variant/30">
            <span className="font-semibold text-on-surface">Theme</span>
            <span className="text-on-surface-variant">System (Default)</span>
          </div>
          <div className="flex justify-between items-center py-2 border-b border-outline-variant/30">
            <span className="font-semibold text-on-surface">Risk Budget</span>
            <span className="text-on-surface-variant">₹3,000</span>
          </div>
          <div className="flex justify-between items-center py-2 border-b border-outline-variant/30">
            <span className="font-semibold text-on-surface">Default Quantity</span>
            <span className="text-on-surface-variant">100</span>
          </div>
          <div className="flex justify-between items-center py-2">
            <span className="font-semibold text-on-surface">Notifications</span>
            <span className="text-on-surface-variant">Enabled</span>
          </div>
        </div>
      </div>
    </div>
  )
}
