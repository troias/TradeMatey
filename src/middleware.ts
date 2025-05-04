// middleware.ts
import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function middleware(req: NextRequest) {
  const res = NextResponse.next()

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      cookies: {
        get(name) {
          return req.cookies.get(name)?.value
        },
        set(name, value, options) {
          res.cookies.set({ name, value, ...options })
        },
        remove(name) {
          res.cookies.set({ name, value: '', maxAge: -1 })
        }
      }
    }
  )

  const {
    data: { user }
  } = await supabase.auth.getUser()

  // Allow access to auth & static paths
  const skipPaths = ['/login', '/signup', '/onboarding', '/_next', '/favicon.ico']
  if (!user || skipPaths.some((p) => req.nextUrl.pathname.startsWith(p))) {
    return res
  }

  // Check if user has a tradie or client profile
  const { data: tradie } = await supabase
    .from('tradies')
    .select('id')
    .eq('user_id', user.id)
    .maybeSingle()

  const { data: client } = await supabase
    .from('clients')
    .select('id')
    .eq('user_id', user.id)
    .maybeSingle()

  if (!tradie && !client && !req.nextUrl.pathname.startsWith('/onboarding')) {
    const redirectUrl = req.nextUrl.clone()
    redirectUrl.pathname = '/onboarding'
    return NextResponse.redirect(redirectUrl)
  }

  return res
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
}
