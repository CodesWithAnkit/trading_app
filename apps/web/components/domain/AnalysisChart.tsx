"use client"
import * as React from "react"
import { createChart, ColorType, IChartApi, ISeriesApi, CandlestickData, HistogramData, CandlestickSeries, HistogramSeries } from "lightweight-charts"
import { useSignals } from "@/lib/contexts/SignalContext"
import type { Signal } from "@/mock/signals"

function useAnalysisChart(symbol: string, signal: Signal) {
  const chartContainerRef = React.useRef<HTMLDivElement>(null)
  const chartRef = React.useRef<IChartApi | null>(null)
  const candlestickSeriesRef = React.useRef<ISeriesApi<"Candlestick"> | null>(null)
  const volumeSeriesRef = React.useRef<ISeriesApi<"Histogram"> | null>(null)
  
  const { activeSignals } = useSignals()
  const liveSignal = activeSignals.find(s => s.symbol === symbol) ?? signal

  const [loading, setLoading] = React.useState(true)

  React.useEffect(() => {
    let cancelled = false
    const fetchCandles = async () => {
      setLoading(true)
      try {
        const timeframe = signal.setup === "Scalping" ? "1m" : "5m"
        const res = await fetch(`/api/v1/candles?symbol=${encodeURIComponent(symbol)}&timeframe=${timeframe}&limit=100`)
        if (res.ok && !cancelled) {
          const json = await res.json()
          const sorted = (json.data || []).sort((a: any, b: any) => 
            new Date(a.start_time ?? a.timestamp).getTime() - new Date(b.start_time ?? b.timestamp).getTime()
          )

          const cData: CandlestickData[] = sorted.map((c: any) => ({
            time: Math.floor(new Date(c.start_time ?? c.timestamp).getTime() / 1000) as any,
            open: c.open,
            high: c.high,
            low: c.low,
            close: c.close
          }))

          const vData: HistogramData[] = sorted.map((c: any) => ({
            time: Math.floor(new Date(c.start_time ?? c.timestamp).getTime() / 1000) as any,
            value: c.volume,
            color: c.close >= c.open ? "rgba(74, 222, 128, 0.3)" : "rgba(248, 113, 113, 0.3)"
          }))

          if (chartContainerRef.current) {
            const chart = createChart(chartContainerRef.current, {
              layout: {
                background: { type: ColorType.Solid, color: "transparent" },
                textColor: "#a1a1aa",
              },
              grid: {
                vertLines: { color: "rgba(161, 161, 170, 0.1)" },
                horzLines: { color: "rgba(161, 161, 170, 0.1)" },
              },
              timeScale: {
                timeVisible: true,
                secondsVisible: false,
              },
              width: chartContainerRef.current.clientWidth,
              height: chartContainerRef.current.clientHeight,
            })

            const candlestickSeries = chart.addSeries(CandlestickSeries, {
              upColor: "#4ade80",
              downColor: "#f87171",
              borderVisible: false,
              wickUpColor: "#4ade80",
              wickDownColor: "#f87171",
            })
            candlestickSeries.setData(cData)

            const volumeSeries = chart.addSeries(HistogramSeries, {
              priceFormat: {
                type: "volume",
              },
              priceScaleId: "", // set as an overlay
            })
            volumeSeries.priceScale().applyOptions({
              scaleMargins: {
                top: 0.8, // highest point of the series will be at 80% of the price scale
                bottom: 0,
              },
            })
            volumeSeries.setData(vData)

            // Price lines
            candlestickSeries.createPriceLine({
              price: signal.entryZone.low,
              color: "#3b82f6",
              lineWidth: 2,
              lineStyle: 2,
              axisLabelVisible: true,
              title: "Entry",
            })
            candlestickSeries.createPriceLine({
              price: signal.stop,
              color: "#ef4444",
              lineWidth: 2,
              lineStyle: 2,
              axisLabelVisible: true,
              title: "Stop",
            })
            if (signal.targets?.t1) {
              candlestickSeries.createPriceLine({
                price: signal.targets.t1,
                color: "#10b981",
                lineWidth: 2,
                lineStyle: 2,
                axisLabelVisible: true,
                title: "Target 1",
              })
            }
            if (signal.targets?.t2) {
              candlestickSeries.createPriceLine({
                price: signal.targets.t2,
                color: "#059669",
                lineWidth: 1,
                lineStyle: 3,
                axisLabelVisible: true,
                title: "Target 2",
              })
            }

            chart.timeScale().fitContent()

            chartRef.current = chart
            candlestickSeriesRef.current = candlestickSeries
            volumeSeriesRef.current = volumeSeries
          }
        }
      } catch (err) {
        console.error(err)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    
    fetchCandles()

    return () => {
      cancelled = true
      if (chartRef.current) {
        chartRef.current.remove()
        chartRef.current = null
      }
    }
  }, [symbol, signal])

  // Live update handling via SignalContext
  React.useEffect(() => {
    if (!chartRef.current || !candlestickSeriesRef.current || !liveSignal?.price || loading) return

    // Since we don't have the exact tick time from the signal (it's just a snapshot),
    // and we don't want to mess up the 5m candle aggregation on the client naively,
    // we just let the SSE re-fetch or we assume the backend handles it.
  }, [liveSignal?.price, loading])

  // Responsive resize
  React.useEffect(() => {
    const handleResize = () => {
      if (chartContainerRef.current && chartRef.current) {
        chartRef.current.applyOptions({
          width: chartContainerRef.current.clientWidth,
          height: chartContainerRef.current.clientHeight,
        })
      }
    }
    window.addEventListener("resize", handleResize)
    return () => window.removeEventListener("resize", handleResize)
  }, [])

  return { chartContainerRef, loading }
}

export function AnalysisChart({ symbol, signal }: { symbol: string, signal: Signal }) {
  const { chartContainerRef, loading } = useAnalysisChart(symbol, signal)

  return (
    <div className="bg-surface-container-low rounded-xl p-6 shadow-sm border border-outline-variant/30 min-h-100 flex flex-col relative w-full h-full">
      {loading && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-surface-container-low/80 backdrop-blur-sm rounded-xl animate-pulse">
          <span className="text-on-surface-variant font-bold text-sm tracking-wider uppercase">Loading Chart...</span>
        </div>
      )}
      <div ref={chartContainerRef} className="w-full h-100" />
    </div>
  )
}
