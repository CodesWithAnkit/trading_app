import { requireAdmin } from "@/lib/supabase/server"
import { BacktestLab } from "@/components/domain/backtest/BacktestLab"

// spec 0020 AC-9, spec 0021 AC-8: admin only, checked on the server (non admins go to /dashboard).
export default async function BacktestPage() {
  await requireAdmin("/dashboard/backtest")
  return <BacktestLab />
}
