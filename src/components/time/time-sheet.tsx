'use client';

import { useState, useEffect } from 'react';
import { Clock, Plus, Loader2 } from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import type { TimeEntry } from '@/lib/database.types';

interface TimeSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workspaceId: string;
  runningEntry?: { id: string; task_id: string; started_at: string; task_title?: string } | null;
}

interface EnrichedEntry extends TimeEntry {
  task_title?: string;
  user_name?: string;
}

function formatDuration(seconds: number | null): string {
  if (!seconds) return '0m';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

export function TimeSheet({ open, onOpenChange, workspaceId, runningEntry }: TimeSheetProps) {
  const { toast } = useToast();
  const [entries, setEntries] = useState<EnrichedEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [manualTaskId, setManualTaskId] = useState('');
  const [manualStartedAt, setManualStartedAt] = useState('');
  const [manualEndedAt, setManualEndedAt] = useState('');
  const [manualDesc, setManualDesc] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    fetch(
      `/api/time/entries?workspaceId=${workspaceId}&dateFrom=${todayStart.toISOString()}`
    )
      .then((r) => r.json())
      .then((data) => setEntries(data.entries || []))
      .catch(() => setEntries([]))
      .finally(() => setLoading(false));
  }, [open, workspaceId]);

  const totalSeconds = entries.reduce((acc, e) => acc + (e.duration_seconds || 0), 0);

  const handleAddManual = async () => {
    if (!manualTaskId.trim() || !manualStartedAt || !manualEndedAt) {
      toast({ variant: 'destructive', title: 'Compila tutti i campi obbligatori' });
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch('/api/time/entries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          taskId: manualTaskId.trim(),
          startedAt: new Date(manualStartedAt).toISOString(),
          endedAt: new Date(manualEndedAt).toISOString(),
          description: manualDesc,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error);
      }
      const data = await res.json();
      setEntries((prev) => [data.entry, ...prev]);
      setShowAddForm(false);
      setManualTaskId('');
      setManualStartedAt('');
      setManualEndedAt('');
      setManualDesc('');
      toast({ title: 'Entry aggiunta' });
    } catch (e) {
      toast({
        variant: 'destructive',
        title: 'Errore',
        description: e instanceof Error ? e.message : 'Creazione fallita',
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-sm border-border/60">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-teal-400" />
            Time Tracking
          </SheetTitle>
        </SheetHeader>

        <div className="mt-6 space-y-4">
          {runningEntry && (
            <div className="rounded-lg border border-red-500/30 bg-red-500/5 p-3">
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-red-500 animate-pulse" />
                <p className="text-xs font-medium text-red-400">Timer in esecuzione</p>
              </div>
              <p className="text-xs text-muted-foreground mt-1 truncate">
                {runningEntry.task_title || runningEntry.task_id}
              </p>
            </div>
          )}

          <div className="flex items-center justify-between">
            <div>
              <p className="text-2xl font-bold tabular-nums text-teal-400">
                {formatDuration(totalSeconds)}
              </p>
              <p className="text-xs text-muted-foreground">Totale oggi</p>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="h-8"
              onClick={() => setShowAddForm(!showAddForm)}
            >
              <Plus className="h-3.5 w-3.5 mr-1" /> Manuale
            </Button>
          </div>

          {showAddForm && (
            <div className="rounded-lg border border-border/60 p-3 space-y-3">
              <div className="space-y-1.5">
                <Label className="text-xs">ID Task</Label>
                <Input
                  className="h-8 text-xs"
                  placeholder="ID del task"
                  value={manualTaskId}
                  onChange={(e) => setManualTaskId(e.target.value)}
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1.5">
                  <Label className="text-xs">Inizio</Label>
                  <Input
                    type="datetime-local"
                    className="h-8 text-xs"
                    value={manualStartedAt}
                    onChange={(e) => setManualStartedAt(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Fine</Label>
                  <Input
                    type="datetime-local"
                    className="h-8 text-xs"
                    value={manualEndedAt}
                    onChange={(e) => setManualEndedAt(e.target.value)}
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Descrizione</Label>
                <Input
                  className="h-8 text-xs"
                  placeholder="Cosa hai fatto?"
                  value={manualDesc}
                  onChange={(e) => setManualDesc(e.target.value)}
                />
              </div>
              <Button size="sm" onClick={handleAddManual} disabled={submitting} className="w-full h-8">
                {submitting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'Salva'}
              </Button>
            </div>
          )}

          <div className="space-y-1">
            <Label className="text-xs">Entry di oggi</Label>
            {loading ? (
              <p className="text-xs text-muted-foreground py-4">Caricamento...</p>
            ) : entries.length === 0 ? (
              <p className="text-xs text-muted-foreground py-4">Nessuna entry oggi.</p>
            ) : (
              <ScrollArea className="max-h-72">
                <div className="space-y-1.5">
                  {entries.map((entry) => (
                    <div
                      key={entry.id}
                      className={cn(
                        'flex items-center justify-between gap-2 rounded-lg border border-border/60 px-3 py-2',
                        entry.is_running && 'border-teal-500/30 bg-teal-500/5'
                      )}
                    >
                      <div className="min-w-0 flex-1">
                        <p className="text-xs truncate">
                          {entry.task_title || entry.task_id}
                        </p>
                        <p className="text-[10px] text-muted-foreground">
                          {new Date(entry.started_at).toLocaleTimeString('it-IT', {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                          {entry.ended_at && (
                            <>
                              {' - '}
                              {new Date(entry.ended_at).toLocaleTimeString('it-IT', {
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </>
                          )}
                        </p>
                      </div>
                      <Badge variant="secondary" className="text-[10px] shrink-0">
                        {formatDuration(entry.duration_seconds)}
                      </Badge>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
