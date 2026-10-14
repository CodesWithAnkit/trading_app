"use client"
import * as React from "react"
import { ComposedChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts"

export function CandlestickChart({ data, timeframe, signal }: { data: any[], timeframe: string, signal?: any }) {
  if (!data || data.length === 0) {
    return (
      <div className="w-full h-[400px] flex items-center justify-center border border-border rounded-lg bg-surface-muted/30">
        <span className="text-sm text-text-muted">No candle data available for {timeframe}</span>
      </div>
    )
  }

  const minLow = Math.min(...data.map(d => d.low))
  const maxHigh = Math.max(...data.map(d => d.high))
  const yPadding = (maxHigh - minLow) * 0.1

  // Format data for simple Recharts display
  // We'll use a thin bar for high/low and a thicker bar for open/close
  const chartData = data.map(d => ({
    ...d,
    // The candles API returns `start_time`; `timestamp` is kept as a fallback for older data.
    timeLabel: new Date(d.start_time ?? d.timestamp).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Kolkata' }),
    range: [d.low, d.high],
    body: [Math.min(d.open, d.close), Math.max(d.open, d.close)],
    isUp: d.close > d.open
  }))

  return (
    <div className="w-full h-[400px] flex flex-col bg-surface rounded-lg border border-border p-4 relative overflow-hidden">
      
      {signal && (
        <div className="absolute right-0 top-0 bottom-0 w-24 border-l border-border bg-surface/50 backdrop-blur-sm flex flex-col justify-between py-12 px-2 text-[10px] font-mono text-right z-10 pointer-events-none">
          {signal.targets.t2 && <div className="text-text-muted">T2 ₹{signal.targets.t2.toFixed(2)}</div>}
          <div className="text-long font-medium">T1 ₹{signal.targets.t1.toFixed(2)}</div>
          <div className="text-primary font-medium border-t border-primary border-dashed pt-1 mt-1">
            Entry ₹{signal.entryZone.low.toFixed(2)}
          </div>
          <div className="text-text-muted">LTP ₹{signal.price.toFixed(2)}</div>
          <div className="text-risk font-medium border-t border-risk border-dashed pt-1 mt-1">Stop ₹{signal.stop.toFixed(2)}</div>
        </div>
      )}

      <ResponsiveContainer width="100%" height="80%">
        <ComposedChart data={chartData} margin={{ top: 10, right: signal ? 96 : 30, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#2a2a2a" vertical={false} />
          <XAxis 
            dataKey="timeLabel" 
            stroke="#555" 
            tick={{ fontSize: 10, fill: '#888' }}
            minTickGap={30}
          />
          <YAxis 
            yAxisId="price"
            domain={[minLow - yPadding, maxHigh + yPadding]}
            orientation="right"
            stroke="#555"
            tick={{ fontSize: 10, fill: '#888' }}
            tickFormatter={(val) => val.toFixed(2)}
          />
          <Tooltip 
            contentStyle={{ backgroundColor: '#1e1e1e', borderColor: '#333', fontSize: '12px', color: '#fff' }}
            itemStyle={{ color: '#ccc' }}
          />
          
          <Bar yAxisId="price" dataKey="range" barSize={2} isAnimationActive={false}>
            {chartData.map((entry, index) => (
              <Cell key={`range-${index}`} fill={entry.isUp ? '#4ade80' : '#f87171'} />
            ))}
          </Bar>
          <Bar yAxisId="price" dataKey="body" barSize={8} isAnimationActive={false}>
            {chartData.map((entry, index) => (
              <Cell key={`body-${index}`} fill={entry.isUp ? '#4ade80' : '#f87171'} />
            ))}
          </Bar>
        </ComposedChart>
      </ResponsiveContainer>
      
      {/* Volume Chart */}
      <ResponsiveContainer width="100%" height="20%">
        <ComposedChart data={chartData} margin={{ top: 0, right: signal ? 96 : 30, left: 0, bottom: 0 }}>
          <XAxis dataKey="timeLabel" hide />
          <YAxis yAxisId="vol" orientation="right" hide />
          <Tooltip 
            contentStyle={{ backgroundColor: '#1e1e1e', borderColor: '#333', fontSize: '10px', color: '#fff' }}
            cursor={{ fill: '#333' }}
          />
          <Bar yAxisId="vol" dataKey="volume" barSize={8} isAnimationActive={false}>
            {chartData.map((entry, index) => (
              <Cell key={`vol-${index}`} fill={entry.isUp ? '#4ade80' : '#f87171'} opacity={0.3} />
            ))}
          </Bar>
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  )
}
