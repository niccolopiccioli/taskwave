'use client';

import { useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Shield, Loader2, CheckCircle2 } from 'lucide-react';
import { SiteHeader } from '@/components/layout/site-header';
import { SiteFooter } from '@/components/layout/site-footer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BRAND_NAME } from '@/lib/brand';

export default function PrivacyOptOutPage() {
  const searchParams = useSearchParams();
  const confirmed = searchParams.get('confirmed') === '1';
  const error = searchParams.get('error');

  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const applySession = async () => {
    setLoading(true);
    setMessage(null);
    try {
      const res = await fetch('/api/privacy/opt-out', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionOnly: true }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Errore');
      setMessage('Opt-out applicato a questa sessione e browser.');
    } catch (e) {
      setMessage(e instanceof Error ? e.message : 'Errore');
    } finally {
      setLoading(false);
    }
  };

  const submitEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);
    try {
      const res = await fetch('/api/privacy/opt-out', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Errore');
      setMessage(data.message || 'Email inviata.');
      setEmail('');
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Errore');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background noise-bg">
      <SiteHeader />

      <section className="pt-24 sm:pt-32 pb-16 px-4 sm:px-6">
        <div className="container mx-auto max-w-lg">
          <Card className="border-border/60 bg-card/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-primary" />
                Opt-out tracciamento IP
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {confirmed && (
                <div className="flex items-start gap-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 p-3 text-sm text-emerald-400">
                  <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5" />
                  Opt-out confermato. {BRAND_NAME} non traccerà il tuo indirizzo IP per analytics.
                </div>
              )}
              {error && (
                <p className="text-sm text-red-400">Link non valido o scaduto. Riprova.</p>
              )}

              <p className="text-sm text-muted-foreground">
                Puoi opporsi alla raccolta del tuo indirizzo IP per analytics e marketing.
                Non memorizziamo IP in chiaro — solo un hash irreversibile per rispettare la tua scelta.
              </p>

              <Button
                type="button"
                variant="outline"
                className="w-full"
                onClick={applySession}
                disabled={loading}
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Applica a questa sessione'}
              </Button>

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t border-border/60" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-card px-2 text-muted-foreground">oppure via email</span>
                </div>
              </div>

              <form onSubmit={submitEmail} className="space-y-3">
                <div className="space-y-2">
                  <Label htmlFor="opt-email">Email</Label>
                  <Input
                    id="opt-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="tu@email.com"
                    required
                  />
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Invia link di conferma'}
                </Button>
              </form>

              {message && <p className="text-sm text-muted-foreground">{message}</p>}

              <p className="text-xs text-muted-foreground">
                Rispettiamo anche il segnale{' '}
                <a href="https://globalprivacycontrol.org" className="text-primary hover:underline">
                  Global Privacy Control (GPC)
                </a>
                .{' '}
                <Link href="/privacy" className="text-primary hover:underline">
                  Privacy Policy
                </Link>
              </p>
            </CardContent>
          </Card>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}
