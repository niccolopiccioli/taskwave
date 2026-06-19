import { createHash } from 'crypto';

export function getPrivacySalt() {
  return process.env.PRIVACY_IP_SALT || 'taskwave-privacy-dev-salt';
}

export function hashIp(ip: string): string {
  return createHash('sha256').update(`${getPrivacySalt()}:${ip}`).digest('hex');
}

export { getClientIp, hasGlobalPrivacyOptOut, privacyCookieHeader, PRIVACY_COOKIES } from './headers';
