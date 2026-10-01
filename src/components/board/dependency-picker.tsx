'use client';

import { useState, useEffect, useCallback } from 'react';
import { Search, Check, Loader2, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import type { TaskDependency } from '@/lib/database.types';

interface DependencyPickerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  taskId: string;
  workspaceId: string;
  existingDeps: Array<TaskDependency & { dependsOn?: { id: string; title: string } & Record<string, unknown> }>;
  onAdd: (dependsOnId: string, depType: 'blocks' | 'blocked_by') => Promise<void>;
  onRemove: (depId: string) => Promise<void>;
}

interface SearchResult {
  task_id: string;
  task_title: string;
  column_name: string;
  board_name: string;
}

export function DependencyPicker({
  open,
  onOpenChange,
  taskId,
  workspaceId,
  existingDeps,
  onAdd,
  onRemove,
}: DependencyPickerProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [depType, setDepType] = useState<'blocks' | 'blocked_by'>('blocks');
  const [addingId, setAddingId] = useState<string | null>(null);

  const search = useCallback(async () => {
    if (!query.trim()) {
      setResults([]);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(
        `/api/workspaces/${workspaceId}/search-tasks?q=${encodeURIComponent(query)}`
      );
      const data = await res.json();
      setResults((data.tasks || []).filter((t: SearchResult) => t.task_id !== taskId));
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, [query, workspaceId, taskId]);

  useEffect(() => {
    if (!open) return;
    const timer = setTimeout(search, 300);
    return () => clearTimeout(timer);
  }, [open, search]);

  const depIds = new Set(existingDeps.map((d) => d.depends_on_id));
  const depNodes = existingDeps.map((d) => ({
    id: d.id,
    taskId: d.depends_on_id,
    title: (d.dependsOn as { title?: string } | undefined)?.title || 'Task sconosciuto',
  }));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[calc(100vw-2rem)] max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            Dipendenze task
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {depNodes.length > 0 && (
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-2">
                Dipendenze attuali
              </p>
              <div className="space-y-1.5">
                {depNodes.map((dep) => (
                  <div
                    key={dep.id}
                    className="flex items-center justify-between rounded-lg border border-border/60 px-3 py-2 text-sm"
                  >
                    <span className="truncate">{dep.title}</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-red-400 hover:text-red-300 h-7 text-xs"
                      onClick={() => onRemove(dep.id)}
                    >
                      Rimuovi
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="space-y-2">
            <label className="text-xs font-medium text-muted-foreground">Tipo dipendenza</label>
            <Select value={depType} onValueChange={(v) => setDepType(v as 'blocks' | 'blocked_by')}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="blocks">Blocca</SelectItem>
                <SelectItem value="blocked_by">Bloccato da</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              className="pl-9"
              placeholder="Cerca task..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>

          <ScrollArea className="max-h-64">
            {loading ? (
              <div className="flex items-center justify-center py-6">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : results.length === 0 && query.trim() ? (
              <p className="text-sm text-muted-foreground text-center py-6">
                Nessun task trovato.
              </p>
            ) : (
              <div className="space-y-1">
                {results.map((r) => {
                  const isLinked = depIds.has(r.task_id);
                  return (
                    <button
                      key={r.task_id}
                      type="button"
                      disabled={isLinked || addingId === r.task_id}
                      onClick={async () => {
                        setAddingId(r.task_id);
                        try {
                          await onAdd(r.task_id, depType);
                        } finally {
                          setAddingId(null);
                        }
                      }}
                      className={cn(
                        'w-full flex items-center justify-between rounded-lg border border-border/60 px-3 py-2.5 text-sm text-left transition-colors',
                        isLinked
                          ? 'bg-teal-500/5 border-teal-500/30'
                          : 'hover:bg-muted/30'
                      )}
                    >
                      <div className="min-w-0 flex-1">
                        <p className="font-medium truncate">{r.task_title}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {r.board_name} / {r.column_name}
                        </p>
                      </div>
                      {addingId === r.task_id ? (
                        <Loader2 className="h-4 w-4 animate-spin shrink-0 ml-2" />
                      ) : isLinked ? (
                        <Check className="h-4 w-4 text-teal-500 shrink-0 ml-2" />
                      ) : (
                        <Badge variant="outline" className="text-[10px] shrink-0 ml-2">
                          <ArrowRight className="h-3 w-3 mr-0.5" />
                          {depType === 'blocks' ? 'Blocca' : 'Dipende'}
                        </Badge>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </ScrollArea>
        </div>
      </DialogContent>
    </Dialog>
  );
}
