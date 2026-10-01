'use client';

import { useMemo } from 'react';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';
import { GanttChart } from 'lucide-react';
import type { BoardWithColumns, TaskPriority } from '@/lib/database.types';

type TaskItem = BoardWithColumns['columns'][0]['tasks'][0];

const priorityBarColor: Record<TaskPriority, string> = {
  low: 'bg-emerald-500',
  medium: 'bg-amber-500',
  high: 'bg-red-500',
};

interface GanttViewProps {
  board: BoardWithColumns;
  onTaskClick: (task: TaskItem) => void;
  className?: string;
}

const DAY_MS = 86400000;
const CELL_WIDTH = 36;
const ROW_HEIGHT = 36;
const LEFT_WIDTH = 220;

export function GanttView({ board, onTaskClick, className }: GanttViewProps) {
  const { tasks, startDate, endDate, totalDays } = useMemo(() => {
    const items: Array<{ task: TaskItem; columnName: string; columnId: string }> = [];
    for (const col of board.columns) {
      for (const task of col.tasks) {
        items.push({ task, columnName: col.name, columnId: col.id });
      }
    }

    let minDate = new Date();
    let maxDate = new Date();
    let hasDates = false;

    for (const { task } of items) {
      const created = new Date(task.created_at);
      if (!hasDates || created < minDate) minDate = created;
      if (task.due_date) {
        const due = new Date(task.due_date);
        if (!hasDates || due > maxDate) maxDate = due;
      }
      hasDates = true;
    }

    if (!hasDates) {
      minDate = new Date();
      maxDate = new Date();
      maxDate.setDate(maxDate.getDate() + 30);
    }

    const padDays = 7;
    const s = new Date(minDate.getFullYear(), minDate.getMonth(), minDate.getDate() - padDays);
    const e = new Date(maxDate.getFullYear(), maxDate.getMonth(), maxDate.getDate() + padDays);
    const diff = Math.ceil((e.getTime() - s.getTime()) / DAY_MS);

    return { tasks: items, startDate: s, endDate: e, totalDays: Math.max(diff, 30) };
  }, [board]);

  const today = new Date();
  const todayOffset = Math.floor((today.getTime() - startDate.getTime()) / DAY_MS);

  const taskRows = useMemo(() => {
    return tasks.map((item) => {
      const created = new Date(item.task.created_at);
      const start = Math.max(0, Math.floor((created.getTime() - startDate.getTime()) / DAY_MS));
      const end = item.task.due_date
        ? Math.max(start + 1, Math.floor((new Date(item.task.due_date).getTime() - startDate.getTime()) / DAY_MS))
        : start + 3;
      return { ...item, start, end };
    });
  }, [tasks, startDate]);

  if (tasks.length === 0) {
    return (
      <div className={cn('rounded-xl border border-dashed border-border/60 p-12 text-center', className)}>
        <GanttChart className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
        <p className="text-sm text-muted-foreground">Nessun task da mostrare nel timeline.</p>
      </div>
    );
  }

  const monthBreaks: Array<{ label: string; offset: number }> = [];
    const currentIter = new Date(startDate);
    while (currentIter <= endDate) {
    const label = currentIter.toLocaleDateString('it-IT', { month: 'short', year: '2-digit' });
    const offset = Math.floor((currentIter.getTime() - startDate.getTime()) / DAY_MS);
    if (offset >= 0) {
      monthBreaks.push({ label, offset });
    }
    currentIter.setMonth(currentIter.getMonth() + 1);
  }

  return (
    <div className={cn('rounded-xl border border-border/60 overflow-hidden', className)}>
      <ScrollArea className="w-full overflow-x-auto">
        <div style={{ minWidth: LEFT_WIDTH + totalDays * CELL_WIDTH + 100 }}>
          <div className="flex">
            <div
              className="shrink-0 border-r border-border/60 bg-muted/30"
              style={{ width: LEFT_WIDTH }}
            >
              <div className="px-3 py-2 text-xs font-medium text-muted-foreground border-b border-border/60 h-8">
                Task
              </div>
              {taskRows.map((row) => (
                <div
                  key={row.task.id}
                  className="flex items-center px-3 border-b border-border/40 text-sm truncate cursor-pointer hover:bg-muted/20 transition-colors"
                  style={{ height: ROW_HEIGHT }}
                  onClick={() => onTaskClick(row.task)}
                  title={row.task.title}
                >
                  <span className={cn('w-2 h-2 rounded-full mr-2 shrink-0', priorityBarColor[row.task.priority])} />
                  <span className="text-xs text-muted-foreground mr-1.5 shrink-0">{row.columnName}</span>
                  <span className="truncate">{row.task.title}</span>
                </div>
              ))}
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex h-8 border-b border-border/60 bg-muted/30">
                {Array.from({ length: totalDays }, (_, i) => {
                  const d = new Date(startDate.getTime() + i * DAY_MS);
                  const isWeekend = d.getDay() === 0 || d.getDay() === 6;
                  return (
                    <div
                      key={i}
                      className={cn(
                        'flex-shrink-0 border-r border-border/20 text-[9px] text-muted-foreground flex items-end pb-0.5 pl-0.5',
                        isWeekend && 'bg-muted/10'
                      )}
                      style={{ width: CELL_WIDTH }}
                    >
                      {i % 7 === 0 ? d.getDate() : ''}
                    </div>
                  );
                })}
              </div>

              {taskRows.map((row) => (
                <div
                  key={row.task.id}
                  className="flex relative border-b border-border/40"
                  style={{ height: ROW_HEIGHT }}
                >
                  {Array.from({ length: totalDays }, (_, i) => {
                    const d = new Date(startDate.getTime() + i * DAY_MS);
                    const isWeekend = d.getDay() === 0 || d.getDay() === 6;
                    return (
                      <div
                        key={i}
                        className={cn(
                          'flex-shrink-0 border-r border-border/20',
                          isWeekend && 'bg-muted/5'
                        )}
                        style={{ width: CELL_WIDTH }}
                      />
                    );
                  })}

                  <div
                    className={cn(
                      'absolute top-1.5 bottom-1.5 rounded-md border transition-opacity hover:opacity-90 cursor-pointer',
                      priorityBarColor[row.task.priority]
                    )}
                    style={{
                      left: row.start * CELL_WIDTH + 4,
                      width: Math.max(CELL_WIDTH / 2, (row.end - row.start) * CELL_WIDTH - 8),
                    }}
                    onClick={() => onTaskClick(row.task)}
                    title={`${row.task.title} (${row.columnName})`}
                  >
                    <span className="text-[10px] text-white font-medium px-1.5 truncate block leading-5">
                      {row.task.title}
                    </span>
                  </div>
                </div>
              ))}

              {todayOffset >= 0 && todayOffset < totalDays && (
                <div
                  className="absolute top-0 bottom-0 w-px bg-teal-500 z-10"
                  style={{ left: LEFT_WIDTH + todayOffset * CELL_WIDTH + CELL_WIDTH / 2 }}
                >
                  <div className="absolute -top-1 -left-1.5 w-3 h-3 rounded-full bg-teal-500" />
                </div>
              )}
            </div>
          </div>
        </div>
      </ScrollArea>
    </div>
  );
}
