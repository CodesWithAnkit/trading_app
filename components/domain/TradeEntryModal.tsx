import * as React from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { type Signal } from "@/mock/signals"

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

  if (riskError) {
    return (
      <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="text-risk">Risk Limit Exceeded</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2 text-body">
              <p>Configured risk budget: ₹3,000</p>
              <p className="text-risk font-medium">Calculated risk: ₹{riskError.calculatedRisk}</p>
            </div>
            <div className="bg-surface-muted p-3 rounded-md text-sm">
              <p>The quantity you entered exceeds your configured risk parameters.</p>
              <p className="mt-2">Safe quantity: <span className="font-number font-medium">{riskError.safeQuantity}</span></p>
            </div>
          </div>
          <DialogFooter className="gap-2 sm:justify-start">
            <Button variant="secondary" onClick={() => setRiskError(null)}>
              Cancel
            </Button>
            <Button variant="journalEnter" onClick={handleAdjustQuantity}>
              Adjust to Safe Quantity
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    )
  }

  const riskPerShare = Math.abs(parseFloat(entryPrice || "0") - signal.stop)
  const estimatedRisk = riskPerShare * parseInt(quantity || "0", 10)

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Record Trade Entry</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="flex justify-between pb-2 border-b border-border">
            <span className="font-medium">{signal.symbol}</span>
            <span className={signal.direction === "LONG" ? "text-long" : "text-short"}>
              {signal.direction === "LONG" ? "Long" : "Short"}
            </span>
          </div>
          
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="price" className="text-right">Price</Label>
            <Input 
              id="price" 
              type="number" 
              value={entryPrice} 
              onChange={(e) => setEntryPrice(e.target.value)} 
              className="col-span-3 font-number" 
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="qty" className="text-right">Quantity</Label>
            <Input 
              id="qty" 
              type="number" 
              value={quantity} 
              onChange={(e) => setQuantity(e.target.value)} 
              className="col-span-3 font-number" 
            />
          </div>

          <div className="bg-surface-muted/50 p-4 rounded-md space-y-2 mt-2">
            <div className="flex justify-between text-sm">
              <span className="text-text-muted">Estimated Risk</span>
              <span className="font-number font-medium text-risk">₹{estimatedRisk.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-text-muted">Risk Per Share</span>
              <span className="font-number font-medium">₹{riskPerShare.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm pt-2 border-t border-border/50">
              <span className="text-text-muted">Stop Loss</span>
              <span className="font-number font-medium">₹{signal.stop.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-text-muted">Target 1</span>
              <span className="font-number font-medium text-long">₹{signal.targets.t1.toFixed(2)}</span>
            </div>
          </div>
          
          <div className="text-[10px] text-text-muted text-center mt-2 uppercase tracking-wide">
            Records your journal only • No broker order is placed
          </div>
        </div>
        <DialogFooter>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button variant="journalEnter" onClick={handleConfirm}>Confirm Entry</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
