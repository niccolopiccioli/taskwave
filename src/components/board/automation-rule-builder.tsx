'use client';

import { useState, useEffect } from 'react';
import {
  Plus,
  Trash2,
  Loader2,
  Check,
  Play,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import type { AutomationRule } from '@/lib/database.types';

const TRIGGER_OPTIONS = [
  { value: 'task_created', label: 'Quando un task viene creato' },
  { value: 'task_moved', label: 'Quando un task viene spostato' },
  { value: 'task_assigned', label: 'Quando un task viene assegnato' },
  { value: 'task_completed', label: 'Quando un task viene completato' },
  { value: 'task_due_soon', label: 'Quando un task è in scadenza (24h)' },
  { value: 'task_overdue', label: 'Quando un task è scaduto' },
];

const ACTION_TYPES = [
  { type: 'assign', label: 'Assegna a', hasTarget: true, targetType: 'member' },
  { type: 'move_column', label: 'Sposta in colonna', hasTarget: true, targetType: 'column' },
  { type: 'set_priority', label: 'Imposta priorità', hasTarget: true, targetType: 'priority' },
  { type: 'add_label', label: 'Aggiungi label', hasTarget: true, targetType: 'label' },
  { type: 'notify', label: 'Invia notifica', hasTarget: true, targetType: 'member' },
  { type: 'set_due_date_days', label: 'Imposta scadenza (+N giorni)', hasTarget: true, targetType: 'number' },
  { type: 'mark_completed', label: 'Segna completato', hasTarget: false, targetType: null },
  { type: 'archive', label: 'Archivia', hasTarget: false, targetType: null },
];

interface ActionInput {
  id: string;
  type: string;
  target: string;
}

interface Condition {
  id: string;
  field: string;
  value: string;
}

interface AutomationRuleBuilderProps {
  workspaceId: string;
  columns: Array<{ id: string; name: string }>;
  members: Array<{ id: string; full_name: string | null; email: string }>;
  className?: string;
}

export function AutomationRuleBuilder({
  workspaceId,
  columns,
  members,
  className,
}: AutomationRuleBuilderProps) {
  const { toast } = useToast();
  const [rules, setRules] = useState<AutomationRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [builderOpen, setBuilderOpen] = useState(false);
  const [step, setStep] = useState(1);
  const [trigger, setTrigger] = useState('');
  const [conditions, setConditions] = useState<Condition[]>([]);
  const [actions, setActions] = useState<ActionInput[]>([]);
  const [ruleName, setRuleName] = useState('');
  const [saving, setSaving] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/workspaces/${workspaceId}/automations`)
      .then((r) => r.json())
      .then((data) => setRules(data.rules || []))
      .catch(() => setRules([]))
      .finally(() => setLoading(false));
  }, [workspaceId]);

  const handleSave = async () => {
    if (!trigger.trim()) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/workspaces/${workspaceId}/automations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: ruleName || 'Nuova automazione',
          trigger_event: trigger,
          conditions: conditions.filter((c) => c.field && c.value),
          actions: actions.filter((a) => a.type),
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Salvataggio fallito');
      }
      const created = await res.json();
      setRules((prev) => [...prev, created.rule]);
      setBuilderOpen(false);
      resetBuilder();
    } catch (e) {
      toast({
        variant: 'destructive',
        title: 'Errore',
        description: e instanceof Error ? e.message : 'Salvataggio fallito',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = async (rule: AutomationRule) => {
    setTogglingId(rule.id);
    try {
      const res = await fetch(`/api/workspaces/${workspaceId}/automations/${rule.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled: !rule.enabled }),
      });
      if (!res.ok) throw new Error('Operazione fallita');
      setRules((prev) =>
        prev.map((r) => (r.id === rule.id ? { ...r, enabled: !r.enabled } : r))
      );
    } catch (e) {
      toast({
        variant: 'destructive',
        title: 'Errore',
        description: e instanceof Error ? e.message : 'Operazione fallita',
      });
    } finally {
      setTogglingId(null);
    }
  };

  const handleDelete = async (ruleId: string) => {
    setDeletingId(ruleId);
    try {
      await fetch(`/api/workspaces/${workspaceId}/automations/${ruleId}`, {
        method: 'DELETE',
      });
      setRules((prev) => prev.filter((r) => r.id !== ruleId));
    } catch (e) {
      toast({
        variant: 'destructive',
        title: 'Errore',
        description: e instanceof Error ? e.message : 'Eliminazione fallita',
      });
    } finally {
      setDeletingId(null);
    }
  };

  const resetBuilder = () => {
    setStep(1);
    setTrigger('');
    setConditions([]);
    setActions([]);
    setRuleName('');
  };

  const conditionFields = [
    { value: 'column', label: 'Colonna' },
    { value: 'priority', label: 'Priorità' },
    { value: 'assignee', label: 'Assegnatario' },
    { value: 'label', label: 'Label' },
  ];

  const addCondition = () => {
    setConditions((prev) => [
      ...prev,
      { id: `cond_${Date.now()}`, field: '', value: '' },
    ]);
  };

  const updateCondition = (id: string, key: keyof Condition, val: string) => {
    setConditions((prev) =>
      prev.map((c) => (c.id === id ? { ...c, [key]: val } : c))
    );
  };

  const removeCondition = (id: string) => {
    setConditions((prev) => prev.filter((c) => c.id !== id));
  };

  const addAction = () => {
    setActions((prev) => [
      ...prev,
      { id: `act_${Date.now()}`, type: '', target: '' },
    ]);
  };

  const updateAction = (id: string, key: 'type' | 'target', val: string) => {
    setActions((prev) =>
      prev.map((a) => {
        if (a.id !== id) return a;
        if (key === 'type') return { ...a, type: val, target: '' };
        return { ...a, [key]: val };
      })
    );
  };

  const removeAction = (id: string) => {
    setActions((prev) => prev.filter((a) => a.id !== id));
  };

  const getActionType = (type: string) => ACTION_TYPES.find((a) => a.type === type);

  const getTriggerLabel = (event: string) =>
    TRIGGER_OPTIONS.find((t) => t.value === event)?.label || event;

  return (
    <div className={cn('space-y-4', className)}>
      <div className="flex items-center justify-between">
        <h3 className="font-medium text-sm">Regole di automazione</h3>
        <Button
          size="sm"
          variant="outline"
          className="gap-1.5"
          onClick={() => setBuilderOpen(true)}
        >
          <Plus className="h-3.5 w-3.5" />
          Nuova regola
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-6">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      ) : rules.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-6">
          Nessuna automazione configurata.
        </p>
      ) : (
        <div className="space-y-2">
          {rules.map((rule) => (
            <div
              key={rule.id}
              className="flex items-center justify-between rounded-lg border border-border/60 px-3 py-2.5"
            >
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium truncate">{rule.name}</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  <Play className="h-3 w-3 inline mr-0.5" />
                  {getTriggerLabel(rule.trigger_event)}
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {togglingId === rule.id ? (
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                ) : (
                  <Switch
                    checked={rule.enabled}
                    onCheckedChange={() => handleToggle(rule)}
                  />
                )}
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-red-400 hover:text-red-300"
                  onClick={() => handleDelete(rule.id)}
                  disabled={deletingId === rule.id}
                >
                  {deletingId === rule.id ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Trash2 className="h-3.5 w-3.5" />
                  )}
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={builderOpen} onOpenChange={(o) => { setBuilderOpen(o); if (!o) resetBuilder(); }}>
        <DialogContent className="w-[calc(100vw-2rem)] max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Nuova automazione</DialogTitle>
          </DialogHeader>

          <div className="space-y-5 py-2">
            <div className="space-y-2">
              <Label>Nome regola</Label>
              <Input
                placeholder="Es: Assegna nuovi bug a Mario"
                value={ruleName}
                onChange={(e) => setRuleName(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label className="flex items-center gap-1.5">
                <span className="flex items-center justify-center w-5 h-5 rounded-full bg-teal-500 text-white text-xs font-bold">
                  {step >= 1 ? <Check className="h-3 w-3" /> : '1'}
                </span>
                Trigger
              </Label>
              <Select value={trigger} onValueChange={(v) => { setTrigger(v); setStep(2); }}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleziona trigger" />
                </SelectTrigger>
                <SelectContent>
                  {TRIGGER_OPTIONS.map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {trigger && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="flex items-center gap-1.5">
                    <span className="flex items-center justify-center w-5 h-5 rounded-full bg-teal-500 text-white text-xs font-bold">
                      {step >= 2 ? <Check className="h-3 w-3" /> : '2'}
                    </span>
                    Condizioni (opzionale)
                  </Label>
                  <Button type="button" size="sm" variant="ghost" onClick={addCondition}>
                    <Plus className="h-3.5 w-3.5" />
                  </Button>
                </div>
                {conditions.map((cond) => (
                  <div key={cond.id} className="flex gap-2">
                    <Select
                      value={cond.field}
                      onValueChange={(v) => updateCondition(cond.id, 'field', v)}
                    >
                      <SelectTrigger className="w-32">
                        <SelectValue placeholder="Campo" />
                      </SelectTrigger>
                      <SelectContent>
                        {conditionFields.map((f) => (
                          <SelectItem key={f.value} value={f.value}>
                            {f.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {cond.field === 'priority' ? (
                      <Select
                        value={cond.value}
                        onValueChange={(v) => updateCondition(cond.id, 'value', v)}
                      >
                        <SelectTrigger className="flex-1">
                          <SelectValue placeholder="Valore" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="low">Bassa</SelectItem>
                          <SelectItem value="medium">Media</SelectItem>
                          <SelectItem value="high">Alta</SelectItem>
                        </SelectContent>
                      </Select>
                    ) : cond.field === 'column' ? (
                      <Select
                        value={cond.value}
                        onValueChange={(v) => updateCondition(cond.id, 'value', v)}
                      >
                        <SelectTrigger className="flex-1">
                          <SelectValue placeholder="Valore" />
                        </SelectTrigger>
                        <SelectContent>
                          {columns.map((c) => (
                            <SelectItem key={c.id} value={c.id}>
                              {c.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : cond.field === 'assignee' ? (
                      <Select
                        value={cond.value}
                        onValueChange={(v) => updateCondition(cond.id, 'value', v)}
                      >
                        <SelectTrigger className="flex-1">
                          <SelectValue placeholder="Valore" />
                        </SelectTrigger>
                        <SelectContent>
                          {members.map((m) => (
                            <SelectItem key={m.id} value={m.id}>
                              {m.full_name || m.email}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <Input
                        className="flex-1"
                        placeholder="Valore"
                        value={cond.value}
                        onChange={(e) => updateCondition(cond.id, 'value', e.target.value)}
                      />
                    )}
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="shrink-0"
                      onClick={() => removeCondition(cond.id)}
                    >
                      <Trash2 className="h-3.5 w-3.5 text-red-400" />
                    </Button>
                  </div>
                ))}
              </div>
            )}

            {trigger && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="flex items-center gap-1.5">
                    <span className="flex items-center justify-center w-5 h-5 rounded-full bg-teal-500 text-white text-xs font-bold">
                      {step >= 3 ? <Check className="h-3 w-3" /> : '3'}
                    </span>
                    Azioni
                  </Label>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={() => { addAction(); setStep(3); }}
                  >
                    <Plus className="h-3.5 w-3.5" />
                  </Button>
                </div>
                {actions.map((action) => {
                  const aType = getActionType(action.type);
                  return (
                    <div key={action.id} className="flex flex-col gap-1.5 rounded-lg border border-border/60 p-2.5">
                      <div className="flex gap-2">
                        <Select
                          value={action.type}
                          onValueChange={(v) => updateAction(action.id, 'type', v)}
                        >
                          <SelectTrigger className="flex-1">
                            <SelectValue placeholder="Azione" />
                          </SelectTrigger>
                          <SelectContent>
                            {ACTION_TYPES.map((a) => (
                              <SelectItem key={a.type} value={a.type}>
                                {a.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="shrink-0"
                          onClick={() => removeAction(action.id)}
                        >
                          <Trash2 className="h-3.5 w-3.5 text-red-400" />
                        </Button>
                      </div>
                      {aType?.hasTarget && (
                        <div>
                          {aType.targetType === 'member' ? (
                            <Select
                              value={action.target}
                              onValueChange={(v) => updateAction(action.id, 'target', v)}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Seleziona membro" />
                              </SelectTrigger>
                              <SelectContent>
                                {members.map((m) => (
                                  <SelectItem key={m.id} value={m.id}>
                                    {m.full_name || m.email}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          ) : aType.targetType === 'column' ? (
                            <Select
                              value={action.target}
                              onValueChange={(v) => updateAction(action.id, 'target', v)}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Seleziona colonna" />
                              </SelectTrigger>
                              <SelectContent>
                                {columns.map((c) => (
                                  <SelectItem key={c.id} value={c.id}>
                                    {c.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          ) : aType.targetType === 'priority' ? (
                            <div className="flex gap-1.5">
                              {(['low', 'medium', 'high'] as const).map((p) => (
                                <Button
                                  key={p}
                                  type="button"
                                  size="sm"
                                  variant={action.target === p ? 'default' : 'outline'}
                                  className={cn(action.target === p && 'bg-teal-500 hover:bg-teal-600')}
                                  onClick={() => updateAction(action.id, 'target', p)}
                                >
                                  {p === 'low' ? 'Bassa' : p === 'medium' ? 'Media' : 'Alta'}
                                </Button>
                              ))}
                            </div>
                          ) : aType.targetType === 'number' ? (
                            <Input
                              type="number"
                              placeholder="Giorni"
                              value={action.target}
                              onChange={(e) => updateAction(action.id, 'target', e.target.value)}
                            />
                          ) : aType.targetType === 'label' ? (
                            <Input
                              placeholder="Nome label"
                              value={action.target}
                              onChange={(e) => updateAction(action.id, 'target', e.target.value)}
                            />
                          ) : null}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setBuilderOpen(false)} disabled={saving}>
              Annulla
            </Button>
            <Button
              onClick={handleSave}
              disabled={saving || !trigger || actions.length === 0}
              className="bg-teal-500 hover:bg-teal-600"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Salva regola'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
