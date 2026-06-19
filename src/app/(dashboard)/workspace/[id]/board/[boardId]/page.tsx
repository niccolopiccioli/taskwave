'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Plus, GripVertical, Loader2, Lock, Link2, Pencil, Trash2, Filter, CalendarDays, LayoutGrid } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Brand } from '@/components/layout/brand';
import { TaskDetailSheet } from '@/components/board/task-detail-sheet';
import { BoardTimelineView } from '@/components/board/board-timeline-view';
import { createClient } from '@/lib/supabase/client';
import {
  getBoardWithColumns,
  createTask,
  moveTask,
  getProfile,
  createColumn,
  updateColumnName,
  createGuestLink,
  deleteColumn,
  deleteBoard,
  getWorkspaceMembersForBoard,
} from '@/lib/data';
import type { BoardWithColumns, TaskPriority, Profile } from '@/lib/database.types';
import { canUseCustomColumns, hasFeature } from '@/lib/plans';
import { useToast } from '@/hooks/use-toast';
import { useBoardRealtime } from '@/hooks/use-board-realtime';
import { useBoardPresence } from '@/hooks/use-board-presence';
import { emitTaskEvent } from '@/lib/client-task-events';

const priorityColors: Record<TaskPriority, string> = {
  low: 'bg-emerald-500',
  medium: 'bg-amber-500',
  high: 'bg-red-500',
};

const priorityLabels: Record<TaskPriority, string> = {
  low: 'Bassa',
  medium: 'Media',
  high: 'Alta',
};

type TaskItem = BoardWithColumns['columns'][0]['tasks'][0];

