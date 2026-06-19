'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Loader2, Mail, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { SiteHeader } from '@/components/layout/site-header';
import { SiteFooter } from '@/components/layout/site-footer';
import { createClient } from '@/lib/supabase/client';

interface InvitationDetails {
  status: string;
  workspace_id?: string;
  workspace_name?: string | null;
  inviter_name?: string | null;
  email?: string;
  expires_at?: string;
  error?: string;
}

export default function InvitePage({ params }: { params: { token: string } }) {
  const router = useRouter();
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState(false);
  const [invitation, setInvitation] = useState<InvitationDetails | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [done, setDone] = useState<'accepted' | 'declined' | null>(null);

  useEffect(() => {
    async function load() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      setIsLoggedIn(!!user);
      setUserEmail(user?.email ?? null);

      const res = await fetch(`/api/invitations/${params.token}`);
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Invito non valido');
      } else {
        setInvitation(data);
        if (data.status !== 'pending') {
          setError(
            data.status === 'accepted'
              ? 'Questo invito è già stato accettato.'
              : data.status === 'declined'
                ? 'Questo invito è stato rifiutato.'
                : 'Questo invito non è più valido.'
          );
        }
      }
      setLoading(false);
    }
    load();
  }, [params.token, supabase.auth]);

  const handleAction = async (action: 'accept' | 'decline') => {
    setActing(true);
    setError(null);
    try {
      const res = await fetch(`/api/invitations/${params.token}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Operazione fallita');

      setDone(action === 'accept' ? 'accepted' : 'declined');
      if (action === 'accept') {
        setTimeout(() => router.push('/dashboard'), 2000);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Errore');
    } finally {
      setActing(false);
    }
  };

  const loginUrl = `/login?redirect=${encodeURIComponent(`/invite/${params.token}`)}`;
  const registerUrl = `/register?invite=${encodeURIComponent(params.token)}&email=${encodeURIComponent(invitation?.email || '')}`;

  const emailMismatch =
    isLoggedIn &&
    invitation?.email &&
    userEmail &&
    userEmail.toLowerCase() !== invitation.email.toLowerCase();

  return (
    <div className="min-h-screen bg-background noise-bg">
      <SiteHeader />
      <main className="container mx-auto px-4 pt-32 pb-20 max-w-lg">
        {loading && (
          <div className="text-center">
            <Loader2 className="w-10 h-10 animate-spin text-primary mx-auto mb-4" />
            <p className="text-muted-foreground">Caricamento invito...</p>
          </div>
        )}

        {!loading && done === 'accepted' && (
          <div className="text-center">
            <CheckCircle className="w-12 h-12 text-primary mx-auto mb-4" />
            <h1 className="text-2xl font-display font-bold mb-2">Benvenuto nel team!</h1>
            <p className="text-muted-foreground">Reindirizzamento alla dashboard...</p>
          </div>
        )}

        {!loading && done === 'declined' && (
          <div className="text-center">
            <XCircle className="w-10 h-10 text-muted-foreground mx-auto mb-4" />
            <h1 className="text-2xl font-display font-bold mb-2">Invito rifiutato</h1>
            <p className="text-muted-foreground mb-6">Nessun accesso è stato concesso al workspace.</p>
            <Link href="/dashboard">
              <Button variant="outline">Torna alla dashboard</Button>
            </Link>
          </div>
        )}

        {!loading && !done && (
          <div className="rounded-2xl border border-border/60 bg-card/50 p-8">
            {invitation?.workspace_name && !error?.includes('già') ? (
              <>
                <div className="w-14 h-14 rounded-full bg-primary/15 flex items-center justify-center mb-6 ring-1 ring-primary/30">
                  <Mail className="w-7 h-7 text-primary" />
                </div>
                <h1 className="text-2xl font-display font-bold mb-2">
                  Invito a {invitation.workspace_name}
                </h1>
                <p className="text-muted-foreground mb-6">
                  <strong className="text-foreground">{invitation.inviter_name}</strong> ti ha
                  invitato a collaborare su TaskFlow Pro.
                </p>
                <p className="text-sm text-muted-foreground mb-6">
                  Invito per: <span className="text-foreground">{invitation.email}</span>
                </p>

                {!isLoggedIn && (
                  <div className="space-y-3 mb-6">
                    <p className="text-sm text-muted-foreground">
                      Accedi o crea un account per rispondere all&apos;invito.
                    </p>
                    <div className="flex flex-col sm:flex-row gap-3">
                      <Link href={loginUrl} className="flex-1">
                        <Button className="w-full">Accedi</Button>
                      </Link>
                      <Link href={registerUrl} className="flex-1">
                        <Button variant="outline" className="w-full">
                          Crea account
                        </Button>
                      </Link>
                    </div>
                  </div>
                )}

                {isLoggedIn && emailMismatch && (
                  <div className="mb-6 rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-200 flex gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                    <span>
                      Sei loggato come <strong>{userEmail}</strong>, ma l&apos;invito è per{' '}
                      <strong>{invitation.email}</strong>. Cambia account per accettare.
                    </span>
                  </div>
                )}

                {isLoggedIn && !emailMismatch && (
                  <div className="flex flex-col sm:flex-row gap-3">
                    <Button
                      className="flex-1 bg-teal-500 hover:bg-teal-400 text-zinc-950"
                      disabled={acting}
                      onClick={() => handleAction('accept')}
                    >
                      {acting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Accetta invito'}
                    </Button>
                    <Button
                      variant="outline"
                      className="flex-1"
                      disabled={acting}
                      onClick={() => handleAction('decline')}
                    >
                      Rifiuta
                    </Button>
                  </div>
                )}
              </>
            ) : (
              <div className="text-center">
                <AlertCircle className="w-10 h-10 text-muted-foreground mx-auto mb-4" />
                <h1 className="text-xl font-display font-bold mb-2">Invito non disponibile</h1>
                <p className="text-muted-foreground mb-6">{error || 'Link non valido o scaduto.'}</p>
                <Link href="/dashboard">
                  <Button variant="outline">Vai alla dashboard</Button>
                </Link>
              </div>
            )}
          </div>
        )}
      </main>
      <SiteFooter />
    </div>
  );
}
