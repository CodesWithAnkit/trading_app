import { NextResponse, type NextRequest } from "next/server"
import { createServerClient } from "@supabase/ssr"
import { isPublicPath, loginUrlFor } from "@/lib/auth/publicPaths"

// spec 0021 AC-3: optimistic redirect for visitors with no session. The server layouts do the real
// check (requireUser). Refreshed auth cookies are written onto the response.
export async function proxy(request: NextRequest) {
  // Tell server layouts which page was asked for, so their redirect keeps `next`.
  const requestHeaders = new Headers(request.headers)
  requestHeaders.set("x-next-path", `${request.nextUrl.pathname}${request.nextUrl.search}`)
  const forward = () => NextResponse.next({ request: { headers: requestHeaders } })
  let response = forward()

  const supabase = createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (list) => {
        for (const { name, value } of list) request.cookies.set(name, value)
        requestHeaders.set("cookie", request.cookies.toString())
        response = forward()
        for (const { name, value, options } of list) response.cookies.set(name, value, options)
      },
    },
  })

  const { data } = await supabase.auth.getUser()
  const { pathname, search } = request.nextUrl

  if (!data.user && !isPublicPath(pathname)) {
    const redirect = NextResponse.redirect(new URL(loginUrlFor(pathname, search), request.url))
    for (const c of response.cookies.getAll()) redirect.cookies.set(c)
    return redirect
  }
  return response
}

export const config = {
  // Skip Next internals, static files, and /api (the NestJS API checks its own bearer token).
  matcher: ["/((?!_next/static|_next/image|api/|favicon.ico|icon.png|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)"],
}
