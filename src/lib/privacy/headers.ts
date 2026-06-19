import type { NextRequest } from 'next/server';

const PRIVACY_COOKIE = 'tw_privacy';
const CONSENT_COOKIE = 'tw_cookie_consent';

export function getClientIp(request: NextRequest | Request): string | null {
  const headers =
    request instanceof Request
      ? request.headers
      : (request as NextRequest).headers;

  const forwarded = headers.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0]?.trim() || null;
  const realIp = headers.get('x-real-ip');
  if (realIp) return realIp.trim();
  return null;
}

export function hasGlobalPrivacyOptOut(request: NextRequest): boolean {
  if (request.cookies.get(PRIVACY_COOKIE)?.value === '1') return true;
  if (request.cookies.get(CONSENT_COOKIE)?.value === 'essential') return true;
  if (request.headers.get('sec-gpc') === '1') return true;
  if (request.headers.get('dnt') === '1') return true;
  return false;
}

export function privacyCookieHeader(): string {
  return `${PRIVACY_COOKIE}=1; Path=/; Max-Age=31536000; SameSite=Lax`;
}

export const PRIVACY_COOKIES = { PRIVACY_COOKIE, CONSENT_COOKIE };
