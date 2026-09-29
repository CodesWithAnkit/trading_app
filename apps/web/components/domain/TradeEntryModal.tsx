import * as React from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { type Signal } from "@/mock/signals"
import { ArrowUpRight, ArrowDownRight, AlertTriangle } from "lucide-react"

interface TradeEntryModalProps {
  signal: Signal | null
  isOpen: boolean
  onClose: () => void
  onSubmit: (quantity: number, entryPrice: number) => void
  onValidateRisk?: (quantity: number) => { valid: boolean; calculatedRisk: number; safeQuantity: number }
}

export function TradeEntryModal({ signal, isOpen, onClose, onSubmit, onValidateRisk }: TradeEntryModalProps) {
  const [quantity, setQuantity] = React.useState<string>("100")
  const [entryPrice, setEntryPrice] = React.useState<string>("")
  const [riskError, setRiskError] = React.useState<{ calculatedRisk: number; safeQuantity: number } | null>(null)

  React.useEffect(() => {
    if (isOpen && signal) {
      setEntryPrice(signal.price.toFixed(2))
      setRiskError(null)
    }
  }, [isOpen, signal])

  if (!signal) return null

  const handleConfirm = () => {
    const qty = parseInt(quantity, 10)
    const price = parseFloat(entryPrice)
    
    if (onValidateRisk) {
      const validation = onValidateRisk(qty)
      if (!validation.valid) {
        setRiskError({ calculatedRisk: validation.calculatedRisk, safeQuantity: validation.safeQuantity })
        return
      }
    }
    
    onSubmit(qty, price)
    onClose()
  }

  const handleAdjustQuantity = () => {
    if (riskError) {
      setQuantity(riskError.safeQuantity.toString())
      setRiskError(null)
    }
  }

  const isLong = signal.direction === "LONG"

  if (riskError) {
    return (
      <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
        <DialogContent className="sm:max-w-md bg-surface border-border text-text">
          <DialogHeader>
            <DialogTitle className="text-risk flex items-center gap-2">
              <AlertTriangle className="w-5 h-5" />
              Risk Limit Exceeded
            </DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2 text-sm text-text">
              <p>Configured daily risk budget: <span className="font-mono font-bold">₹3,000.00</span></p>
              <p className="text-risk font-medium">Calculated trade risk: <span className="font-mono font-bold">₹{riskError.calculatedRisk.toFixed(2)}</span></p>
            </div>
            <div className="bg-risk-soft/30 border border-risk/20 p-4 rounded-lg text-sm text-text">
              <p className="font-medium">The quantity you entered exceeds your configured risk parameters.</p>
              <p className="mt-2">Maximum safe quantity for this stop-loss: <span className="font-mono font-bold text-lg">{riskError.safeQuantity}</span> shares</p>
            </div>
          </div>
          <DialogFooter className="gap-2 sm:justify-start">
            <button 
              type="button"
              className="px-4 py-2 rounded-md bg-surface border border-border hover:bg-surface-muted text-text font-semibold transition-colors"
              onClick={() => setRiskError(null)}
            >
              Go Back
            </button>
            <button 
              type="button"
              className="px-4 py-2 rounded-md bg-risk hover:bg-risk/90 text-surface font-semibold transition-colors shadow-sm"
              onClick={handleAdjustQuantity}
            >
              Adjust to Safe Quantity
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    )
  }

  const riskPerShare = Math.abs(parseFloat(entryPrice || "0") - signal.stop)
  const estimatedRisk = riskPerShare * parseInt(quantity || "0", 10)

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md bg-surface border-border text-text">
        <DialogHeader>
          <DialogTitle>Record Trade Entry</DialogTitle>
        </DialogHeader>
        <div className="grid gap-5 py-2">
          <div className="flex justify-between pb-3 border-b border-border items-center">
            <div className="flex flex-col">
              <span className="font-bold text-lg">{signal.symbol}</span>
              <span className="text-xs text-text-muted">NSE Cash</span>
            </div>
            <span className={`px-2 py-1 rounded-md text-xs font-bold uppercase tracking-wider flex items-center gap-1 ${isLong ? 'bg-long-soft text-long' : 'bg-short-soft text-short'}`}>
              {isLong ? <ArrowUpRight className="w-3.5 h-3.5" /> : <ArrowDownRight className="w-3.5 h-3.5" />}
              {isLong ? "Long" : "Short"}
            </span>
          </div>
          
          <div className="grid grid-cols-4 items-center gap-4">
            <label htmlFor="price" className="text-right text-sm font-semibold text-text">Entry Price</label>
            <div className="col-span-3 relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted font-mono">₹</span>
              <input 
                id="price" 
                type="number" 
                value={entryPrice} 
                onChange={(e) => setEntryPrice(e.target.value)} 
                className="w-full h-10 pl-7 pr-3 rounded-md bg-surface border border-border focus:outline-none focus:border-primary font-mono text-sm"
              />
            </div>
          </div>
          
          <div className="grid grid-cols-4 items-center gap-4">
            <label htmlFor="qty" className="text-right text-sm font-semibold text-text">Quantity</label>
            <input 
              id="qty" 
              type="number" 
              value={quantity} 
              onChange={(e) => setQuantity(e.target.value)} 
              className="col-span-3 h-10 px-3 rounded-md bg-surface border border-border focus:outline-none focus:border-primary font-mono text-sm"
            />
          </div>

          <div className="bg-surface-muted/50 p-4 rounded-lg space-y-3 mt-2 border border-border">
            <div className="flex justify-between items-center text-sm">
              <span className="text-text-muted font-medium">Estimated Risk</span>
              <span className="font-mono font-bold text-risk bg-risk-soft px-2 py-0.5 rounded text-base">₹{estimatedRisk.toFixed(2)}</span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="text-text-muted">Risk Per Share</span>
              <span className="font-mono font-semibold">₹{riskPerShare.toFixed(2)}</span>
            </div>
            <div className="flex justify-between items-center text-sm pt-3 border-t border-border">
              <span className="text-text-muted">Stop Loss</span>
              <span className="font-mono font-semibold">₹{signal.stop.toFixed(2)}</span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="text-text-muted">Target 1</span>
              <span className={`font-mono font-semibold ${isLong ? 'text-long' : 'text-short'}`}>₹{signal.targets.t1.toFixed(2)}</span>
            </div>
          </div>
          
          <div className="text-[10px] text-text-muted text-center uppercase tracking-wider font-bold">
            Records your journal only • No broker order is placed
          </div>
        </div>
        <DialogFooter className="mt-2">
          <button 
            type="button" 
            className="px-4 py-2 rounded-md bg-surface border border-border hover:bg-surface-muted text-text font-semibold transition-colors"
            onClick={onClose}
          >
            Cancel
          </button>
          <button 
            type="button" 
            className="px-4 py-2 rounded-md bg-primary hover:bg-primary-hover text-surface font-semibold transition-colors shadow-sm"
            onClick={handleConfirm}
          >
            Confirm Entry
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
