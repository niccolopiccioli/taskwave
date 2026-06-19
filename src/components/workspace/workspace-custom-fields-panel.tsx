'use client';

import { useEffect, useState } from 'react';
import { FormInput, Loader2, Plus } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PlanGate } from '@/components/plan/plan-gate';
import type { PlanTier } from '@/lib/database.types';
import { useToast } from '@/hooks/use-toast';

interface WorkspaceCustomFieldsPanelProps {
  workspaceId: string;
  plan: PlanTier;
}

export function WorkspaceCustomFieldsPanel({ workspaceId, plan }: WorkspaceCustomFieldsPanelProps) {
  const { toast } = useToast();
  const [fields, setFields] = useState<Array<{ id: string; name: string; field_type: string }>>([]);
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(true);

  const load = () => {
    fetch(`/api/workspaces/${workspaceId}/custom-fields`)
      .then((r) => r.json())
      .then((d) => setFields(d.fields || []))
      .catch(() => setFields([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, [workspaceId]);

  const addField = async () => {
    if (!name.trim()) return;
    try {
      const res = await fetch(`/api/workspaces/${workspaceId}/custom-fields`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), field_type: 'text' }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setName('');
      load();
      toast({ title: 'Campo creato' });
    } catch (e) {
      toast({
        variant: 'destructive',
        title: 'Errore',
        description: e instanceof Error ? e.message : 'Impossibile creare',
      });
    }
  };

  return (
    <PlanGate feature="auditLog" plan={plan}>
      <Card className="border-border/60 bg-card/50 mt-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <FormInput className="h-4 w-4 text-primary" />
            Campi personalizzati
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {loading ? (
            <Loader2 className="h-5 w-5 animate-spin mx-auto" />
          ) : (
            <>
              {fields.map((f) => (
                <div key={f.id} className="rounded-lg border border-border/60 px-3 py-2 text-sm">
                  {f.name} <span className="text-muted-foreground">({f.field_type})</span>
                </div>
              ))}
              <div className="flex gap-2">
                <Input placeholder="Nome campo" value={name} onChange={(e) => setName(e.target.value)} />
                <Button size="icon" onClick={addField}>
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
