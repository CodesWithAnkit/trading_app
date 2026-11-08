import { NextResponse, type NextRequest } from "next/server"
import type { EmailOtpType } from "@supabase/supabase-js"
import { createServerSupabase } from "@/lib/supabase/server"

// spec 0021 AC-9: reset and invite links land here. PKCE `code` is exchanged for a session; the
// token hash form (`token_hash` + `type`) is also accepted. Then forward to /reset-password.
export async function GET(request: NextRequest) {
  const url = request.nextUrl
  const supabase = await createServerSupabase()
  const code = url.searchParams.get("code")
  const tokenHash = url.searchParams.get("token_hash")
  const type = url.searchParams.get("type") as EmailOtpType | null

  let ok = false
  if (code) {
    ok = !(await supabase.auth.exchangeCodeForSession(code)).error
  } else if (tokenHash && type) {
    ok = !(await supabase.auth.verifyOtp({ token_hash: tokenHash, type })).error
  }

  // Only ever forward to the reset page; never to a caller supplied URL.
  return NextResponse.redirect(new URL(ok ? "/reset-password" : "/reset-password?expired=1", request.url))
}
