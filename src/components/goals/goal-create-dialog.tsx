'use client';

import { useState, useEffect } from 'react';
import { Loader2, Target, Calendar, User } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import type { Goal, Profile } from '@/lib/database.types';

interface GoalCreateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workspaceId: string;
  parentGoals?: Goal[];
  members?: Profile[];
  onCreated: () => void;
}

const units = ['%', 'numero', '€', 'ore', 'giorni', 'punti'];

export function GoalCreateDialog({
  open,
  onOpenChange,
  workspaceId,
  parentGoals = [],
  members = [],
  onCreated,
}: GoalCreateDialogProps) {
  const { toast } = useToast();
  const [type, setType] = useState<'objective' | 'key_result'>('objective');
  const [parentId, setParentId] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [targetValue, setTargetValue] = useState(100);
  const [unit, setUnit] = useState('%');
  const [dueDate, setDueDate] = useState('');
  const [ownerId, setOwnerId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (open) {
      setType('objective');
      setParentId(null);
      setTitle('');
      setDescription('');
      setTargetValue(100);
      setUnit('%');
      setDueDate('');
      setOwnerId(null);
    }
  }, [open]);

  const handleCreate = async () => {
    if (!title.trim()) {
      toast({ variant: 'destructive', title: 'Titolo obbligatorio' });
      return;
    }

    setCreating(true);
    try {
      const res = await fetch(`/api/workspaces/${workspaceId}/goals`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          description,
          type,
          parent_id: type === 'key_result' ? parentId : null,
          target_value: targetValue,
          unit,
          due_date: dueDate ? new Date(dueDate).toISOString() : null,
          owner_id: ownerId,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error);
      }

      toast({ title: 'Goal creato' });
      onOpenChange(false);
      onCreated();
    } catch (e) {
      toast({
        variant: 'destructive',
        title: 'Errore',
        description: e instanceof Error ? e.message : 'Creazione fallita',
      });
    } finally {
      setCreating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Target className="h-5 w-5 text-teal-400" />
            Nuovo Goal
          </DialogTitle>
          <DialogDescription>
            Crea un obiettivo o un key result per il workspace.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 mt-2">
          <div className="space-y-2">
            <Label>Tipo</Label>
            <div className="flex gap-2">
              <Button
                type="button"
                size="sm"
                variant={type === 'objective' ? 'default' : 'outline'}
                onClick={() => setType('objective')}
                className="flex-1"
              >
                Obiettivo
              </Button>
              <Button
                type="button"
                size="sm"
                variant={type === 'key_result' ? 'default' : 'outline'}
                onClick={() => setType('key_result')}
                className="flex-1"
              >
                Key Result
              </Button>
            </div>
          </div>

          {type === 'key_result' && parentGoals.length > 0 && (
            <div className="space-y-2">
              <Label>Obiettivo parent</Label>
              <Select
                value={parentId || ''}
                onValueChange={(v) => setParentId(v || null)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleziona obiettivo..." />
                </SelectTrigger>
                <SelectContent>
                  {parentGoals.map((g) => (
                    <SelectItem key={g.id} value={g.id}>
                      {g.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="goal-title-create">Titolo</Label>
            <Input
              id="goal-title-create"
              placeholder="Es: Aumentare le vendite del 20%"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="goal-desc-create">Descrizione</Label>
            <Textarea
              id="goal-desc-create"
              placeholder="Dettagli dell'obiettivo..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="goal-target-create">Valore target</Label>
              <Input
                id="goal-target-create"
                type="number"
                min={0}
                value={targetValue}
                onChange={(e) => setTargetValue(Number(e.target.value))}
              />
            </div>
            <div className="space-y-2">
              <Label>Unità</Label>
              <Select value={unit} onValueChange={setUnit}>
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

          {members.length > 0 && (
            <div className="space-y-2">
              <Label className="flex items-center gap-1.5">
                <User className="h-3.5 w-3.5" /> Proprietario
              </Label>
              <Select
                value={ownerId || 'none'}
                onValueChange={(v) => setOwnerId(v === 'none' ? null : v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Nessuno" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Nessuno</SelectItem>
                  {members.map((m) => (
                    <SelectItem key={m.id} value={m.id}>
                      {m.full_name || m.email}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="goal-due-create" className="flex items-center gap-1.5">
              <Calendar className="h-3.5 w-3.5" /> Data scadenza
            </Label>
            <Input
              id="goal-due-create"
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
            />
          </div>

          <Button onClick={handleCreate} disabled={creating} className="w-full">
            {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Crea goal'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
