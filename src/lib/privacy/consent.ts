export type CookieConsentLevel = 'essential' | 'all';

const CONSENT_KEY = 'tw_cookie_consent';

export function getStoredConsent(): CookieConsentLevel | null {
  if (typeof window === 'undefined') return null;
  const v = localStorage.getItem(CONSENT_KEY);
  if (v === 'essential' || v === 'all') return v;
  return null;
}

export function setStoredConsent(level: CookieConsentLevel) {
  localStorage.setItem(CONSENT_KEY, level);
  document.cookie = `${CONSENT_KEY}=${level}; path=/; max-age=31536000; samesite=lax`;
  if (level === 'essential') {
    document.cookie = 'tw_privacy=1; path=/; max-age=31536000; samesite=lax';
  }
}

export function hasAnalyticsConsent(): boolean {
  return getStoredConsent() === 'all';
}
