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

// Warm left-border accent per priority (soft, non-alarming)
const priorityBar: Record<TaskPriority, string> = {
  low: 'border-l-stone-300 dark:border-l-stone-600',
  medium: 'border-l-amber-500',
  high: 'border-l-red-500',
};

// Column header dots, cycled by position
const columnDots = [
  'bg-stone-400',
  'bg-amber-500',
  'bg-teal-500',
  'bg-sky-500',
  'bg-violet-500',
  'bg-rose-500',
];

// Due-date pill: red when overdue or due today, neutral otherwise
function duePillClass(due: string): string {
  const d = new Date(due);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  if (d < today || d.toDateString() === now.toDateString()) {
    return 'bg-red-500/10 text-red-500 font-semibold';
  }
  return 'bg-muted text-muted-foreground';
}

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
  const [dragOverColumn, setDragOverColumn] = useState<string | null>(null);
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

  const handleDragOver = (e: React.DragEvent, columnId?: string) => {
    e.preventDefault();
    if (columnId) setDragOverColumn(columnId);
  };

  const handleDragEnd = () => {
    setDraggedTask(null);
    setDragOverColumn(null);
  };

  const handleDrop = async (targetColumnId: string) => {
    if (!draggedTask || draggedTask.columnId === targetColumnId) {
      setDraggedTask(null);
      setDragOverColumn(null);
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
    setDragOverColumn(null);
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

  const selectedTaskColumnIndex =
    selectedTask && board
      ? board.columns.findIndex((c) => c.tasks.some((t) => t.id === selectedTask.id))
      : -1;
  const hasNextColumn =
    board != null &&
    selectedTaskColumnIndex >= 0 &&
    selectedTaskColumnIndex < board.columns.length - 1;
  const nextColumnName = hasNextColumn
    ? board!.columns[selectedTaskColumnIndex + 1].name
    : null;

  const handleMoveSelectedToNext = async () => {
    if (!selectedTask || !board || !hasNextColumn) return;
    const fromColumn = board.columns[selectedTaskColumnIndex];
    const toColumn = board.columns[selectedTaskColumnIndex + 1];
    await moveTask(supabase, selectedTask.id, toColumn.id);
    await emitTaskEvent(selectedTask.id, {
      type: 'moved',
      workspaceId,
      taskTitle: selectedTask.title,
      assigneeId: selectedTask.assignee_id,
      fromColumn: fromColumn.name,
      toColumn: toColumn.name,
    });
    toast({ title: `Spostato in "${toColumn.name}"` });
    await loadBoard();
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

  const totalTasks = filteredColumns.reduce((n, c) => n + c.tasks.length, 0);
  const doneTasks = filteredColumns.length
    ? filteredColumns[filteredColumns.length - 1].tasks.length
    : 0;
  const donePct = totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0;

  const openNewTaskInFirstColumn = () => {
    const first = filteredColumns[0];
    if (first) openNewTask(first.id);
  };

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
              <div className="flex items-center rounded-full bg-muted p-1 gap-1" role="tablist" aria-label="Vista">
                <button
                  type="button"
                  role="tab"
                  aria-selected={viewMode === 'board'}
                  className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-all ${
                    viewMode === 'board'
                      ? 'bg-card text-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                  onClick={() => setViewMode('board')}
                >
                  <LayoutGrid className="h-3.5 w-3.5" />
                  Bacheca
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={viewMode === 'timeline'}
                  className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-all ${
                    viewMode === 'timeline'
                      ? 'bg-card text-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                  onClick={() => setViewMode('timeline')}
                >
                  <CalendarDays className="h-3.5 w-3.5" />
                  Timeline
                </button>
              </div>
              {hasFeature(plan, 'guestLinks') && (
                <Button size="sm" variant="outline" className="gap-1.5" onClick={handleGuestLink}>
                  <Link2 className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Guest link</span>
                </Button>
              )}
              {canUseCustomColumns(plan) && (
                <Button size="sm" variant="outline" className="gap-1.5 rounded-full" onClick={() => setNewColumnOpen(true)}>
                  <Plus className="h-3.5 w-3.5" />
                  Colonna
                </Button>
              )}
              <Button
                size="sm"
                className="gap-1.5 rounded-full bg-primary text-primary-foreground shadow-sm hover:brightness-105"
                onClick={openNewTaskInFirstColumn}
              >
                <Plus className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Nuovo lavoro</span>
                <span className="sm:hidden">Nuovo</span>
              </Button>
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

      <div className="flex-shrink-0 border-b border-border/40 bg-background">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-2 flex items-center gap-3">
          <span className="text-xs text-muted-foreground whitespace-nowrap">
            {totalTasks === 0
              ? 'Nessun lavoro qui'
              : donePct === 100
                ? `Tutti fatti (${totalTasks}). Ottimo ritmo.`
                : `Oggi ${doneTasks} di ${totalTasks} fatti`}
          </span>
          <div
            className="h-1 w-28 sm:w-36 rounded-full bg-muted overflow-hidden"
            role="progressbar"
            aria-valuenow={donePct}
            aria-valuemin={0}
            aria-valuemax={100}
          >
            <div
              className="h-full rounded-full bg-primary transition-all duration-500"
              style={{ width: `${donePct}%` }}
            />
          </div>
        </div>
      </div>

      <main className="flex-1 overflow-x-auto overscroll-x-contain">
        {viewMode === 'timeline' && board ? (
          <div className="p-4 sm:p-6 max-w-2xl">
            <BoardTimelineView board={board} />
          </div>
        ) : (
        <div className="h-full p-4 sm:p-6">
          <div className="flex flex-col md:flex-row gap-4 sm:gap-5 md:h-full md:min-w-max pb-28 md:pb-4">
            {filteredColumns.map((column, colIndex) => {
              const isLast = colIndex === filteredColumns.length - 1;
              const isDragOver =
                dragOverColumn === column.id && draggedTask?.columnId !== column.id;
              return (
              <div
                key={column.id}
                className={`group/col w-full md:w-72 lg:w-80 flex flex-col flex-shrink-0 rounded-2xl p-2 transition-colors duration-200 ${
                  isLast
                    ? 'bg-emerald-500/[0.07] dark:bg-emerald-500/[0.06]'
                    : 'bg-muted/70 dark:bg-muted/40'
                } ${
                  isDragOver
                    ? 'ring-2 ring-dashed ring-primary/60 bg-primary/[0.06]'
                    : ''
                }`}
                onDragOver={(e) => handleDragOver(e, column.id)}
                onDrop={() => handleDrop(column.id)}
              >
                <div className="flex items-center justify-between px-2 pt-1.5 pb-3">
                  <div className="flex items-center gap-2 min-w-0">
                    <span
                      className={`h-2 w-2 rounded-full shrink-0 ${columnDots[colIndex % columnDots.length]}`}
                    />
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground truncate">
                      {column.name}
                    </h3>
                    <span className="text-[11px] font-medium text-muted-foreground bg-background border border-border/60 rounded-full px-2 py-px">
                      {column.tasks.length}
                    </span>
                    {canUseCustomColumns(plan) && (
                      <>
                        <button
                          type="button"
                          className="text-muted-foreground hover:text-primary opacity-0 group-hover/col:opacity-100 focus:opacity-100 transition-opacity"
                          onClick={() => setEditingColumn({ id: column.id, name: column.name })}
                          aria-label="Rinomina colonna"
                        >
                          <Pencil className="h-3 w-3" />
                        </button>
                        <button
                          type="button"
                          className="text-muted-foreground hover:text-red-400 opacity-0 group-hover/col:opacity-100 focus:opacity-100 transition-opacity"
                          onClick={() => setDeleteColumnTarget({ id: column.id, name: column.name })}
                          aria-label="Elimina colonna"
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

                <ScrollArea className="flex-1 min-h-[96px]">
                  <div className="space-y-2.5 px-1 pb-1">
                    <AnimatePresence>
                      {column.tasks.map((task, index) => (
                        <motion.div
                          key={task.id}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -10 }}
                          transition={{ duration: 0.2, delay: Math.min(index * 0.03, 0.3) }}
                          draggable
                          onDragStart={() => handleDragStart(task.id, column.id)}
                          onDragEnd={handleDragEnd}
                          onClick={() => openTask(task)}
                          className={`
                            group bg-card border border-border/70 border-l-4 ${priorityBar[task.priority]} rounded-xl p-3.5 cursor-pointer
                            shadow-[0_1px_2px_rgba(0,0,0,0.04)] transition-all duration-200
                            hover:-translate-y-px hover:shadow-[0_6px_16px_rgba(0,0,0,0.08)] hover:border-primary/40
                            ${draggedTask?.taskId === task.id ? 'opacity-40 scale-[1.02] shadow-[0_10px_24px_rgba(20,184,166,0.25)]' : ''}
                          `}
                        >
                          <div className="flex items-start gap-2">
                            <GripVertical
                              className="w-4 h-4 text-muted-foreground/50 mt-1 flex-shrink-0 cursor-grab opacity-0 group-hover:opacity-100 transition-opacity"
                              onMouseDown={(e) => e.stopPropagation()}
                            />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-2 flex-wrap">
                                <span className={`w-2 h-2 rounded-full shrink-0 ${priorityColors[task.priority]}`} />
                                <span className="text-xs text-muted-foreground">{priorityLabels[task.priority]}</span>
                                {task.due_date && hasFeature(plan, 'taskDueDates') && (
                                  <span className={`text-[10px] rounded-full px-2 py-px ${duePillClass(task.due_date)}`}>
                                    {new Date(task.due_date).toLocaleDateString('it-IT')}
                                  </span>
                                )}
                              </div>
                              <p className="font-medium text-sm mb-3 leading-snug">{task.title}</p>
                              {task.assignee && (
                                <div className="flex items-center gap-2">
                                  <Avatar className="w-6 h-6">
                                    <AvatarFallback className="text-xs bg-primary/15 text-primary">
                                      {task.assignee.full_name?.slice(0, 2).toUpperCase() || 'U'}
                                    </AvatarFallback>
                                  </Avatar>
                                  <span className="text-xs text-muted-foreground truncate">{task.assignee.full_name}</span>
                                </div>
                              )}
                              {(task.comments?.length || 0) > 0 && hasFeature(plan, 'taskComments') && (
                                <Badge variant="outline" className="mt-2 text-[10px] rounded-full">
                                  {task.comments!.length} commenti
                                </Badge>
                              )}
                            </div>
                          </div>
                        </motion.div>
                      ))}
                    </AnimatePresence>
                    {isDragOver && (
                      <div className="rounded-xl border-2 border-dashed border-primary/50 bg-primary/[0.05] h-20 animate-pulse" />
                    )}
                  </div>
                </ScrollArea>

                <Button
                  variant="ghost"
                  className="mt-2 justify-start rounded-xl text-muted-foreground hover:text-primary hover:bg-background opacity-100 md:opacity-0 md:group-hover/col:opacity-100 md:focus:opacity-100 transition-opacity"
                  onClick={() => openNewTask(column.id)}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Aggiungi task
                </Button>
              </div>
              );
            })}
          </div>
        </div>
        )}
      </main>

      {hasFeature(plan, 'boardBranding') && (
        <footer className="border-t border-border/40 py-2 text-center text-xs text-muted-foreground">
          Powered by <Link href="/" className="text-primary hover:underline">TaskWave</Link>
        </footer>
      )}

      <nav
        aria-label="Navigazione board"
        className="md:hidden fixed bottom-0 inset-x-0 z-40 border-t border-border/60 bg-card/90 backdrop-blur-xl"
      >
        <div className="grid grid-cols-3 items-end px-8 pt-2 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
          <Link
            href="/dashboard"
            className="flex flex-col items-center gap-1 py-1 text-[11px] text-muted-foreground"
          >
            <LayoutGrid className="h-5 w-5" />
            Bacheche
          </Link>
          <button
            type="button"
            onClick={openNewTaskInFirstColumn}
            aria-label="Nuovo lavoro"
            className="-mt-9 mb-1 mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-[0_6px_20px_rgba(20,184,166,0.45)] active:scale-95 transition-transform"
          >
            <Plus className="h-6 w-6" />
          </button>
          <button
            type="button"
            onClick={() => setViewMode(viewMode === 'board' ? 'timeline' : 'board')}
            className="flex flex-col items-center gap-1 py-1 text-[11px] text-muted-foreground"
          >
            <CalendarDays className="h-5 w-5" />
            {viewMode === 'board' ? 'Timeline' : 'Bacheca'}
          </button>
        </div>
      </nav>

      <TaskDetailSheet
        task={selectedTask}
        open={taskSheetOpen}
        onOpenChange={setTaskSheetOpen}
        plan={plan}
        workspaceId={workspaceId}
        workspaceMembers={workspaceMembers}
        onUpdated={loadBoard}
        onDeleted={() => setSelectedTask(null)}
        onMoveToNext={hasNextColumn ? handleMoveSelectedToNext : undefined}
        moveToNextLabel={nextColumnName}
      />

      <Dialog open={newTaskOpen} onOpenChange={setNewTaskOpen}>
        <DialogContent className="w-[calc(100vw-2rem)] max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle>Nuovo lavoro</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="task-title">Titolo</Label>
              <Input
                id="task-title"
                placeholder="Descrivi il lavoro..."
                value={newTaskTitle}
                onChange={(e) => setNewTaskTitle(e.target.value)}
                autoFocus
              />
              <p className="text-xs text-muted-foreground">
                I dettagli (scadenza, assegnatario, priorità) si aggiungono dopo dalla scheda.
              </p>
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
