import { Suspense } from 'react';
import { CookieConsentBanner } from '@/components/privacy/cookie-consent-banner';

export function CookieConsentWrapper() {
  return (
    <Suspense fallback={null}>
      <CookieConsentBanner />
    </Suspense>
  );
}
