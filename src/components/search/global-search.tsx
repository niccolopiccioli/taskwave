'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Search, Loader2, LayoutGrid, ListTodo } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';

interface GlobalSearchProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workspaceId: string;
}

interface SearchResult {
  task_id: string;
  task_title: string;
  task_description: string;
  task_priority: string;
  task_due_date: string;
  column_id: string;
  column_name: string;
  board_id: string;
  board_name: string;
  assignee_name: string | null;
  rank: number;
}

const priorityLabels: Record<string, string> = {
  high: 'Alta',
  medium: 'Media',
  low: 'Bassa',
};

const priorityBadgeColors: Record<string, string> = {
  high: 'bg-red-500/10 text-red-400 border-red-500/30',
  medium: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
  low: 'bg-muted text-muted-foreground border-border',
};

export function GlobalSearch({ open, onOpenChange, workspaceId }: GlobalSearchProps) {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (open) {
      setQuery('');
      setResults([]);
      setSelectedIndex(-1);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [open]);

  const doSearch = useCallback(
    async (q: string) => {
      if (!q.trim()) {
        setResults([]);
        setLoading(false);
        return;
      }
      setLoading(true);
      try {
        const params = new URLSearchParams({ q: q.trim(), workspaceId, limit: '15' });
        const res = await fetch(`/api/search?${params}`);
        if (!res.ok) throw new Error('Search failed');
        const data = await res.json();
        setResults(data.results || []);
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    },
    [workspaceId]
  );

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    setSelectedIndex(-1);
    debounceRef.current = setTimeout(() => doSearch(query), 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, doSearch]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => Math.min(prev + 1, results.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => Math.max(prev - 1, -1));
    } else if (e.key === 'Enter' && selectedIndex >= 0 && results[selectedIndex]) {
      e.preventDefault();
      const r = results[selectedIndex];
      onOpenChange(false);
      router.push(
        `/workspace/${workspaceId}/board/${r.board_id}/task/${r.task_id}`
      );
    }
  };

  const groups = {
    tasks: results,
    boards: [] as { id: string; name: string }[],
    members: [] as { id: string; name: string }[],
  };

  const boardMap = new Map<string, { id: string; name: string }>();
  for (const r of results) {
    if (!boardMap.has(r.board_id)) {
      boardMap.set(r.board_id, { id: r.board_id, name: r.board_name });
    }
  }
  groups.boards = Array.from(boardMap.values());

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="p-0 gap-0 max-w-xl overflow-hidden">
        <DialogHeader className="px-4 pt-4 pb-2">
          <DialogTitle className="sr-only">Ricerca globale</DialogTitle>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              ref={inputRef}
              placeholder="Cerca task, board..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              className="pl-9 border-0 focus-visible:ring-0 shadow-none text-base"
            />
          </div>
        </DialogHeader>

        <ScrollArea className="max-h-80">
          <div className="px-2 py-1">
            {loading && (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              </div>
            )}

            {!loading && query.trim() && results.length === 0 && (
              <p className="text-center text-sm text-muted-foreground py-8">
                Nessun risultato
              </p>
            )}

            {!loading && !query.trim() && (
              <p className="text-center text-sm text-muted-foreground py-8">
                Inizia a digitare per cercare...
              </p>
            )}

            {!loading && results.length > 0 && (
              <div className="space-y-3 py-1">
                {groups.tasks.length > 0 && (
                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground px-2 py-1 flex items-center gap-1.5">
                      <ListTodo className="h-3 w-3" /> Task
                    </p>
                    {groups.tasks.map((r, idx) => {
                      const globalIdx = idx;
                      return (
                        <button
                          key={r.task_id}
                          type="button"
                          className={cn(
                            'flex w-full items-start gap-3 px-3 py-2 rounded-lg text-left hover:bg-muted/60 transition-colors',
                            selectedIndex === globalIdx && 'bg-muted/80'
                          )}
                          onClick={() => {
                            onOpenChange(false);
                            router.push(
                              `/workspace/${workspaceId}/board/${r.board_id}/task/${r.task_id}`
                            );
                          }}
                        >
                          <div className="flex-1 min-w-0">
                            <p className="text-sm truncate">{r.task_title}</p>
                            <p className="text-[10px] text-muted-foreground">
                              {r.board_name} &middot; {r.column_name}
                            </p>
                          </div>
                          <Badge
                            variant="outline"
                            className={cn('text-[10px] px-1.5 py-0', priorityBadgeColors[r.task_priority])}
                          >
                            {priorityLabels[r.task_priority] || r.task_priority}
                          </Badge>
                        </button>
                      );
                    })}
                  </div>
                )}

                {groups.boards.length > 0 && (
                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground px-2 py-1 flex items-center gap-1.5">
                      <LayoutGrid className="h-3 w-3" /> Board
                    </p>
                    {groups.boards.map((b) => (
                      <div
                        key={b.id}
                        className="flex items-center gap-3 px-3 py-2 text-sm text-muted-foreground"
                      >
                        <LayoutGrid className="h-3.5 w-3.5" />
                        {b.name}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </ScrollArea>

        <p className="text-[10px] text-muted-foreground text-center py-2 border-t border-border/40">
          <kbd className="px-1 py-0.5 rounded bg-muted text-[9px]">↑↓</kbd> Naviga{' '}
          <kbd className="px-1 py-0.5 rounded bg-muted text-[9px]">↵</kbd> Apri{' '}
          <kbd className="px-1 py-0.5 rounded bg-muted text-[9px]">Esc</kbd> Chiudi
        </p>
      </DialogContent>
    </Dialog>
  );
}
