'use client';

import { useState, useEffect } from 'react';
import {
  Calendar,
  MessageSquare,
  Paperclip,
  Loader2,
  Send,
  Trash2,
  Download,
  User,
} from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { PlanGate } from '@/components/plan/plan-gate';
import type { PlanTier, TaskPriority, Profile } from '@/lib/database.types';
import type { BoardWithColumns } from '@/lib/database.types';
import { createClient } from '@/lib/supabase/client';
import {
  updateTask,
  addComment,
  uploadTaskAttachment,
  deleteTask,
  getAttachmentDownloadUrl,
  deleteTaskAttachment,
} from '@/lib/data';
import { useToast } from '@/hooks/use-toast';
import { emitTaskEvent } from '@/lib/client-task-events';
import { hasFeature } from '@/lib/plans';
import type { TaskCustomField } from '@/lib/database.types';

type TaskWithDetails = BoardWithColumns['columns'][0]['tasks'][0];

interface TaskDetailSheetProps {
  task: TaskWithDetails | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  plan: PlanTier;
  workspaceId: string;
  workspaceMembers?: Profile[];
  onUpdated: () => void;
  onDeleted?: () => void;
}

const priorityLabels: Record<TaskPriority, string> = {
  low: 'Bassa',
  medium: 'Media',
  high: 'Alta',
};

