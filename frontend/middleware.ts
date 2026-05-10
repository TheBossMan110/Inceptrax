import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

/**
 * Next.js Middleware for route protection.
 *
 * We use httpOnly cookies for secure token storage. Since the JWT cookie
 * is httpOnly and not readable by JS, we set a lightweight 'auth_session'
 * cookie from the client as a session flag. Middleware checks this flag.
 *
 * This provides a first-pass server-side redirect for deep links.
 * The auth-provider.tsx handles the definitive client-side enforcement.
 */

const PROTECTED_PREFIXES = [
  '/dashboard',
  '/admin',
  '/cofounder',
  '/hub',
  '/chat',
]

const AUTH_PAGES = [
  '/login',
  '/register',
]

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Check if the path is protected
  const isProtected = PROTECTED_PREFIXES.some(prefix => pathname.startsWith(prefix))

  // Check if it's an auth page (login/register)
  const isAuthPage = AUTH_PAGES.some(page => pathname === page)

  // Read the session cookie (set by auth-provider on login)
  const hasSession = request.cookies.get('auth_session')?.value === 'true'

  // Block unauthenticated users from protected routes
  if (isProtected && !hasSession) {
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('redirect', pathname)
    return NextResponse.redirect(loginUrl)
  }

  // Redirect authenticated users away from login/register
  if (isAuthPage && hasSession) {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    /*
     * Match all paths except static files and API routes.
     */
    '/((?!api|_next/static|_next/image|favicon.ico|.*\\.png$|.*\\.jpg$|.*\\.svg$).*)',
  ],
}
