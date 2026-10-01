'use client';

import { useState, useEffect } from 'react';
import {
  Loader2,
  Target,
  Link,
  Unlink,
  Plus,
  Calendar,
  History,
} from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import type { Goal } from '@/lib/database.types';

interface GoalDetailSheetProps {
  goal: (Goal & { children?: Goal[] }) | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workspaceId: string;
  onUpdated: () => void;
  isAdmin?: boolean;
}

interface LinkedTask {
  id: string;
  title: string;
  boardName?: string;
  columnName?: string;
}

interface AuditEntry {
  id: string;
  action: string;
  actor?: { full_name?: string | null; email?: string } | null;
  created_at: string;
}

const statusLabels: Record<string, string> = {
  active: 'Attivo',
  completed: 'Completato',
  cancelled: 'Annullato',
  archived: 'Archiviato',
};

const units = ['%', 'numero', '€', 'ore', 'giorni', 'punti'];

export function GoalDetailSheet({
  goal,
  open,
  onOpenChange,
  workspaceId,
  onUpdated,
  isAdmin,
}: GoalDetailSheetProps) {
  const { toast } = useToast();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [targetValue, setTargetValue] = useState(0);
  const [currentValue, setCurrentValue] = useState(0);
  const [unit, setUnit] = useState('%');
  const [dueDate, setDueDate] = useState('');
  const [status, setStatus] = useState('active');
  const [saving, setSaving] = useState(false);
  const [linkedTasks, setLinkedTasks] = useState<LinkedTask[]>([]);
  const [loadingTasks, setLoadingTasks] = useState(false);
  const [auditLog, setAuditLog] = useState<AuditEntry[]>([]);
  const [activeTab, setActiveTab] = useState<'details' | 'tasks' | 'history'>('details');

  useEffect(() => {
    if (goal) {
      setTitle(goal.title);
      setDescription(goal.description || '');
      setTargetValue(goal.target_value);
      setCurrentValue(goal.current_value);
      setUnit(goal.unit || '%');
      setDueDate(goal.due_date ? goal.due_date.slice(0, 10) : '');
      setStatus(goal.status);
    }
  }, [goal]);

  useEffect(() => {
    if (!open || !goal) return;
    setLoadingTasks(true);
    fetch(`/api/goals/${goal.id}/tasks`)
      .then((r) => r.json())
      .then((data) => setLinkedTasks(data.tasks || []))
      .catch(() => setLinkedTasks([]))
      .finally(() => setLoadingTasks(false));

    fetch(`/api/workspaces/${workspaceId}/goals/${goal.id}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.auditEntries) setAuditLog(data.auditEntries);
      })
      .catch(() => {});
  }, [open, goal, workspaceId]);

  if (!goal) return null;

  const progress = targetValue > 0
    ? Math.min(Math.round((currentValue / targetValue) * 100), 100)
    : 0;

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch(`/api/workspaces/${workspaceId}/goals/${goal.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          description,
          target_value: targetValue,
          current_value: currentValue,
          unit,
          due_date: dueDate ? new Date(dueDate).toISOString() : null,
          status,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error);
      }
      toast({ title: 'Goal aggiornato' });
      onUpdated();
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

  const handleUnlinkTask = async (taskId: string) => {
    try {
      const res = await fetch(`/api/goals/${goal.id}/tasks?taskId=${taskId}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Errore scollegamento');
      setLinkedTasks((prev) => prev.filter((t) => t.id !== taskId));
      toast({ title: 'Task scollegato' });
    } catch (e) {
      toast({
        variant: 'destructive',
        title: 'Errore',
        description: e instanceof Error ? e.message : 'Operazione fallita',
      });
    }
  };

  const handleAddTask = async (taskId: string) => {
    try {
      const res = await fetch(`/api/goals/${goal.id}/tasks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ taskId }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error);
      }
      toast({ title: 'Task collegato' });
      onUpdated();
    } catch (e) {
      toast({
        variant: 'destructive',
        title: 'Errore',
        description: e instanceof Error ? e.message : 'Collegamento fallito',
      });
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-md overflow-y-auto border-border/60">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Target className="h-4 w-4 text-teal-400" />
            {goal.type === 'key_result' ? 'Key Result' : 'Obiettivo'}
          </SheetTitle>
        </SheetHeader>

        <div className="mt-6 space-y-2">
          <div className="flex gap-1 mb-2">
            {(['details', 'tasks', 'history'] as const).map((tab) => (
              <Button
                key={tab}
                variant={activeTab === tab ? 'default' : 'outline'}
                size="sm"
                className="text-xs h-7"
                onClick={() => setActiveTab(tab)}
              >
                {tab === 'details' && 'Dettagli'}
                {tab === 'tasks' && 'Task'}
                {tab === 'history' && 'Storico'}
              </Button>
            ))}
          </div>

          {activeTab === 'details' && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="goal-title">Titolo</Label>
                <Input
                  id="goal-title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  disabled={!isAdmin}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="goal-desc">Descrizione</Label>
                <Textarea
                  id="goal-desc"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                  disabled={!isAdmin}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="goal-target">Target</Label>
                  <Input
                    id="goal-target"
                    type="number"
                    value={targetValue}
                    onChange={(e) => setTargetValue(Number(e.target.value))}
                    disabled={!isAdmin}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Unità</Label>
                  <Select value={unit} onValueChange={setUnit} disabled={!isAdmin}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {units.map((u) => (
                        <SelectItem key={u} value={u}>{u}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="goal-current">Valore attuale</Label>
                  <Input
                    id="goal-current"
                    type="number"
                    value={currentValue}
                    onChange={(e) => setCurrentValue(Number(e.target.value))}
                    disabled={!isAdmin}
                  />
                </div>
                <div className="space-y-2">
                  <Label className="flex items-center gap-1.5">
                    <Calendar className="h-3.5 w-3.5" /> Scadenza
                  </Label>
                  <Input
                    type="date"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    disabled={!isAdmin}
                  />
                </div>
              </div>

              {isAdmin && (
                <div className="space-y-2">
                  <Label>Stato</Label>
                  <Select value={status} onValueChange={setStatus}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(statusLabels).map(([k, v]) => (
                        <SelectItem key={k} value={k}>{v}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="space-y-1.5">
                <Label>Progresso</Label>
                <Progress value={progress} className="h-3" />
                <p className="text-xs text-muted-foreground">
                  {currentValue} / {targetValue} {unit} &middot; {progress}%
                </p>
              </div>

              {isAdmin && (
                <Button onClick={handleSave} disabled={saving} className="w-full">
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Salva modifiche'}
                </Button>
              )}
            </div>
          )}

          {activeTab === 'tasks' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="flex items-center gap-1.5">
                  <Link className="h-3.5 w-3.5" /> Task collegati
                </Label>
                {isAdmin && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 text-xs"
                    onClick={() => {
                      const input = prompt('Inserisci ID del task da collegare:');
                      if (input?.trim()) handleAddTask(input.trim());
                    }}
                  >
                    <Plus className="h-3 w-3 mr-1" /> Aggiungi
                  </Button>
                )}
              </div>

              {loadingTasks ? (
                <p className="text-xs text-muted-foreground py-2">Caricamento...</p>
              ) : linkedTasks.length === 0 ? (
                <p className="text-xs text-muted-foreground py-2">Nessun task collegato.</p>
              ) : (
                <ScrollArea className="max-h-52">
                  <div className="space-y-1.5">
                    {linkedTasks.map((task) => (
                      <div
                        key={task.id}
                        className="flex items-center justify-between gap-2 rounded-lg border border-border/60 px-3 py-2 text-sm"
                      >
                        <div className="min-w-0">
                          <p className="truncate text-xs">{task.title}</p>
                          {task.boardName && (
                            <p className="text-[10px] text-muted-foreground">
                              {task.boardName}{task.columnName ? ` / ${task.columnName}` : ''}
                            </p>
                          )}
                        </div>
                        {isAdmin && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 text-red-400 shrink-0"
                            onClick={() => handleUnlinkTask(task.id)}
                          >
                            <Unlink className="h-3 w-3" />
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </div>
          )}

          {activeTab === 'history' && (
            <div className="space-y-3">
              <Label className="flex items-center gap-1.5">
                <History className="h-3.5 w-3.5" /> Attività
              </Label>
              {auditLog.length === 0 ? (
                <p className="text-xs text-muted-foreground">Nessuna attività recente.</p>
              ) : (
                <ScrollArea className="max-h-52">
                  <div className="space-y-2">
                    {auditLog.map((entry) => (
                      <div key={entry.id} className="text-xs border-l-2 border-teal-500/30 pl-2 py-1">
                        <p className="text-muted-foreground">{entry.action}</p>
                        <p className="text-[10px] text-muted-foreground/60">
                          {entry.actor?.full_name || entry.actor?.email || 'Sistema'} &middot;{' '}
                          {new Date(entry.created_at).toLocaleDateString('it-IT', {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </p>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </div>
          )}

          {goal.type === 'objective' && goal.children && goal.children.length > 0 && (
            <div className="space-y-2 pt-3 border-t border-border/60">
              <Label>Key Results</Label>
              {goal.children.map((kr) => {
                const krPct = kr.target_value > 0
                  ? Math.round((kr.current_value / kr.target_value) * 100)
                  : 0;
                return (
                  <div key={kr.id} className="rounded-lg border border-border/60 p-2.5 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium truncate flex-1">{kr.title}</span>
                      <Badge variant="outline" className="text-[10px] ml-2 shrink-0">
                        {krPct}%
                      </Badge>
                    </div>
                    <Progress value={krPct} className="h-1.5" />
                    <p className="text-[10px] text-muted-foreground">
                      {kr.current_value} / {kr.target_value} {kr.unit || '%'}
                    </p>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
