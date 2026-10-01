'use client';

import { Suspense, useCallback, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Loader2, Mail, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Brand } from '@/components/layout/brand';
import { OTP_TTL_SEC } from '@/lib/step-up';

function VerifyStepContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get('redirect') || '/dashboard';
  const { toast } = useToast();

  const [code, setCode] = useState('');
  const [emailHint, setEmailHint] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [sentOnce, setSentOnce] = useState(false);

  const sendCode = useCallback(async () => {
    setSending(true);
    try {
      const res = await fetch('/api/auth/step-up/send', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Invio fallito');
      setEmailHint(typeof data.email === 'string' ? data.email : null);
      setSentOnce(true);
      toast({
        title: 'Codice inviato',
        description: 'Controlla la tua casella email.',
      });
    } catch (e) {
      toast({
        variant: 'destructive',
        title: 'Errore',
        description: e instanceof Error ? e.message : 'Impossibile inviare il codice',
      });
    } finally {
      setSending(false);
    }
  }, [toast]);

  useEffect(() => {
    sendCode();
  }, [sendCode]);

  const onVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setVerifying(true);
    try {
      const res = await fetch('/api/auth/step-up/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Verifica fallita');

      toast({ title: 'Verifica completata', description: 'Accesso confermato.' });
      router.push(redirectTo);
      router.refresh();
    } catch (e) {
      toast({
        variant: 'destructive',
        title: 'Codice non valido',
        description: e instanceof Error ? e.message : 'Riprova',
      });
    } finally {
      setVerifying(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4 noise-bg">
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/5 pointer-events-none" />
      <Card className="w-full max-w-md relative border-border/60 bg-card/80 backdrop-blur-xl">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10">
              <ShieldCheck className="h-7 w-7 text-primary" />
            </div>
          </div>
          <div className="flex justify-center mb-4">
            <Brand href="/dashboard" size="sm" />
          </div>
          <CardTitle className="text-2xl font-display">Verifica la tua identità</CardTitle>
          <CardDescription className="text-balance">
            Per sicurezza, inserisci il codice a 6 cifre che abbiamo inviato
            {emailHint ? ` a ${emailHint}` : ' alla tua email'}.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={onVerify} className="space-y-4">
            <div>
              <Input
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="000000"
                inputMode="numeric"
                autoComplete="one-time-code"
                className="text-center text-2xl tracking-[0.4em] font-mono h-14"
                disabled={verifying}
                autoFocus
              />
              <p className="mt-2 text-xs text-muted-foreground text-center">
                Il codice scade tra {Math.floor(OTP_TTL_SEC / 60)} minuti
              </p>
            </div>
            <Button
              type="submit"
              className="w-full bg-primary hover:bg-primary/90 text-primary-foreground"
              disabled={verifying || code.length !== 6}
            >
              {verifying ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Verifica...
                </>
              ) : (
                'Conferma e continua'
              )}
            </Button>
          </form>
          <Button
            type="button"
            variant="ghost"
            className="w-full mt-3 gap-2"
            onClick={sendCode}
            disabled={sending}
          >
            {sending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Mail className="h-4 w-4" />
            )}
            {sentOnce ? 'Invia un nuovo codice' : 'Invia codice'}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

export default function VerifyStepPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      }
    >
      <VerifyStepContent />
    </Suspense>
  );
}
