"use client"

import * as React from "react"
import { Sidebar } from "./Sidebar"
import { Topbar } from "./Topbar"
import { usePathname } from "next/navigation"

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Sidebar />
      <div className="pl-62">
        <Topbar />
        <main className="relative pt-14 bg-background min-h-screen">
          <div className="flex flex-col w-full">
            {children}
          </div>
        </main>
      </div>
    </>
  )
}
