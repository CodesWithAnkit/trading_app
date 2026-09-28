import * as React from "react"
import { mockMarketState } from "@/mock/market"

export function Topbar() {
  return (
    <header className="fixed top-0 left-62 right-0 h-14 bg-surface-container-lowest/90 backdrop-blur-md border-b border-outline-variant/40 z-40 px-space-lg flex items-center justify-between gap-space-md">
      <div className="flex items-center gap-space-md min-w-0">
        <div className="flex items-center gap-2 px-space-sm py-1 rounded bg-secondary-fixed/30 border border-secondary-fixed">
          <span className="flex h-2 w-2 relative">
            <span className="relative inline-flex rounded-full h-2 w-2 bg-secondary"></span>
          </span>
          <span className="font-label-caps text-label-caps text-secondary font-bold uppercase tracking-wider">
            SIMULATED
          </span>
          <span className="font-label-numeric-sm text-label-numeric-sm text-on-surface border-l border-outline-variant/40 pl-2">
            IST 11:24:08 AM
          </span>
          <span className="font-label-numeric-sm text-label-numeric-sm text-on-surface-variant">
            · Market data is simulated · Updated 2s ago
          </span>
        </div>
        <div className="relative w-72 lg:w-96">
          <span className="material-symbols-outlined absolute left-2.5 top-1/2 -translate-y-1/2 text-outline text-[18px]">
            search
          </span>
          <input
            className="w-full h-8 pl-8 pr-8 rounded bg-surface border border-outline-variant/50 font-body-sm text-body-sm text-on-surface placeholder:text-outline focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20"
            placeholder="Search NSE cash (e.g. RELIANCE, HDFCBANK)..."
            type="text"
          />
          <kbd className="absolute right-2 top-1/2 -translate-y-1/2 px-1.5 py-0.5 text-[10px] font-label-numeric-sm text-on-surface-variant bg-surface-container border border-outline-variant/40 rounded">
            ⌘K
          </kbd>
        </div>
      </div>
      <div className="flex items-center gap-space-md shrink-0">
        <button className="relative p-1.5 rounded-lg text-on-surface-variant hover:bg-surface-container hover:text-on-surface transition-colors">
          <span className="material-symbols-outlined text-[20px]">notifications</span>
          <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-error ring-2 ring-surface-container-lowest"></span>
        </button>
        <div className="h-4 w-px bg-outline-variant/40"></div>
        <div className="flex items-center gap-space-sm">
          <img
            alt="Profile"
            className="w-8 h-8 rounded-full object-cover ring-1 ring-outline-variant/40"
            src="https://lh3.googleusercontent.com/aida-public/AB6AXuAwnqcbM0hYSSkxrEym_0ya38soh7OTs3LYBkI0SHvd0fuIvGgwtxIycRh5a7sUjUptUmlYFLcqnkQqYxjHWTA9zd5RJ9SMc4Q0lJL-tGYaX64OqehqOkokPLyrbmC3skSuG5QlJxlDnOlR5C6AGp40rSn11eIzQPH7SuikO_qvaFBg9CUfZYPqS7YwdpqwelEoypoPc0fKICOPL5sWKg4lk-of1k0EPACOse1OPAyE93Frw2nbGP5f"
          />
          <div className="flex flex-col text-left leading-tight">
            <span className="font-body-sm text-body-sm font-semibold text-on-surface truncate">
              Ankit Sharma
            </span>
            <span className="font-label-caps text-label-caps text-on-surface-variant uppercase">
              Intraday Equity
            </span>
          </div>
        </div>
      </div>
    </header>
  )
}
