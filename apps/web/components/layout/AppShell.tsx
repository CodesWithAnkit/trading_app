"use client"

import * as React from "react"
import { Sidebar } from "./Sidebar"
import { Topbar } from "./Topbar"
import { BottomNav } from "./BottomNav"

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-background font-body-md text-on-surface antialiased min-h-screen w-full">
      <Sidebar />
      <div className="lg:pl-[248px]">
        <Topbar />
        <main className="relative pt-14 bg-background min-h-screen">
          <div className="flex flex-col w-full pb-24 lg:pb-0">
            {children}
          </div>
        </main>
      </div>
      <BottomNav />
    </div>
  )
}