export function TaskDetailSheet({
  task,
  open,
  onOpenChange,
  plan,
  workspaceId,
  workspaceMembers = [],
  onUpdated,
  onDeleted,
}: TaskDetailSheetProps) {
  const supabase = createClient();
  const { toast } = useToast();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [priority, setPriority] = useState<TaskPriority>('medium');
  const [assigneeId, setAssigneeId] = useState<string | null>(null);
  const [comment, setComment] = useState('');
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [customFields, setCustomFields] = useState<TaskCustomField[]>([]);
  const [customValues, setCustomValues] = useState<Record<string, string>>({});

  useEffect(() => {
    if (task) {
      setTitle(task.title);
      setDescription(task.description || '');
      setDueDate(task.due_date ? task.due_date.slice(0, 10) : '');
      setPriority(task.priority);
      setAssigneeId(task.assignee_id);
    }
  }, [task]);

  useEffect(() => {
    if (!open || !task || !hasFeature(plan, 'auditLog')) return;

    Promise.all([
      fetch(`/api/workspaces/${workspaceId}/custom-fields`).then((r) => r.json()),
      fetch(`/api/tasks/${task.id}/custom-values`).then((r) => r.json()),
    ])
      .then(([fieldsRes, valuesRes]) => {
        setCustomFields(fieldsRes.fields || []);
        const map: Record<string, string> = {};
        for (const row of valuesRes.values || []) {
          map[row.field_id] = row.value || '';
        }
        setCustomValues(map);
      })
      .catch(() => {
        setCustomFields([]);
        setCustomValues({});
      });
  }, [open, task, plan, workspaceId]);

  if (!task) return null;

  const handleSave = async () => {
    setSaving(true);
    const previousAssignee = task.assignee_id;
    try {
      await updateTask(supabase, task.id, {
        title,
        description,
        priority,
        due_date: dueDate ? new Date(dueDate).toISOString() : null,
        assignee_id: assigneeId,
      });

      if (assigneeId && assigneeId !== previousAssignee) {
        await emitTaskEvent(task.id, {
          type: 'assigned',
          workspaceId,
          taskTitle: title,
          assigneeId,
        });
      } else if (
        title !== task.title ||
        description !== (task.description || '') ||
        priority !== task.priority
      ) {
        await emitTaskEvent(task.id, {
          type: 'updated',
          workspaceId,
          taskTitle: title,
          assigneeId,
        });
      }

      onUpdated();
      toast({ title: 'Task aggiornato' });
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

  const handleDelete = async () => {
    if (!confirm('Eliminare questo task?')) return;
    setSaving(true);
    try {
      await deleteTask(supabase, task.id);
      await emitTaskEvent(task.id, {
        type: 'deleted',
        workspaceId,
        taskTitle: title,
        assigneeId,
      });
      onOpenChange(false);
      onDeleted?.();
      onUpdated();
      toast({ title: 'Task eliminato' });
    } catch (e) {
      toast({
        variant: 'destructive',
        title: 'Errore',
        description: e instanceof Error ? e.message : 'Eliminazione fallita',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleComment = async () => {
    if (!comment.trim()) return;
    setSaving(true);
    const preview = comment.trim();
    try {
      await addComment(supabase, task.id, preview);
      await emitTaskEvent(task.id, {
        type: 'commented',
        workspaceId,
        taskTitle: title,
        assigneeId: assigneeId || task.assignee_id,
        commentPreview: preview.slice(0, 120),
      });
      setComment('');
      onUpdated();
    } catch (e) {
      toast({
        variant: 'destructive',
        title: 'Errore',
        description: e instanceof Error ? e.message : 'Commento non inviato',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      await uploadTaskAttachment(task.id, file);
      onUpdated();
      toast({ title: 'Allegato caricato' });
    } catch (err) {
      toast({
        variant: 'destructive',
        title: 'Upload fallito',
        description: err instanceof Error ? err.message : 'Errore',
      });
    } finally {
      setUploading(false);
    }
  };

  const handleDownload = async (attachmentId: string, fileName: string) => {
    try {
      const url = await getAttachmentDownloadUrl(attachmentId);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      a.target = '_blank';
      a.click();
    } catch (e) {
      toast({
        variant: 'destructive',
        title: 'Download fallito',
        description: e instanceof Error ? e.message : 'Errore',
      });
    }
  };

  const handleDeleteAttachment = async (attachmentId: string) => {
    try {
      await deleteTaskAttachment(attachmentId);
      onUpdated();
      toast({ title: 'Allegato eliminato' });
    } catch (e) {
      toast({
        variant: 'destructive',
        title: 'Errore',
        description: e instanceof Error ? e.message : 'Eliminazione fallita',
      });
    }
  };

  const handleCustomValueChange = async (fieldId: string, value: string) => {
    setCustomValues((prev) => ({ ...prev, [fieldId]: value }));
    try {
      await fetch(`/api/tasks/${task.id}/custom-values`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fieldId, value }),
      });
    } catch {
      toast({
        variant: 'destructive',
        title: 'Errore',
        description: 'Impossibile salvare il campo personalizzato',
      });
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-md overflow-y-auto border-border/60">
        <SheetHeader>
          <SheetTitle>Dettaglio task</SheetTitle>
        </SheetHeader>

        <div className="space-y-5 mt-6">
          <div className="space-y-2">
            <Label htmlFor="task-title-edit">Titolo</Label>
            <Input id="task-title-edit" value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>

          {workspaceMembers.length > 0 && (
            <div className="space-y-2">
              <Label className="flex items-center gap-1.5">
                <User className="h-3.5 w-3.5" /> Assegnato a
              </Label>
              <Select
                value={assigneeId || 'none'}
                onValueChange={(v) => setAssigneeId(v === 'none' ? null : v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Nessuno" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Nessuno</SelectItem>
                  {workspaceMembers.map((m) => (
                    <SelectItem key={m.id} value={m.id}>
                      {m.full_name || m.email}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <PlanGate feature="taskDueDates" plan={plan}>
            <div className="space-y-2">
              <Label htmlFor="task-due" className="flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5" /> Scadenza
              </Label>
              <Input
                id="task-due"
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
              />
            </div>
          </PlanGate>

          <div className="space-y-2">
            <Label>Priorità</Label>
            <div className="flex gap-2">
              {(['low', 'medium', 'high'] as TaskPriority[]).map((p) => (
                <Button
                  key={p}
                  type="button"
                  size="sm"
                  variant={priority === p ? 'default' : 'outline'}
                  onClick={() => setPriority(p)}
                >
                  {priorityLabels[p]}
                </Button>
              ))}
            </div>
          </div>

          <PlanGate feature="taskComments" plan={plan}>
            <div className="space-y-2">
              <Label htmlFor="task-desc">Descrizione</Label>
              <Textarea
                id="task-desc"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                placeholder="Aggiungi dettagli..."
              />
            </div>
          </PlanGate>

          <div className="flex gap-2">
            <Button onClick={handleSave} disabled={saving} className="flex-1">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Salva modifiche'}
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
              onClick={handleDelete}
              disabled={saving}
              aria-label="Elimina task"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>

          <PlanGate feature="taskComments" plan={plan}>
            <div className="space-y-3 pt-2 border-t border-border/60">
              <Label className="flex items-center gap-1.5">
                <MessageSquare className="h-3.5 w-3.5" /> Commenti
              </Label>
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {(task.comments || []).map((c) => (
                  <div key={c.id} className="rounded-lg bg-muted/40 p-2.5 text-sm">
                    <p className="font-medium text-xs text-muted-foreground mb-1">
                      {(c as { profile?: Profile }).profile?.full_name || 'Utente'}
                    </p>
                    <p>{c.content}</p>
                  </div>
                ))}
                {!task.comments?.length && (
                  <p className="text-xs text-muted-foreground">Nessun commento ancora.</p>
                )}
              </div>
              <div className="flex gap-2">
                <Input
                  placeholder="Scrivi un commento..."
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleComment()}
                />
                <Button size="icon" onClick={handleComment} disabled={saving}>
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </PlanGate>

          <PlanGate feature="taskAttachments" plan={plan}>
            <div className="space-y-3 pt-2 border-t border-border/60">
              <Label className="flex items-center gap-1.5">
                <Paperclip className="h-3.5 w-3.5" /> Allegati
              </Label>
              {(task.attachments || []).map((a) => (
                <div
                  key={a.id}
                  className="flex items-center justify-between gap-2 rounded-lg border border-border/60 px-3 py-2 text-sm"
                >
                  <span className="truncate flex-1">{a.file_name}</span>
                  <Badge variant="secondary" className="text-xs shrink-0">
                    {Math.round(a.file_size / 1024)} KB
                  </Badge>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-7 w-7 shrink-0"
                    onClick={() => handleDownload(a.id, a.file_name)}
                  >
                    <Download className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-7 w-7 shrink-0 text-red-400"
                    onClick={() => handleDeleteAttachment(a.id)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ))}
              <label className="flex cursor-pointer items-center justify-center rounded-xl border border-dashed border-primary/30 bg-primary/5 py-4 text-sm text-primary hover:bg-primary/10 transition-colors">
                {uploading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    <Paperclip className="h-4 w-4 mr-2" />
                    Carica file
                  </>
                )}
                <input type="file" className="hidden" onChange={handleUpload} disabled={uploading} />
              </label>
            </div>
          </PlanGate>

          <PlanGate feature="auditLog" plan={plan}>
            {customFields.length > 0 && (
              <div className="space-y-3 pt-2 border-t border-border/60">
                <Label>Campi personalizzati</Label>
                {customFields.map((field) => (
                  <div key={field.id} className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">{field.name}</Label>
                    {field.field_type === 'select' ? (
                      <Select
                        value={customValues[field.id] || ''}
                        onValueChange={(v) => handleCustomValueChange(field.id, v)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Seleziona..." />
                        </SelectTrigger>
                        <SelectContent>
                          {(Array.isArray(field.options)
                            ? (field.options as string[])
                            : []
                          ).map((opt) => (
                            <SelectItem key={String(opt)} value={String(opt)}>
                              {String(opt)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <Input
                        type={field.field_type === 'number' ? 'number' : 'text'}
                        value={customValues[field.id] || ''}
                        onChange={(e) => handleCustomValueChange(field.id, e.target.value)}
                      />
                    )}
                  </div>
                ))}
              </div>
            )}
          </PlanGate>
        </div>
      </SheetContent>
    </Sheet>
  );
}
