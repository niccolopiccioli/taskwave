'use client';

import { useState, useEffect } from 'react';
import { Bookmark, X, Loader2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import type { SavedFilter } from '@/lib/database.types';

interface SavedFilterListProps {
  workspaceId: string;
  onLoadFilter: (filter: SavedFilter) => void;
  refreshKey?: number;
}

export function SavedFilterList({ workspaceId, onLoadFilter, refreshKey }: SavedFilterListProps) {
  const { toast } = useToast();
  const [filters, setFilters] = useState<SavedFilter[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/workspaces/${workspaceId}/saved-filters`)
      .then((r) => r.json())
      .then((data) => setFilters(data.filters || []))
      .catch(() => setFilters([]))
      .finally(() => setLoading(false));
  }, [workspaceId, refreshKey]);

  const handleDelete = async (filterId: string) => {
    if (!confirm('Eliminare questo filtro salvato?')) return;
    try {
      const res = await fetch(`/api/workspaces/${workspaceId}/saved-filters/${filterId}`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error('Errore eliminazione');
      setFilters((prev) => prev.filter((f) => f.id !== filterId));
      toast({ title: 'Filtro eliminato' });
    } catch (e) {
      toast({
        variant: 'destructive',
        title: 'Errore',
        description: e instanceof Error ? e.message : 'Eliminazione fallita',
      });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <Loader2 className="h-3 w-3 animate-spin" /> Caricamento filtri...
      </div>
    );
  }

  if (filters.length === 0) return null;

  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      <Bookmark className="h-3.5 w-3.5 text-teal-400 shrink-0" />
      {filters.map((filter) => (
        <Badge
          key={filter.id}
          variant="outline"
          className="gap-1 pl-2 pr-1 h-7 text-xs cursor-pointer border-teal-500/30 hover:bg-teal-500/10 transition-colors"
          onClick={() => onLoadFilter(filter)}
        >
          {filter.name}
          <Button
            variant="ghost"
            size="icon"
            className="h-4 w-4 ml-0.5 text-muted-foreground hover:text-red-400"
            onClick={(e) => {
              e.stopPropagation();
              handleDelete(filter.id);
            }}
          >
            <X className="h-2.5 w-2.5" />
          </Button>
        </Badge>
      ))}
    </div>
  );
}
