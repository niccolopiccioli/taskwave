'use client';

import { useEffect, useState } from 'react';
import { Activity, Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PlanGate } from '@/components/plan/plan-gate';
import { createClient } from '@/lib/supabase/client';
import { getAuditLog } from '@/lib/data';
import type { PlanTier, Profile } from '@/lib/database.types';

interface WorkspaceActivityFeedProps {
  workspaceId: string;
  plan: PlanTier;
}

const ACTION_LABELS: Record<string, string> = {
  'member.invited': 'Membro invitato',
  'task.moved': 'Task spostato',
  'task.commented': 'Commento aggiunto',
  'task.assigned': 'Task assegnato',
  'task.created': 'Task creato',
  'task.updated': 'Task aggiornato',
  'task.deleted': 'Task eliminato',
  'board.created': 'Board creata',
  'api_key.created': 'API key creata',
};

export function WorkspaceActivityFeed({ workspaceId, plan }: WorkspaceActivityFeedProps) {
  const supabase = createClient();
  const [entries, setEntries] = useState<
    Array<{
      id: string;
      action: string;
      created_at: string;
      actor: Profile | null;
    }>
  >([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getAuditLog(supabase, workspaceId, 15)
      .then(setEntries)
      .catch(() => setEntries([]))
      .finally(() => setLoading(false));
  }, [supabase, workspaceId]);

  return (
    <PlanGate feature="advancedAnalytics" plan={plan}>
      <Card className="border-border/60 bg-card/50 mt-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Activity className="h-4 w-4 text-primary" />
            Attività recente
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-6">
              <Loader2 className="h-5 w-5 animate-spin text-primary" />
            </div>
          ) : entries.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              Nessuna attività recente nel workspace.
            </p>
          ) : (
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {entries.map((entry) => (
                <div
                  key={entry.id}
                  className="flex items-start justify-between gap-3 rounded-lg border border-border/60 px-3 py-2 text-sm"
                >
                  <div>
                    <p className="font-medium">
                      {ACTION_LABELS[entry.action] || entry.action}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {entry.actor?.full_name || entry.actor?.email || 'Sistema'}
                    </p>
                  </div>
                  <span className="text-xs text-muted-foreground shrink-0">
                    {new Date(entry.created_at).toLocaleString('it-IT', {
                      day: 'numeric',
                      month: 'short',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </PlanGate>
  );
}
