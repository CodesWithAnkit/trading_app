"use client"
import * as React from "react"
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts"
import { 
  ShieldCheck, 
  TrendingUp, 
  Activity, 
  HelpCircle, 
  Layers, 
  ArrowUpRight, 
  CheckCircle2, 
  AlertTriangle 
} from "lucide-react"

const mockEquityData = [
  { date: "2024-09-01", equity: 100000, paper: 100000 },
  { date: "2024-09-05", equity: 102500, paper: 102100 },
  { date: "2024-09-10", equity: 101800, paper: 101500 },
  { date: "2024-09-15", equity: 104200, paper: 103800 },
  { date: "2024-09-20", equity: 105600, paper: 104900 },
  { date: "2024-09-25", equity: 108400, paper: 107200 },
  { date: "2024-10-01", equity: 107900, paper: 106800 },
  { date: "2024-10-05", equity: 110500, paper: 109200 },
  { date: "2024-10-10", equity: 112800, paper: 111400 },
  { date: "2024-10-14", equity: 114500, paper: 112800 },
]

export default function PerformancePage() {
  return (
    <div className="flex flex-col gap-margin w-full">
      {/* Top Banner / Hero */}
      <div className="bg-surface border border-border-subtle rounded-xl p-space-md shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-space-md">
        <div className="flex items-center gap-space-md">
          <div className="w-10 h-10 rounded-lg bg-surface-container flex items-center justify-center text-primary">
            <span className="material-symbols-outlined text-[24px]">fact_check</span>
          </div>
          <div>
            <div className="flex items-center gap-space-sm">
              <h1 className="font-headline-lg text-headline-lg font-bold text-text-primary tracking-tight">
                Performance Analytics & Model Validation
              </h1>
              <span className="px-2 py-0.5 rounded bg-status-live-bg text-status-live-text font-label-code text-label-code font-bold uppercase">
                Walk-Forward Verified
              </span>
            </div>
            <p className="font-body-xs text-body-xs text-text-secondary mt-0.5">
              Out-of-sample paper tracking, probability calibration, and transaction friction decomposition.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-space-sm">
          <span className="font-label-code text-label-code text-text-secondary">
            Brier Score: <strong className="text-accent-bullish">0.142 (Optimal)</strong>
          </span>
        </div>
      </div>

      {/* 4 Quantitative Validation Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-gutter">
        {/* Card 1: Win Rate & Expectancy */}
        <div className="bg-surface p-space-md rounded-xl border border-border-subtle flex flex-col justify-between shadow-sm">
          <div className="flex items-center justify-between pb-space-xs border-b border-border-subtle">
            <span className="font-label-code text-label-code text-text-secondary uppercase font-semibold">Realized Win Rate</span>
            <span className="font-label-code text-label-code text-status-live-text font-bold">SAMPLE: 24 TRADES</span>
          </div>
          <div className="py-space-sm flex flex-col gap-1.5">
            <div className="flex items-baseline justify-between">
              <span className="font-metric-lg text-metric-lg font-bold text-accent-bullish">62.5%</span>
              <span className="font-label-code text-label-code text-text-secondary">15 Win / 9 Loss</span>
            </div>
            <div className="w-full bg-surface-high h-2 rounded-full overflow-hidden flex">
              <div className="bg-accent-bullish h-full" style={{ width: "62.5%" }}></div>
              <div className="bg-accent-danger h-full" style={{ width: "37.5%" }}></div>
            </div>
            <div className="flex flex-col gap-1 pt-1 font-label-code text-label-code text-text-secondary">
              <div className="flex justify-between">
                <span>Paper Tracking (OOS):</span>
                <span className="font-semibold text-text-primary">58.4% (142 setups)</span>
              </div>
              <div className="flex justify-between">
                <span>Backtest (6-Month):</span>
                <span className="font-semibold text-text-primary">56.1% (840 setups)</span>
              </div>
            </div>
          </div>
          <div className="pt-space-xs border-t border-border-subtle flex items-center justify-between font-label-code text-body-xs text-text-secondary">
            <span>R:R Net Realized:</span>
            <span className="font-bold text-accent-bullish">1 : 1.82 Avg</span>
          </div>
        </div>

        {/* Card 2: Net Expectancy */}
        <div className="bg-surface p-space-md rounded-xl border border-border-subtle flex flex-col justify-between shadow-sm">
          <div className="flex items-center justify-between pb-space-xs border-b border-border-subtle">
            <span className="font-label-code text-label-code text-text-secondary uppercase font-semibold">Net Expectancy / Setup</span>
            <span className="px-1.5 py-0.5 rounded bg-surface-container text-primary font-label-code text-[10px] font-bold">POST-CHARGES</span>
          </div>
          <div className="py-space-sm flex flex-col gap-1.5">
            <div className="flex items-baseline justify-between">
              <span className="font-metric-lg text-metric-lg font-bold text-primary">+₹382.50</span>
              <span className="font-label-code text-label-code text-accent-bullish font-semibold">▲ Alpha Edge</span>
            </div>
            <div className="flex flex-col gap-1 font-label-code text-label-code text-text-secondary">
              <div className="flex justify-between">
                <span>Paper OOS:</span>
                <span className="font-semibold text-status-live-text">+₹294.10 / trade</span>
              </div>
              <div className="flex justify-between">
                <span>Backtest:</span>
                <span className="font-semibold text-text-primary">+₹218.40 / trade</span>
              </div>
              <div className="flex justify-between text-body-xs">
                <span>Slippage Drag:</span>
                <span className="text-accent-danger font-medium">-23.1% delta</span>
              </div>
            </div>
          </div>
          <div className="pt-space-xs border-t border-border-subtle flex items-center justify-between font-label-code text-body-xs text-text-secondary">
            <span>Per Tranche:</span>
            <span className="font-semibold text-text-primary">₹1,00,000 basis</span>
          </div>
        </div>

        {/* Card 3: Profit Factor & Drawdown */}
        <div className="bg-surface p-space-md rounded-xl border border-border-subtle flex flex-col justify-between shadow-sm">
          <div className="flex items-center justify-between pb-space-xs border-b border-border-subtle">
            <span className="font-label-code text-label-code text-text-secondary uppercase font-semibold">Profit Factor & Drawdown</span>
            <span className="px-1.5 py-0.5 rounded bg-status-live-bg text-status-live-text font-label-code text-[10px] font-bold">ROBUST</span>
          </div>
          <div className="py-space-sm flex flex-col gap-1.5">
            <div className="flex items-baseline justify-between">
              <span className="font-metric-lg text-metric-lg font-bold text-text-primary">1.84 PF</span>
              <span className="font-label-code text-label-code text-accent-danger font-bold">-4.2% Max DD</span>
            </div>
            <div className="flex flex-col gap-1 font-label-code text-label-code text-text-secondary">
              <div className="flex justify-between">
                <span>Manual vs Paper PF:</span>
                <span className="font-semibold text-text-primary">1.84 vs 1.62</span>
              </div>
              <div className="flex justify-between">
                <span>6M Backtest PF:</span>
                <span className="font-semibold text-text-primary">1.48 (Validated)</span>
              </div>
              <div className="flex justify-between">
                <span>Peak-to-Trough:</span>
                <span className="text-accent-danger font-semibold">₹4,200</span>
              </div>
            </div>
          </div>
          <div className="pt-space-xs border-t border-border-subtle flex items-center justify-between font-label-code text-body-xs text-text-secondary">
            <span>Recovery Factor:</span>
            <span className="font-bold text-text-primary">3.24x</span>
          </div>
        </div>

        {/* Card 4: Friction Decomposition */}
        <div className="bg-surface p-space-md rounded-xl border border-border-subtle flex flex-col justify-between shadow-sm">
          <div className="flex items-center justify-between pb-space-xs border-b border-border-subtle">
            <span className="font-label-code text-label-code text-text-secondary uppercase font-semibold">Friction / Cost Impact</span>
            <span className="px-1.5 py-0.5 rounded bg-status-stale-bg text-status-stale-text font-label-code text-[10px] font-bold">FR-20 AUDIT</span>
          </div>
          <div className="py-space-sm flex flex-col gap-1.5">
            <div className="flex items-baseline justify-between">
              <span className="font-metric-lg text-metric-lg font-bold text-accent-bearish">-18.4%</span>
              <span className="font-label-code text-label-code text-text-secondary">Gross to Net Drag</span>
            </div>
            <div className="w-full bg-surface-high h-2 rounded-full overflow-hidden flex">
              <div className="bg-primary h-full" style={{ width: "81.6%" }}></div>
              <div className="bg-status-stale-text h-full" style={{ width: "18.4%" }}></div>
            </div>
            <div className="flex flex-col gap-1 font-label-code text-label-code text-text-secondary">
              <div className="flex justify-between">
                <span>Brokerage + STT (NSE):</span>
                <span className="font-semibold text-text-primary">9.2%</span>
              </div>
              <div className="flex justify-between">
                <span>Simulated Slippage:</span>
                <span className="font-semibold text-text-primary">9.2%</span>
              </div>
            </div>
          </div>
          <div className="pt-space-xs border-t border-border-subtle flex items-center justify-between font-label-code text-body-xs text-text-secondary">
            <span>Break-Even Win Rate:</span>
            <span className="font-bold text-text-primary">48.2%</span>
          </div>
        </div>
      </div>

      {/* Equity Curve & Walk-Forward Charts */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-gutter items-start">
        {/* Equity Curve (Cols 1-8) */}
        <div className="xl:col-span-8 bg-surface rounded-xl border border-border-subtle p-space-md shadow-sm flex flex-col gap-space-md">
          <div className="flex items-center justify-between pb-space-xs border-b border-border-subtle">
            <div className="flex items-center gap-space-xs">
              <TrendingUp className="w-4 h-4 text-primary" />
              <h2 className="font-headline-sm text-headline-sm font-bold text-text-primary">
                Cumulative Realized vs Paper Equity Curve
              </h2>
            </div>
            <div className="flex items-center gap-3 font-label-code text-label-code">
              <div className="flex items-center gap-1">
                <span className="w-2.5 h-0.5 bg-primary"></span>
                <span>Manual Journal (+₹14.5k)</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="w-2.5 h-0.5 bg-status-live-text"></span>
                <span>Paper OOS (+₹12.8k)</span>
              </div>
            </div>
          </div>

          <div className="w-full h-80">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={mockEquityData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" opacity={0.6} vertical={false} />
                <XAxis 
                  dataKey="date" 
                  tick={{ fill: '#5E6C80', fontSize: 11 }}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={val => {
                    const d = new Date(val)
                    return `${d.getDate()} ${d.toLocaleString('default', { month: 'short' })}`
                  }}
                />
                <YAxis 
                  domain={['dataMin - 1000', 'dataMax + 1000']}
                  tick={{ fill: '#5E6C80', fontSize: 11 }}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={val => `₹${(val / 1000).toFixed(0)}k`}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#FFFFFF', 
                    borderColor: '#CBD5E1',
                    borderRadius: '8px',
                    color: '#132238'
                  }}
                  formatter={(val: any, name: any) => [`₹${Number(val).toLocaleString()}`, name === 'equity' ? 'Manual Realized' : 'Paper OOS']}
                />
                <Line 
                  type="monotone" 
                  dataKey="equity" 
                  stroke="#0037b0" 
                  strokeWidth={2.5}
                  dot={{ r: 3, fill: '#0037b0' }}
                />
                <Line 
                  type="monotone" 
                  dataKey="paper" 
                  stroke="#047857" 
                  strokeWidth={2}
                  strokeDasharray="4 4"
                  dot={{ r: 2, fill: '#047857' }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Confidence Probability Calibration (Cols 9-12) */}
        <div className="xl:col-span-4 bg-surface rounded-xl border border-border-subtle p-space-md shadow-sm flex flex-col gap-space-md">
          <div className="flex items-center justify-between pb-space-xs border-b border-border-subtle">
            <div className="flex items-center gap-space-xs">
              <Activity className="w-4 h-4 text-primary" />
              <h3 className="font-headline-sm text-headline-sm font-bold text-text-primary">
                Probability Calibration
              </h3>
            </div>
            <span className="font-label-code text-body-xs text-accent-bullish font-bold bg-status-live-bg px-1.5 py-0.5 rounded">
              0.142 Brier
            </span>
          </div>

          <p className="font-body-xs text-body-xs text-text-secondary">
            Compares algorithmic predicted confidence bucket vs actual empirical target hit frequency (FR-18).
          </p>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse font-label-code text-label-code">
              <thead>
                <tr className="bg-surface-container-low text-text-secondary uppercase">
                  <th className="py-2 px-2">Score Bucket</th>
                  <th className="py-2 px-2 text-right">Hit Rate</th>
                  <th className="py-2 px-2 text-right">Samples</th>
                  <th className="py-2 px-2 text-right">Delta</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-subtle">
                <tr>
                  <td className="py-2 px-2 font-bold text-accent-bullish">80 - 100 (High)</td>
                  <td className="py-2 px-2 text-right font-bold text-text-primary">78.4%</td>
                  <td className="py-2 px-2 text-right text-text-secondary">42</td>
                  <td className="py-2 px-2 text-right text-status-live-text font-semibold">-1.6%</td>
                </tr>
                <tr>
                  <td className="py-2 px-2 font-bold text-primary">60 - 79 (Good)</td>
                  <td className="py-2 px-2 text-right font-bold text-text-primary">64.1%</td>
                  <td className="py-2 px-2 text-right text-text-secondary">78</td>
                  <td className="py-2 px-2 text-right text-status-live-text font-semibold">+4.1%</td>
                </tr>
                <tr>
                  <td className="py-2 px-2 font-bold text-accent-bearish">40 - 59 (Marginal)</td>
                  <td className="py-2 px-2 text-right font-bold text-text-primary">48.2%</td>
                  <td className="py-2 px-2 text-right text-text-secondary">31</td>
                  <td className="py-2 px-2 text-right text-accent-bearish font-semibold">-1.8%</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="p-space-sm bg-surface-container-low rounded-lg text-[11px] text-text-secondary font-body-xs border border-border-subtle">
            Brier score below 0.18 indicates exceptional probabilistic calibration without overconfidence bias.
          </div>
        </div>
      </div>
    </div>
  )
}
