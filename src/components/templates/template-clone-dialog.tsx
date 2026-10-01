'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, LayoutGrid, Columns } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import type { Workspace } from '@/lib/database.types';

interface TemplateCloneDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  templateId: string;
  templateName: string;
  workspaces: Workspace[];
  onCloned?: (boardId: string, boardName: string) => void;
}

export function TemplateCloneDialog({
  open,
  onOpenChange,
  templateId,
  templateName,
  workspaces,
  onCloned,
}: TemplateCloneDialogProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [workspaceId, setWorkspaceId] = useState('');
  const [cloning, setCloning] = useState(false);
  const [preview, setPreview] = useState<{ columns: { name: string; taskCount: number }[] } | null>(null);

  useEffect(() => {
    if (open && templateId) {
      setWorkspaceId(workspaces[0]?.id || '');
      fetch(`/api/templates/${templateId}`)
        .then((r) => r.json())
        .then((data) => {
          const config = data.template?.board_config;
          if (config?.columns) {
            setPreview({
              columns: config.columns.map((c: { name: string; tasks?: { title: string }[] }) => ({
                name: c.name,
                taskCount: c.tasks?.length || 0,
              })),
            });
          } else {
            setPreview(null);
          }
        })
        .catch(() => setPreview(null));
    }
  }, [open, templateId, workspaces]);

  const handleClone = async () => {
    if (!workspaceId) return;
    setCloning(true);
    try {
      const res = await fetch(`/api/templates/${templateId}/clone`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workspaceId }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error);
      }
      const data = await res.json();
      toast({ title: 'Template clonato', description: data.message });
      onOpenChange(false);
      onCloned?.(data.board.id, data.board.name);
      router.push(`/workspace/${workspaceId}/board/${data.board.id}`);
    } catch (e) {
      toast({
        variant: 'destructive',
        title: 'Errore',
        description: e instanceof Error ? e.message : 'Clonazione fallita',
      });
    } finally {
      setCloning(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <LayoutGrid className="h-4 w-4 text-teal-400" />
            Clona template
          </DialogTitle>
          <DialogDescription>
            &quot;{templateName}&quot; sarà copiato nel workspace selezionato.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 mt-2">
          <div className="space-y-2">
            <Label>Workspace di destinazione</Label>
            <Select value={workspaceId} onValueChange={setWorkspaceId}>
              <SelectTrigger>
                <SelectValue placeholder="Seleziona workspace..." />
              </SelectTrigger>
              <SelectContent>
                {workspaces.map((ws) => (
                  <SelectItem key={ws.id} value={ws.id}>
                    {ws.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {preview && (
            <div className="space-y-2">
              <Label className="flex items-center gap-1.5">
                <Columns className="h-3.5 w-3.5" /> Colonne da creare
              </Label>
              <div className="space-y-1">
                {preview.columns.map((col) => (
                  <div
                    key={col.name}
                    className="flex items-center justify-between rounded-lg border border-border/60 px-3 py-1.5 text-xs"
                  >
                    <span>{col.name}</span>
                    <Badge variant="secondary" className="text-[10px]">
                      {col.taskCount} task
                    </Badge>
                  </div>
                ))}
              </div>
            </div>
          )}

          <Button
            onClick={handleClone}
            disabled={cloning || !workspaceId}
            className="w-full"
          >
            {cloning ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Clona'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
