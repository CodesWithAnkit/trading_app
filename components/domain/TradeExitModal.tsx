import * as React from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
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
      setExitPrice("")
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

  const handleSetFullExit = () => {
    setQuantity(trade.quantity.toString())
    setIsFullExit(true)
  }

  const handleSetPartialExit = () => {
    setQuantity(Math.floor(trade.quantity / 2).toString())
    setIsFullExit(false)
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Record Trade Exit</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="flex justify-between pb-2 border-b border-border">
            <span className="font-medium">{trade.symbol}</span>
            <span className="text-text-muted text-sm">Remaining Qty: {trade.quantity}</span>
          </div>
          
          <div className="flex gap-2">
            <Button 
              variant={isFullExit ? "primary" : "secondary"} 
              size="sm" 
              onClick={handleSetFullExit}
              className="flex-1"
            >
              Full Exit
            </Button>
            <Button 
              variant={!isFullExit ? "primary" : "secondary"} 
              size="sm" 
              onClick={handleSetPartialExit}
              className="flex-1"
            >
              Partial Exit
            </Button>
          </div>

          <div className="grid grid-cols-4 items-center gap-4 mt-2">
            <Label htmlFor="qty" className="text-right">Quantity</Label>
            <Input 
              id="qty" 
              type="number" 
              value={quantity} 
              onChange={(e) => {
                setQuantity(e.target.value)
                setIsFullExit(parseInt(e.target.value, 10) >= trade.quantity)
              }} 
              className="col-span-3 font-number" 
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="price" className="text-right">Exit Price</Label>
            <Input 
              id="price" 
              type="number" 
              value={exitPrice} 
              onChange={(e) => setExitPrice(e.target.value)} 
              className="col-span-3 font-number" 
            />
          </div>

          <div className="text-[10px] text-text-muted text-center mt-2 uppercase tracking-wide">
            Records your journal only • No broker order is placed
          </div>
        </div>
        <DialogFooter>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button variant="journalExit" onClick={handleConfirm}>Confirm Exit</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
