'use client';

import { useState } from 'react';
import { Filter, X, Save, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from '@/components/ui/dropdown-menu';
import type { Profile, Label as LabelType } from '@/lib/database.types';
import { useToast } from '@/hooks/use-toast';

interface FilterChip {
  id: string;
  type: 'priority' | 'assignee' | 'due' | 'label';
  label: string;
  value: string;
}

interface FilterBarProps {
  filters: FilterChip[];
  onFiltersChange: (filters: FilterChip[]) => void;
  workspaceId: string;
  members?: Profile[];
  labels?: LabelType[];
}

export function FilterBar({
  filters,
  onFiltersChange,
  workspaceId,
  members = [],
  labels = [],
}: FilterBarProps) {
  const { toast } = useToast();
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [saveName, setSaveName] = useState('');
  const [saving, setSaving] = useState(false);

  const removeFilter = (id: string) => {
    onFiltersChange(filters.filter((f) => f.id !== id));
  };

  const addFilter = (type: FilterChip['type'], label: string, value: string) => {
    const id = `${type}:${value}`;
    if (filters.some((f) => f.id === id)) return;
    onFiltersChange([...filters, { id, type, label, value }]);
  };

  const duePresets = [
    { label: 'Oggi', value: 'today' },
    { label: 'Questa settimana', value: 'thisWeek' },
    { label: 'Scaduti', value: 'overdue' },
  ];

  const priorityOptions = [
    { label: 'Alta', value: 'high' },
    { label: 'Media', value: 'medium' },
    { label: 'Bassa', value: 'low' },
  ];

  const handleSaveFilter = async () => {
    if (!saveName.trim()) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/workspaces/${workspaceId}/saved-filters`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: saveName.trim(),
          filter_config: { chips: filters },
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error);
      }
      toast({ title: 'Filtro salvato' });
      setSaveDialogOpen(false);
      setSaveName('');
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

  return (
    <>
      <div className="flex items-center gap-2 flex-wrap">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="h-8 gap-1.5">
              <Filter className="h-3.5 w-3.5" /> Filtri
              <ChevronDown className="h-3 w-3" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-48">
            <DropdownMenuLabel className="text-[10px] uppercase text-muted-foreground">
              Priorità
            </DropdownMenuLabel>
            {priorityOptions.map((p) => (
              <DropdownMenuItem key={p.value} onClick={() => addFilter('priority', `Priorità: ${p.label}`, p.value)}>
                {p.label}
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator />

            {members.length > 0 && (
              <>
                <DropdownMenuLabel className="text-[10px] uppercase text-muted-foreground">
                  Assegnatario
                </DropdownMenuLabel>
                {members.map((m) => (
                  <DropdownMenuItem
                    key={m.id}
                    onClick={() => addFilter('assignee', m.full_name || m.email, m.id)}
                  >
                    {m.full_name || m.email}
                  </DropdownMenuItem>
                ))}
                <DropdownMenuSeparator />
              </>
            )}

            <DropdownMenuLabel className="text-[10px] uppercase text-muted-foreground">
              Data scadenza
            </DropdownMenuLabel>
            {duePresets.map((d) => (
              <DropdownMenuItem key={d.value} onClick={() => addFilter('due', d.label, d.value)}>
                {d.label}
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator />

            {labels.length > 0 && (
              <>
                <DropdownMenuLabel className="text-[10px] uppercase text-muted-foreground">
                  Label
                </DropdownMenuLabel>
                {labels.map((l) => (
                  <DropdownMenuItem key={l.id} onClick={() => addFilter('label', l.name, l.id)}>
                    <span
                      className="h-2 w-2 rounded-full mr-2 inline-block"
                      style={{ backgroundColor: l.color }}
                    />
                    {l.name}
                  </DropdownMenuItem>
                ))}
                <DropdownMenuSeparator />
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>

        {filters.map((filter) => (
          <Badge
            key={filter.id}
            variant="secondary"
            className="gap-1 pl-2 pr-1 h-7 text-xs cursor-pointer"
            onClick={() => removeFilter(filter.id)}
          >
            {filter.label}
            <X className="h-3 w-3 ml-0.5" />
          </Badge>
        ))}

        {filters.length > 0 && (
          <>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs text-muted-foreground"
              onClick={() => onFiltersChange([])}
            >
              Cancella filtri
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs text-teal-400"
              onClick={() => setSaveDialogOpen(true)}
            >
              <Save className="h-3 w-3 mr-1" /> Salva filtro
            </Button>
          </>
        )}
      </div>

      <Dialog open={saveDialogOpen} onOpenChange={setSaveDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Salva filtro</DialogTitle>
            <DialogDescription>
              Assegna un nome a questo filtro per usarlo in futuro.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div className="space-y-2">
              <Label htmlFor="save-filter-name">Nome</Label>
              <Input
                id="save-filter-name"
                placeholder="Es: Task urgenti"
                value={saveName}
                onChange={(e) => setSaveName(e.target.value)}
              />
            </div>
            <div className="flex gap-2">
              {filters.map((f) => (
                <Badge key={f.id} variant="secondary" className="text-xs">
                  {f.label}
                </Badge>
              ))}
            </div>
            <Button
              onClick={handleSaveFilter}
              disabled={saving || !saveName.trim()}
              className="w-full"
            >
              {saving ? 'Salvataggio...' : 'Salva'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

export type { FilterChip };
