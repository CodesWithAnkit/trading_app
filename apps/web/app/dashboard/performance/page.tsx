"use client"

import * as React from "react"
import { MetricCard } from "@/components/domain/MetricCard"
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts"

const mockEquityData = [
  { date: "2023-10-01", equity: 100000 },
  { date: "2023-10-02", equity: 102500 },
  { date: "2023-10-03", equity: 101200 },
  { date: "2023-10-04", equity: 104000 },
  { date: "2023-10-05", equity: 103800 },
  { date: "2023-10-06", equity: 106000 },
  { date: "2023-10-07", equity: 108500 },
  { date: "2023-10-08", equity: 107200 },
  { date: "2023-10-09", equity: 109800 },
  { date: "2023-10-10", equity: 114500 },
]

export default function PerformancePage() {
  return (
    <div className="px-space-xl py-space-lg flex flex-col gap-space-lg max-w-[1720px] mx-auto w-full">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-space-md pb-space-xs border-b border-outline-variant/30">
        <div className="flex flex-col">
          <h1 className="font-headline-lg text-headline-lg text-on-surface tracking-tight flex items-center gap-space-xs">
            Performance Analytics
          </h1>
          <p className="font-body-sm text-body-sm text-on-surface-variant flex items-center gap-2 mt-0.5">
            Key metrics and historical trading performance
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-space-md">
        <MetricCard 
          title="TOTAL RETURN" 
          value="+₹14,500.00"
          highlightColor="secondary"
        />
        <MetricCard 
          title="PROFIT FACTOR" 
          value="2.4" 
          highlightColor="on-surface"
        />
        <MetricCard 
          title="WIN RATE (ALL TIME)" 
          value="64.2%" 
          highlightColor="on-surface"
        />
        <MetricCard 
          title="MAX DRAWDOWN" 
          value="-4.1%" 
          highlightColor="on-surface"
        />
      </div>

      <div className="bg-surface-container-lowest p-space-lg rounded-[10px] shadow-sm flex flex-col gap-space-md min-h-[400px]">
        <div className="flex items-center justify-between border-b border-outline-variant/30 pb-space-sm">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-primary text-[22px]">monitoring</span>
            <h2 className="font-headline-sm text-headline-sm text-on-surface tracking-tight">Equity Curve</h2>
          </div>
        </div>
        <div className="flex-1 w-full min-h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={mockEquityData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-outline-variant)" opacity={0.3} vertical={false} />
              <XAxis 
                dataKey="date" 
                tick={{ fill: 'var(--color-on-surface-variant)', fontSize: 12 }}
                tickLine={false}
                axisLine={false}
                tickFormatter={(val) => {
                  const d = new Date(val)
                  return `${d.getDate()} ${d.toLocaleString('default', { month: 'short' })}`
                }}
              />
              <YAxis 
                domain={['dataMin - 2000', 'dataMax + 2000']}
                tick={{ fill: 'var(--color-on-surface-variant)', fontSize: 12 }}
                tickLine={false}
                axisLine={false}
                tickFormatter={(val) => `₹${(val / 1000).toFixed(0)}k`}
              />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'var(--color-surface-container-high)', 
                  borderColor: 'var(--color-outline-variant)',
                  borderRadius: '8px',
                  color: 'var(--color-on-surface)'
                }}
                formatter={(value: any) => [`₹${value.toLocaleString()}`, 'Equity']}
                labelFormatter={(label) => new Date(label as string).toLocaleDateString()}
              />
              <Line 
                type="monotone" 
                dataKey="equity" 
                stroke="var(--color-primary)" 
                strokeWidth={3}
                dot={{ r: 4, fill: 'var(--color-surface)', stroke: 'var(--color-primary)', strokeWidth: 2 }}
                activeDot={{ r: 6, fill: 'var(--color-primary)', stroke: 'var(--color-surface)', strokeWidth: 2 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  )
}
