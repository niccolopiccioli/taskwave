import { type NextRequest, NextResponse } from 'next/server';
import { updateSession } from '@/lib/supabase/middleware';
import { hasGlobalPrivacyOptOut } from '@/lib/privacy/headers';

const PROTECTED_API_PREFIXES = [
  '/api/workspaces',
  '/api/tasks',
  '/api/notifications',
  '/api/profile',
  '/api/stripe/checkout',
  '/api/stripe/portal',
  '/api/stripe/sync-session',
  '/api/boards/',
];

const PUBLIC_API_PREFIXES = [
  '/api/stripe/webhook',
  '/api/boards/guest/',
  '/api/invitations/',
  '/api/health/',
  '/api/sso/',
  '/api/v1/',
  '/api/privacy/confirm/',
];

function isProtectedApi(pathname: string): boolean {
  return (
    PROTECTED_API_PREFIXES.some((prefix) => pathname.startsWith(prefix)) &&
    !PUBLIC_API_PREFIXES.some((prefix) => pathname.startsWith(prefix))
  );
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const { response, user } = await updateSession(request);

  if (isProtectedApi(pathname) && !user) {
    return NextResponse.json({ error: 'Non autenticato' }, { status: 401 });
  }

  if (hasGlobalPrivacyOptOut(request)) {
    response.headers.set('x-tw-analytics', 'skip');
  }

  return response;
}

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/workspace/:path*',
    '/login',
    '/register',
    '/auth/callback',
    '/api/stripe/:path*',
    '/api/workspaces/:path*',
    '/api/tasks/:path*',
    '/api/notifications/:path*',
  '/api/profile/:path*',
  '/api/privacy/:path*',
  '/api/boards/:path*',
  '/privacy/opt-out',
  ],
};
