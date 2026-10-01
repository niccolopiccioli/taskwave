import { type NextRequest, NextResponse } from 'next/server';
import { updateSession } from '@/lib/supabase/middleware';
import { hasGlobalPrivacyOptOut } from '@/lib/privacy/headers';
import {
  detectLocale,
  isLocale,
  LOCALE_COOKIE,
  type Locale,
} from '@/lib/i18n';

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

function applyLocaleCookie(response: NextResponse, locale: Locale) {
  response.cookies.set(LOCALE_COOKIE, locale, {
    path: '/',
    maxAge: 60 * 60 * 24 * 365,
    sameSite: 'lax',
  });
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const cookieLocale = request.cookies.get(LOCALE_COOKIE)?.value;
  const locale: Locale = isLocale(cookieLocale)
    ? cookieLocale
    : detectLocale(request.headers.get('accept-language'));

  const { response, user } = await updateSession(request);

  applyLocaleCookie(response, locale);

  if (isProtectedApi(pathname) && !user) {
    const denied = NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    applyLocaleCookie(denied, locale);
    return denied;
  }

  if (hasGlobalPrivacyOptOut(request)) {
    response.headers.set('x-tw-analytics', 'skip');
  }

  return response;
}

export const config = {
  matcher: [
    '/',
    '/features',
    '/pricing',
    '/about',
    '/blog/:path*',
    '/dashboard/:path*',
    '/workspace/:path*',
    '/login',
    '/register',
    '/auth/callback',
    '/auth/verify-step',
    '/api/auth/step-up/:path*',
    '/api/stripe/:path*',
    '/api/workspaces/:path*',
    '/api/tasks/:path*',
    '/api/notifications/:path*',
    '/api/profile/:path*',
    '/api/privacy/:path*',
    '/api/boards/:path*',
    '/api/git/:path*',
    '/api/templates/:path*',
    '/privacy/opt-out',
  ],
};
