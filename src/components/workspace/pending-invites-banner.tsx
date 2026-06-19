'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Mail, Loader2, Check, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';

interface PendingInvite {
  id: string;
  token: string;
  email: string;
  workspace_id: string;
  expires_at: string;
}

export function PendingInvitesBanner({ onAccepted }: { onAccepted?: () => void }) {
  const { toast } = useToast();
  const [invites, setInvites] = useState<PendingInvite[]>([]);
  const [workspaceNames, setWorkspaceNames] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState<string | null>(null);

  const load = async () => {
    const res = await fetch('/api/invitations/pending');
    const data = await res.json();
    const list = (data.invitations ?? []) as PendingInvite[];
    setInvites(list);

    const names: Record<string, string> = {};
    await Promise.all(
      list.map(async (inv) => {
        const detail = await fetch(`/api/invitations/${inv.token}`);
        const d = await detail.json();
        if (d.workspace_name) names[inv.token] = d.workspace_name;
      })
    );
    setWorkspaceNames(names);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const handleAction = async (token: string, action: 'accept' | 'decline') => {
    setActing(token);
    try {
      const res = await fetch(`/api/invitations/${token}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      toast({
        title: action === 'accept' ? 'Invito accettato' : 'Invito rifiutato',
        description:
          action === 'accept'
            ? 'Ora fai parte del workspace.'
            : 'Hai rifiutato l\'invito al team.',
      });
      await load();
      if (action === 'accept') onAccepted?.();
    } catch (e) {
      toast({
        variant: 'destructive',
        title: 'Errore',
        description: e instanceof Error ? e.message : 'Operazione fallita',
      });
    } finally {
      setActing(null);
    }
  };

  if (loading || invites.length === 0) return null;

  return (
    <div className="mb-6 rounded-xl border border-teal-500/30 bg-teal-500/5 p-4">
      <div className="flex items-center gap-2 mb-3">
        <Mail className="w-4 h-4 text-teal-400" />
        <h3 className="font-medium text-sm">Inviti in sospeso</h3>
      </div>
      <div className="space-y-2">
        {invites.map((inv) => (
          <div
            key={inv.id}
            className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-lg border border-border/60 bg-card/40 px-3 py-2.5"
          >
            <div className="text-sm">
              <span className="text-muted-foreground">Sei invitato in </span>
              <strong>{workspaceNames[inv.token] || 'un workspace'}</strong>
            </div>
            <div className="flex gap-2 shrink-0">
              <Button
                size="sm"
                className="h-8 bg-teal-500 hover:bg-teal-400 text-zinc-950"
                disabled={acting === inv.token}
                onClick={() => handleAction(inv.token, 'accept')}
              >
                {acting === inv.token ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <>
                    <Check className="w-3.5 h-3.5 mr-1" />
                    Accetta
                  </>
                )}
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="h-8"
                disabled={acting === inv.token}
                onClick={() => handleAction(inv.token, 'decline')}
              >
                <X className="w-3.5 h-3.5 mr-1" />
                Rifiuta
              </Button>
              <Link href={`/invite/${inv.token}`}>
                <Button size="sm" variant="ghost" className="h-8">
                  Dettagli
                </Button>
              </Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