export default function KanbanBoardPage() {
  const params = useParams();
  const router = useRouter();
  const workspaceId = params.id as string;
  const boardId = params.boardId as string;
  const supabase = createClient();
  const { toast } = useToast();

  const [board, setBoard] = useState<BoardWithColumns | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [draggedTask, setDraggedTask] = useState<{ taskId: string; columnId: string } | null>(null);
  const [newTaskOpen, setNewTaskOpen] = useState(false);
  const [newTaskColumnId, setNewTaskColumnId] = useState('');
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedTask, setSelectedTask] = useState<TaskItem | null>(null);
  const [taskSheetOpen, setTaskSheetOpen] = useState(false);
  const [newColumnOpen, setNewColumnOpen] = useState(false);
  const [newColumnName, setNewColumnName] = useState('');
  const [editingColumn, setEditingColumn] = useState<{ id: string; name: string } | null>(null);
  const [workspaceMembers, setWorkspaceMembers] = useState<Profile[]>([]);
  const [filterPriority, setFilterPriority] = useState<TaskPriority | 'all'>('all');
  const [filterAssignee, setFilterAssignee] = useState<string>('all');
  const [deleteColumnTarget, setDeleteColumnTarget] = useState<{ id: string; name: string } | null>(null);
  const [viewMode, setViewMode] = useState<'board' | 'timeline'>('board');

  const loadBoard = useCallback(async () => {
    const [data, userProfile, members] = await Promise.all([
      getBoardWithColumns(supabase, boardId),
      getProfile(supabase),
      getWorkspaceMembersForBoard(supabase, workspaceId),
    ]);
    setBoard(data);
    setProfile(userProfile);
    setWorkspaceMembers(members);
    setIsLoading(false);
  }, [supabase, boardId, workspaceId]);

  useEffect(() => {
    loadBoard();
  }, [loadBoard]);

  useBoardRealtime(supabase, boardId, loadBoard);
  const onlineCount = useBoardPresence(supabase, boardId);

  const plan = profile?.plan || 'free';

  const handleDragStart = (taskId: string, columnId: string) => {
    setDraggedTask({ taskId, columnId });
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = async (targetColumnId: string) => {
    if (!draggedTask || draggedTask.columnId === targetColumnId) {
      setDraggedTask(null);
      return;
    }

    const fromColumn = board?.columns.find((c) => c.id === draggedTask.columnId);
    const toColumn = board?.columns.find((c) => c.id === targetColumnId);
    const movedTask = fromColumn?.tasks.find((t) => t.id === draggedTask.taskId);

    await moveTask(supabase, draggedTask.taskId, targetColumnId);
    await emitTaskEvent(draggedTask.taskId, {
      type: 'moved',
      workspaceId,
      taskTitle: movedTask?.title,
      assigneeId: movedTask?.assignee_id,
      fromColumn: fromColumn?.name,
      toColumn: toColumn?.name,
    });
    setDraggedTask(null);
    await loadBoard();
  };

  const handleCreateTask = async () => {
    if (!newTaskTitle.trim() || !newTaskColumnId) return;
    setIsSubmitting(true);
    try {
      const created = await createTask(supabase, newTaskColumnId, newTaskTitle);
      await emitTaskEvent(created.id, {
        type: 'created',
        workspaceId,
        taskTitle: newTaskTitle,
      });
      setNewTaskOpen(false);
      setNewTaskTitle('');
      await loadBoard();
    } finally {
      setIsSubmitting(false);
    }
  };

  const openNewTask = (columnId: string) => {
    setNewTaskColumnId(columnId);
    setNewTaskOpen(true);
  };

  const openTask = (task: TaskItem) => {
    setSelectedTask(task);
    setTaskSheetOpen(true);
  };

  const handleAddColumn = async () => {
    if (!newColumnName.trim() || !board) return;
    if (!canUseCustomColumns(plan)) {
      toast({
        variant: 'destructive',
        title: 'Funzione Pro',
        description: 'Le colonne personalizzate richiedono Pro o Business.',
      });
      return;
    }
    setIsSubmitting(true);
    try {
      await createColumn(supabase, board.id, newColumnName.trim());
      setNewColumnOpen(false);
      setNewColumnName('');
      await loadBoard();
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRenameColumn = async () => {
    if (!editingColumn?.name.trim()) return;
    setIsSubmitting(true);
    try {
      await updateColumnName(supabase, editingColumn.id, editingColumn.name.trim());
      setEditingColumn(null);
      await loadBoard();
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGuestLink = async () => {
    try {
      const { url } = await createGuestLink(boardId);
      await navigator.clipboard.writeText(url);
      toast({ title: 'Link copiato', description: 'Guest link negli appunti.' });
    } catch (e) {
      toast({
        variant: 'destructive',
        title: 'Errore',
        description: e instanceof Error ? e.message : 'Impossibile creare link',
      });
    }
  };

  const handleDeleteColumn = async () => {
    if (!deleteColumnTarget) return;
    setIsSubmitting(true);
    try {
      await deleteColumn(supabase, deleteColumnTarget.id);
      setDeleteColumnTarget(null);
      await loadBoard();
      toast({ title: 'Colonna eliminata' });
    } catch (e) {
      toast({
        variant: 'destructive',
        title: 'Errore',
        description: e instanceof Error ? e.message : 'Impossibile eliminare',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteBoard = async () => {
    if (!confirm(`Eliminare la board "${board?.name}"? Tutti i task verranno persi.`)) return;
    try {
      await deleteBoard(supabase, boardId);
      toast({ title: 'Board eliminata' });
      router.push('/dashboard');
    } catch (e) {
      toast({
        variant: 'destructive',
        title: 'Errore',
        description: e instanceof Error ? e.message : 'Impossibile eliminare',
      });
    }
  };

  const filterTask = (task: TaskItem) => {
    if (filterPriority !== 'all' && task.priority !== filterPriority) return false;
    if (filterAssignee === 'unassigned' && task.assignee_id) return false;
    if (filterAssignee !== 'all' && filterAssignee !== 'unassigned' && task.assignee_id !== filterAssignee) {
      return false;
    }
    return true;
  };

  const filteredColumns =
    board?.columns.map((col) => ({
      ...col,
      tasks: col.tasks.filter(filterTask),
    })) ?? [];

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!board) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <p className="text-muted-foreground">Board non trovata.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="border-b border-border/60 bg-card/50 backdrop-blur-2xl flex-shrink-0 sticky top-0 z-50">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex h-14 sm:h-16 items-center justify-between gap-3">
            <div className="flex items-center gap-2 sm:gap-4 min-w-0">
              <Brand href="/dashboard" size="sm" className="hidden sm:flex shrink-0" />
              <Link href="/dashboard" className="text-xs sm:text-sm text-muted-foreground hover:text-primary transition-colors shrink-0">
                Dashboard
              </Link>
              <span className="text-muted-foreground shrink-0">/</span>
              <span className="font-medium font-display text-sm sm:text-base truncate">{board.name}</span>
              {onlineCount > 0 && (
                <span className="hidden sm:inline-flex items-center gap-1 text-xs text-muted-foreground bg-muted/50 px-2 py-0.5 rounded-full shrink-0">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  {onlineCount} online
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 flex-wrap justify-end">
              <div className="hidden sm:flex items-center gap-2 text-xs text-muted-foreground">
                <Filter className="h-3.5 w-3.5" />
                <select
                  className="bg-transparent border border-border/60 rounded-md px-2 py-1"
                  value={filterPriority}
                  onChange={(e) => setFilterPriority(e.target.value as TaskPriority | 'all')}
                >
                  <option value="all">Tutte le priorità</option>
                  <option value="high">Alta</option>
                  <option value="medium">Media</option>
                  <option value="low">Bassa</option>
                </select>
                <select
                  className="bg-transparent border border-border/60 rounded-md px-2 py-1 max-w-[140px]"
                  value={filterAssignee}
                  onChange={(e) => setFilterAssignee(e.target.value)}
                >
                  <option value="all">Tutti</option>
                  <option value="unassigned">Non assegnati</option>
                  {workspaceMembers.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.full_name || m.email}
                    </option>
                  ))}
                </select>
              </div>
              <Button
                size="sm"
                variant={viewMode === 'board' ? 'default' : 'outline'}
                className="gap-1.5"
                onClick={() => setViewMode('board')}
              >
                <LayoutGrid className="h-3.5 w-3.5" />
                Board
              </Button>
              <Button
                size="sm"
                variant={viewMode === 'timeline' ? 'default' : 'outline'}
                className="gap-1.5"
                onClick={() => setViewMode('timeline')}
              >
                <CalendarDays className="h-3.5 w-3.5" />
                Timeline
              </Button>
              {hasFeature(plan, 'guestLinks') && (
                <Button size="sm" variant="outline" className="gap-1.5" onClick={handleGuestLink}>
                  <Link2 className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Guest link</span>
                </Button>
              )}
              {canUseCustomColumns(plan) && (
                <Button size="sm" variant="outline" className="gap-1.5" onClick={() => setNewColumnOpen(true)}>
                  <Plus className="h-3.5 w-3.5" />
                  Colonna
                </Button>
              )}
              <Button
                size="sm"
                variant="ghost"
                className="text-red-400 hover:text-red-300"
                onClick={handleDeleteBoard}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 overflow-x-auto overscroll-x-contain">
        {viewMode === 'timeline' && board ? (
          <div className="p-4 sm:p-6 max-w-2xl">
            <BoardTimelineView board={board} />
          </div>
        ) : (
        <div className="h-full p-4 sm:p-6">
          <div className="flex gap-4 sm:gap-6 h-full min-w-max pb-4">
            {filteredColumns.map((column) => (
              <div
                key={column.id}
                className="w-[min(85vw,20rem)] sm:w-72 md:w-80 flex flex-col flex-shrink-0"
                onDragOver={handleDragOver}
                onDrop={() => handleDrop(column.id)}
              >
                <div className="flex items-center justify-between mb-4 px-1 sticky top-0 bg-background/80 backdrop-blur py-2 rounded-lg">
                  <div className="flex items-center gap-2 min-w-0">
                    <h3 className="font-semibold truncate">{column.name}</h3>
                    <Badge variant="secondary" className="text-xs">
                      {column.tasks.length}
                    </Badge>
                    {canUseCustomColumns(plan) && (
                      <>
                        <button
                          type="button"
                          className="text-muted-foreground hover:text-primary"
                          onClick={() => setEditingColumn({ id: column.id, name: column.name })}
                        >
                          <Pencil className="h-3 w-3" />
                        </button>
                        <button
                          type="button"
                          className="text-muted-foreground hover:text-red-400"
                          onClick={() => setDeleteColumnTarget({ id: column.id, name: column.name })}
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </>
                    )}
                    {!canUseCustomColumns(plan) && (
                      <span title="Colonne fisse su piano Free">
                        <Lock className="h-3 w-3 text-muted-foreground/50" />
                      </span>
                    )}
                  </div>
                </div>

                <ScrollArea className="flex-1">
                  <div className="space-y-3 pr-2">
                    <AnimatePresence>
                      {column.tasks.map((task, index) => (
                        <motion.div
                          key={task.id}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -10 }}
                          transition={{ duration: 0.2, delay: index * 0.03 }}
                          draggable
                          onDragStart={() => handleDragStart(task.id, column.id)}
                          onClick={() => openTask(task)}
                          className={`
                            bg-card/80 border border-border/60 rounded-xl p-4 cursor-pointer
                            hover:border-primary/40 hover:shadow-lg hover:shadow-primary/5 transition-all
                            ${draggedTask?.taskId === task.id ? 'opacity-50' : ''}
                          `}
                        >
                          <div className="flex items-start gap-2">
                            <GripVertical
                              className="w-4 h-4 text-muted-foreground mt-1 flex-shrink-0 cursor-grab"
                              onMouseDown={(e) => e.stopPropagation()}
                            />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-2">
                                <span className={`w-2 h-2 rounded-full ${priorityColors[task.priority]}`} />
                                <span className="text-xs text-muted-foreground">{priorityLabels[task.priority]}</span>
                                {task.due_date && hasFeature(plan, 'taskDueDates') && (
                                  <span className="text-[10px] text-amber-400">
                                    {new Date(task.due_date).toLocaleDateString('it-IT')}
                                  </span>
                                )}
                              </div>
                              <p className="font-medium text-sm mb-3">{task.title}</p>
                              {task.assignee && (
                                <div className="flex items-center gap-2">
                                  <Avatar className="w-6 h-6">
                                    <AvatarFallback className="text-xs bg-primary/20 text-primary">
                                      {task.assignee.full_name?.slice(0, 2).toUpperCase() || 'U'}
                                    </AvatarFallback>
                                  </Avatar>
                                  <span className="text-xs text-muted-foreground">{task.assignee.full_name}</span>
                                </div>
                              )}
                              {(task.comments?.length || 0) > 0 && hasFeature(plan, 'taskComments') && (
                                <Badge variant="outline" className="mt-2 text-[10px]">
                                  {task.comments!.length} commenti
                                </Badge>
                              )}
                            </div>
                          </div>
                        </motion.div>
                      ))}
                    </AnimatePresence>
                  </div>
                </ScrollArea>

                <Button
                  variant="ghost"
                  className="mt-3 justify-start text-muted-foreground hover:text-primary"
                  onClick={() => openNewTask(column.id)}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Aggiungi task
                </Button>
              </div>
            ))}
          </div>
        </div>
        )}
      </main>

      {hasFeature(plan, 'boardBranding') && (
        <footer className="border-t border-border/40 py-2 text-center text-xs text-muted-foreground">
          Powered by <Link href="/" className="text-primary hover:underline">TaskWave</Link>
        </footer>
      )}

      <TaskDetailSheet
        task={selectedTask}
        open={taskSheetOpen}
        onOpenChange={setTaskSheetOpen}
        plan={plan}
        workspaceId={workspaceId}
        workspaceMembers={workspaceMembers}
        onUpdated={loadBoard}
        onDeleted={() => setSelectedTask(null)}
      />

      <Dialog open={newTaskOpen} onOpenChange={setNewTaskOpen}>
        <DialogContent className="w-[calc(100vw-2rem)] max-w-md">
          <DialogHeader>
            <DialogTitle>Nuovo task</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="task-title">Titolo</Label>
              <Input
                id="task-title"
                placeholder="Descrivi il task..."
                value={newTaskTitle}
                onChange={(e) => setNewTaskTitle(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNewTaskOpen(false)}>Annulla</Button>
            <Button
              onClick={handleCreateTask}
              disabled={isSubmitting || !newTaskTitle.trim()}
              className="bg-primary text-primary-foreground"
            >
              {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Crea'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={newColumnOpen} onOpenChange={setNewColumnOpen}>
        <DialogContent className="w-[calc(100vw-2rem)] max-w-md">
          <DialogHeader>
            <DialogTitle>Nuova colonna</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <Input
              placeholder="Nome colonna"
              value={newColumnName}
              onChange={(e) => setNewColumnName(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNewColumnOpen(false)}>Annulla</Button>
            <Button onClick={handleAddColumn} disabled={isSubmitting}>Crea</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!editingColumn} onOpenChange={(o) => !o && setEditingColumn(null)}>
        <DialogContent className="w-[calc(100vw-2rem)] max-w-md">
          <DialogHeader>
            <DialogTitle>Rinomina colonna</DialogTitle>
          </DialogHeader>
          <Input
            value={editingColumn?.name || ''}
            onChange={(e) =>
              setEditingColumn((c) => (c ? { ...c, name: e.target.value } : null))
            }
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingColumn(null)}>Annulla</Button>
            <Button onClick={handleRenameColumn} disabled={isSubmitting}>Salva</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!deleteColumnTarget} onOpenChange={(o) => !o && setDeleteColumnTarget(null)}>
        <DialogContent className="w-[calc(100vw-2rem)] max-w-md">
          <DialogHeader>
            <DialogTitle>Elimina colonna</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Eliminare &quot;{deleteColumnTarget?.name}&quot;? La colonna deve essere vuota.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteColumnTarget(null)}>Annulla</Button>
            <Button variant="destructive" onClick={handleDeleteColumn} disabled={isSubmitting}>
              Elimina
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
