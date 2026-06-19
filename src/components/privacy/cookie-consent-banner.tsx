'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { getStoredConsent, setStoredConsent } from '@/lib/privacy/consent';

async function syncProfileConsent(analyticsOptOut: boolean, marketingOptOut: boolean) {
  try {
    await fetch('/api/profile/privacy-preferences', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        analytics_opt_out: analyticsOptOut,
        marketing_opt_out: marketingOptOut,
        ip_tracking_opt_out: analyticsOptOut,
      }),
    });
  } catch {
    // anonymous visitors or logged-out users
  }
}

export function CookieConsentBanner() {
  const searchParams = useSearchParams();
  const forceShow = searchParams.get('cookies') === '1';
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (forceShow || !getStoredConsent()) setVisible(true);
  }, [forceShow]);

  if (!visible) return null;

  const apply = async (mode: 'essential' | 'all') => {
    setStoredConsent(mode);
    if (mode === 'essential') {
      await syncProfileConsent(true, true);
    } else {
      await syncProfileConsent(false, false);
    }
    setVisible(false);
  };

  return (
    <div className="fixed bottom-0 inset-x-0 z-50 p-4 sm:p-6">
      <div className="mx-auto max-w-3xl rounded-xl border border-border/60 bg-zinc-950/95 backdrop-blur-xl p-4 sm:p-5 shadow-2xl">
        <p className="text-sm text-muted-foreground mb-4">
          Usiamo cookie necessari per l&apos;autenticazione. Con il tuo consenso possiamo usare analytics
          per migliorare TaskWave.{' '}
          <Link href="/privacy" className="text-primary hover:underline">
            Privacy
          </Link>
          {' · '}
          <Link href="/privacy/opt-out" className="text-primary hover:underline">
            Opt-out IP
          </Link>
        </p>
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="outline" onClick={() => apply('essential')}>
            Solo necessari
          </Button>
          <Button size="sm" onClick={() => apply('all')}>
            Accetta tutti
          </Button>
        </div>
      </div>
    </div>
  );
}
