'use client';

import { useEffect, useState } from 'react';
import { Webhook, Loader2, Plus } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PlanGate } from '@/components/plan/plan-gate';
import type { PlanTier } from '@/lib/database.types';
import { useToast } from '@/hooks/use-toast';

interface WorkspaceWebhooksPanelProps {
  workspaceId: string;
  plan: PlanTier;
}

export function WorkspaceWebhooksPanel({ workspaceId, plan }: WorkspaceWebhooksPanelProps) {
  const { toast } = useToast();
  const [webhooks, setWebhooks] = useState<Array<{ id: string; url: string; events: string[] }>>([]);
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(true);

  const load = () => {
    fetch(`/api/workspaces/${workspaceId}/webhooks`)
      .then((r) => r.json())
      .then((d) => setWebhooks(d.webhooks || []))
      .catch(() => setWebhooks([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, [workspaceId]);

  const addWebhook = async () => {
    if (!url.trim()) return;
    try {
      const res = await fetch(`/api/workspaces/${workspaceId}/webhooks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: url.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setUrl('');
      load();
      toast({ title: 'Webhook registrato' });
    } catch (e) {
      toast({
        variant: 'destructive',
        title: 'Errore',
        description: e instanceof Error ? e.message : 'Impossibile registrare',
      });
    }
  };

  return (
    <PlanGate feature="auditLog" plan={plan}>
      <Card className="border-border/60 bg-card/50 mt-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Webhook className="h-4 w-4 text-primary" />
            Webhook outbound
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {loading ? (
            <Loader2 className="h-5 w-5 animate-spin mx-auto" />
          ) : (
            <>
              {webhooks.map((w) => (
                <div key={w.id} className="rounded-lg border border-border/60 px-3 py-2 text-sm">
                  <p className="font-medium truncate">{w.url}</p>
                  <p className="text-xs text-muted-foreground">{w.events.join(', ')}</p>
                </div>
              ))}
              <div className="flex gap-2">
                <Input
                  placeholder="https://example.com/webhook"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                />
                <Button size="icon" onClick={addWebhook}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </PlanGate>
  );
}
