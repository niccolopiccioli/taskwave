'use client';

import { useState } from 'react';
import {
  ArrowRight,
  Archive,
  Calendar,
  Trash2,
  Users,
  Loader2,
  X,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import type { TaskPriority, Profile } from '@/lib/database.types';
import { useToast } from '@/hooks/use-toast';

interface BulkActionBarProps {
  selectedCount: number;
  selectedTaskIds: string[];
  workspaceId: string;
  columns: Array<{ id: string; name: string }>;
  members: Profile[];
  onClear: () => void;
  onSuccess: () => void;
  className?: string;
}

type BulkAction = 'move' | 'assign' | 'priority' | 'due_date' | 'label' | 'archive' | 'delete';

export function BulkActionBar({
  selectedCount,
  selectedTaskIds,
  workspaceId,
  columns,
  members,
  onClear,
  onSuccess,
  className,
}: BulkActionBarProps) {
  const { toast } = useToast();
  const [dialog, setDialog] = useState<BulkAction | null>(null);
  const [targetColumn, setTargetColumn] = useState('');
  const [targetAssignee, setTargetAssignee] = useState('');
  const [targetPriority, setTargetPriority] = useState<TaskPriority>('medium');
  const [targetDate, setTargetDate] = useState('');
  const [saving, setSaving] = useState(false);

  if (selectedCount === 0) return null;

  const handleAction = async () => {
    setSaving(true);
    try {
      const body: Record<string, unknown> = {
        taskIds: selectedTaskIds,
        workspaceId,
        action: dialog,
      };
      switch (dialog) {
        case 'move':
          body.columnId = targetColumn;
          break;
        case 'assign':
          body.assigneeId = targetAssignee || null;
          break;
        case 'priority':
          body.priority = targetPriority;
          break;
        case 'due_date':
          body.dueDate = targetDate || null;
          break;
        case 'archive':
        case 'delete':
          break;
        case 'label':
          break;
      }

      const res = await fetch('/api/tasks/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Operazione fallita');
      }

      toast({ title: 'Operazione completata' });
      setDialog(null);
      onSuccess();
      onClear();
    } catch (e) {
      toast({
        variant: 'destructive',
        title: 'Errore',
        description: e instanceof Error ? e.message : 'Operazione fallita',
      });
    } finally {
      setSaving(false);
    }
  };

  const actions: Array<{
    key: BulkAction;
    label: string;
    icon: typeof ArrowRight;
  }> = [
    { key: 'move', label: 'Sposta', icon: ArrowRight },
    { key: 'assign', label: 'Assegna', icon: Users },
    { key: 'priority', label: 'Priorità', icon: ArrowRight },
    { key: 'due_date', label: 'Scadenza', icon: Calendar },
    { key: 'archive', label: 'Archivia', icon: Archive },
    { key: 'delete', label: 'Elimina', icon: Trash2 },
  ];

  const renderDialogContent = () => {
    switch (dialog) {
      case 'move':
        return (
          <div className="space-y-2">
            <Label>Sposta in colonna</Label>
            <Select value={targetColumn} onValueChange={setTargetColumn}>
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
          </div>
        );
      case 'assign':
        return (
          <div className="space-y-2">
            <Label>Assegna a</Label>
            <Select value={targetAssignee} onValueChange={setTargetAssignee}>
              <SelectTrigger>
                <SelectValue placeholder="Seleziona membro" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Nessuno</SelectItem>
                {members.map((m) => (
                  <SelectItem key={m.id} value={m.id}>
                    {m.full_name || m.email}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        );
      case 'priority':
        return (
          <div className="space-y-2">
            <Label>Imposta priorità</Label>
            <div className="flex gap-2">
              {(['low', 'medium', 'high'] as TaskPriority[]).map((p) => (
                <Button
                  key={p}
                  type="button"
                  size="sm"
                  variant={targetPriority === p ? 'default' : 'outline'}
                  onClick={() => setTargetPriority(p)}
                  className={cn(targetPriority === p && 'bg-teal-500 hover:bg-teal-600')}
                >
                  {p === 'low' ? 'Bassa' : p === 'medium' ? 'Media' : 'Alta'}
                </Button>
              ))}
            </div>
          </div>
        );
      case 'due_date':
        return (
          <div className="space-y-2">
            <Label>Imposta data scadenza</Label>
            <Input
              type="date"
              value={targetDate}
              onChange={(e) => setTargetDate(e.target.value)}
            />
          </div>
        );
      case 'archive':
        return (
          <p className="text-sm text-muted-foreground">
            Archiviare {selectedCount} task selezionati?
          </p>
        );
      case 'delete':
        return (
          <p className="text-sm text-red-400">
            Eliminare {selectedCount} task? Questa azione è irreversibile.
          </p>
        );
      default:
        return null;
    }
  };

  return (
    <>
      <div
        className={cn(
          'fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 rounded-xl border border-border/60 bg-card/95 backdrop-blur-xl px-4 py-3 shadow-2xl',
          className
        )}
      >
        <span className="text-sm font-medium mr-1">
          {selectedCount} selezionati
        </span>
        <div className="w-px h-5 bg-border/60" />
        {actions.map((a) => (
          <Button
            key={a.key}
            size="sm"
            variant="ghost"
            className="gap-1.5"
            onClick={() => setDialog(a.key)}
          >
            <a.icon className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">{a.label}</span>
          </Button>
        ))}
        <div className="w-px h-5 bg-border/60" />
        <Button
          size="sm"
          variant="ghost"
          className="text-muted-foreground"
          onClick={onClear}
        >
          <X className="h-3.5 w-3.5" />
        </Button>
      </div>

      <Dialog open={!!dialog} onOpenChange={(o) => !o && setDialog(null)}>
        <DialogContent className="w-[calc(100vw-2rem)] max-w-md">
          <DialogHeader>
            <DialogTitle>
              {dialog === 'move' && 'Sposta task'}
              {dialog === 'assign' && 'Assegna task'}
              {dialog === 'priority' && 'Cambia priorità'}
              {dialog === 'due_date' && 'Imposta scadenza'}
              {dialog === 'archive' && 'Archivia task'}
              {dialog === 'delete' && 'Elimina task'}
            </DialogTitle>
          </DialogHeader>
          <div className="py-4">{renderDialogContent()}</div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialog(null)} disabled={saving}>
              Annulla
            </Button>
            <Button
              onClick={handleAction}
              disabled={saving}
              className={dialog === 'delete' ? 'bg-red-500 hover:bg-red-600' : 'bg-teal-500 hover:bg-teal-600'}
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Conferma'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
