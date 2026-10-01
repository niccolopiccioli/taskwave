import { createHash, randomInt } from 'crypto';
import type { NextResponse } from 'next/server';

/** How long after step-up before OTP is required again (4 hours) */
export const STEP_UP_INTERVAL_SEC = 4 * 60 * 60;

/** OTP validity window */
export const OTP_TTL_SEC = 10 * 60;

export const STEP_UP_COOKIE = 'tw_step_up_until';

/** Set `STEP_UP_OTP_ENABLED=true` when Resend domain is verified (see docs/EMAIL_AND_DOMAINS.md). */
export function isStepUpOtpEnabled(): boolean {
  return process.env.STEP_UP_OTP_ENABLED === 'true';
}

function otpSalt() {
  return process.env.STEP_UP_OTP_SALT || process.env.PRIVACY_IP_SALT || 'taskwave-step-up';
}

export function generateOtpCode(): string {
  return String(randomInt(100_000, 1_000_000));
}

export function hashOtpCode(code: string, userId: string): string {
  return createHash('sha256')
    .update(`${otpSalt()}:${userId}:${code.trim()}`)
    .digest('hex');
}

export function isStepUpValid(untilCookie: string | undefined): boolean {
  if (!untilCookie) return false;
  const until = parseInt(untilCookie, 10);
  if (!Number.isFinite(until)) return false;
  return Math.floor(Date.now() / 1000) < until;
}

export function stepUpUntilTimestamp(): number {
  return Math.floor(Date.now() / 1000) + STEP_UP_INTERVAL_SEC;
}

export function applyStepUpCookie(response: NextResponse, until?: number) {
  const value = String(until ?? stepUpUntilTimestamp());
  response.cookies.set(STEP_UP_COOKIE, value, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: STEP_UP_INTERVAL_SEC,
  });
}

export function clearStepUpCookie(response: NextResponse) {
  response.cookies.set(STEP_UP_COOKIE, '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  });
}

export function isStepUpProtectedPath(pathname: string): boolean {
  return (
    pathname.startsWith('/dashboard') ||
    pathname.startsWith('/workspace')
  );
}

export const VERIFY_STEP_PATH = '/auth/verify-step';
