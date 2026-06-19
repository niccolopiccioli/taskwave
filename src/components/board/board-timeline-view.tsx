'use client';

import { useMemo } from 'react';
import { Calendar } from 'lucide-react';
import type { BoardWithColumns } from '@/lib/database.types';
import { cn } from '@/lib/utils';

interface BoardTimelineViewProps {
  board: BoardWithColumns;
  className?: string;
}

export function BoardTimelineView({ board, className }: BoardTimelineViewProps) {
  const tasksWithDue = useMemo(() => {
    const items: Array<{
      id: string;
      title: string;
      due_date: string;
      priority: string;
      columnName: string;
    }> = [];

    for (const col of board.columns) {
      for (const task of col.tasks) {
        if (task.due_date) {
          items.push({
            id: task.id,
            title: task.title,
            due_date: task.due_date,
            priority: task.priority,
            columnName: col.name,
          });
        }
      }
    }

    return items.sort(
      (a, b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime()
    );
  }, [board]);

  if (tasksWithDue.length === 0) {
    return (
      <div className={cn('rounded-xl border border-dashed border-border/60 p-8 text-center', className)}>
        <Calendar className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
        <p className="text-sm text-muted-foreground">Nessun task con scadenza su questa board.</p>
      </div>
    );
  }

  return (
    <div className={cn('space-y-2', className)}>
      {tasksWithDue.map((task) => {
        const due = new Date(task.due_date);
        const overdue = due < new Date();
        return (
          <div
            key={task.id}
            className={cn(
              'flex items-center gap-4 rounded-xl border border-border/60 px-4 py-3',
              overdue && 'border-red-500/30 bg-red-500/5'
            )}
          >
            <div className="text-center shrink-0 w-14">
              <p className="text-lg font-bold leading-none">{due.getDate()}</p>
              <p className="text-[10px] text-muted-foreground uppercase">
                {due.toLocaleDateString('it-IT', { month: 'short' })}
              </p>
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm truncate">{task.title}</p>
              <p className="text-xs text-muted-foreground">{task.columnName}</p>
            </div>
            {overdue && (
              <span className="text-[10px] font-medium text-red-400 shrink-0">Scaduto</span>
            )}
          </div>
        );
      })}
    </div>
  );
}
