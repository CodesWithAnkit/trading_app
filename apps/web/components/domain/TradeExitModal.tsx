import * as React from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { type Trade } from "@/mock/trades"

interface TradeExitModalProps {
  trade: Trade | null
  isOpen: boolean
  onClose: () => void
  onSubmit: (quantity: number, exitPrice: number, isFullExit: boolean) => void
}

export function TradeExitModal({ trade, isOpen, onClose, onSubmit }: TradeExitModalProps) {
  const [quantity, setQuantity] = React.useState<string>("")
  const [exitPrice, setExitPrice] = React.useState<string>("")
  const [isFullExit, setIsFullExit] = React.useState<boolean>(true)

  React.useEffect(() => {
    if (isOpen && trade) {
      setQuantity(trade.quantity.toString())
      setExitPrice((trade.entryPrice * (trade.direction === 'LONG' ? 1.01 : 0.99)).toFixed(2)) // default to mock LTP
      setIsFullExit(true)
    }
  }, [isOpen, trade])

  if (!trade) return null

  const handleConfirm = () => {
    const qty = parseInt(quantity, 10)
    const price = parseFloat(exitPrice)
    onSubmit(qty, price, isFullExit)
    onClose()
  }

  const handleSetExitPercent = (percent: number) => {
    const calculatedQty = Math.floor(trade.quantity * percent)
    setQuantity(calculatedQty.toString())
    setIsFullExit(percent === 1)
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md bg-surface border-border text-text">
        <DialogHeader>
          <DialogTitle>Record Trade Exit</DialogTitle>
        </DialogHeader>
        <div className="grid gap-5 py-2">
          <div className="flex justify-between pb-3 border-b border-border items-center">
            <span className="font-bold text-lg">{trade.symbol}</span>
            <span className="text-text-muted text-sm font-medium">Open Qty: <span className="font-mono">{trade.quantity}</span></span>
          </div>
          
          <div className="flex gap-2">
            <button 
              type="button"
              className={`flex-1 py-1.5 rounded-md font-semibold text-sm transition-colors border ${isFullExit ? 'bg-primary border-primary text-surface' : 'bg-surface border-border text-text hover:bg-surface-muted'}`}
              onClick={() => handleSetExitPercent(1)}
            >
              100%
            </button>
            <button 
              type="button"
              className={`flex-1 py-1.5 rounded-md font-semibold text-sm transition-colors border ${!isFullExit && quantity === Math.floor(trade.quantity * 0.75).toString() ? 'bg-primary border-primary text-surface' : 'bg-surface border-border text-text hover:bg-surface-muted'}`}
              onClick={() => handleSetExitPercent(0.75)}
            >
              75%
            </button>
            <button 
              type="button"
              className={`flex-1 py-1.5 rounded-md font-semibold text-sm transition-colors border ${!isFullExit && quantity === Math.floor(trade.quantity * 0.5).toString() ? 'bg-primary border-primary text-surface' : 'bg-surface border-border text-text hover:bg-surface-muted'}`}
              onClick={() => handleSetExitPercent(0.5)}
            >
              50%
            </button>
            <button 
              type="button"
              className={`flex-1 py-1.5 rounded-md font-semibold text-sm transition-colors border ${!isFullExit && quantity === Math.floor(trade.quantity * 0.25).toString() ? 'bg-primary border-primary text-surface' : 'bg-surface border-border text-text hover:bg-surface-muted'}`}
              onClick={() => handleSetExitPercent(0.25)}
            >
              25%
            </button>
          </div>

          <div className="grid grid-cols-4 items-center gap-4 mt-2">
            <label htmlFor="qty" className="text-right text-sm font-semibold text-text">Quantity</label>
            <input 
              id="qty" 
              type="number" 
              value={quantity} 
              onChange={(e) => {
                setQuantity(e.target.value)
                setIsFullExit(parseInt(e.target.value, 10) >= trade.quantity)
              }} 
              className="col-span-3 h-10 px-3 rounded-md bg-surface border border-border focus:outline-none focus:border-primary font-mono text-sm"
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <label htmlFor="price" className="text-right text-sm font-semibold text-text">Exit Price</label>
            <div className="col-span-3 relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted font-mono">₹</span>
              <input 
                id="price" 
                type="number" 
                value={exitPrice} 
                onChange={(e) => setExitPrice(e.target.value)} 
                className="w-full h-10 pl-7 pr-3 rounded-md bg-surface border border-border focus:outline-none focus:border-primary font-mono text-sm"
              />
            </div>
          </div>

          <div className="text-[10px] text-text-muted text-center mt-2 uppercase tracking-wide font-bold">
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
            className="px-4 py-2 rounded-md bg-risk hover:bg-risk/90 text-surface font-semibold transition-colors shadow-sm"
            onClick={handleConfirm}
          >
            Confirm {isFullExit ? 'Full' : 'Partial'} Exit
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
