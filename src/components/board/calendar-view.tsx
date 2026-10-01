'use client';

import { useState, useMemo } from 'react';
import { ChevronLeft, ChevronRight, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

import type { BoardWithColumns, TaskPriority } from '@/lib/database.types';

type TaskItem = BoardWithColumns['columns'][0]['tasks'][0];

const priorityBg: Record<TaskPriority, string> = {
  low: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
  medium: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
  high: 'bg-red-500/15 text-red-300 border-red-500/30',
};

interface CalendarViewProps {
  board: BoardWithColumns;
  onTaskClick: (task: TaskItem) => void;
  onTaskDrop?: (taskId: string, newDate: string) => void;
  className?: string;
}

export function CalendarView({ board, onTaskClick, onTaskDrop, className }: CalendarViewProps) {
  const [currentMonth, setCurrentMonth] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [draggingTask, setDraggingTask] = useState<string | null>(null);

  const tasksByDate = useMemo(() => {
    const map: Record<string, TaskItem[]> = {};
    for (const col of board.columns) {
      for (const task of col.tasks) {
        if (!task.due_date) continue;
        const dateKey = task.due_date.slice(0, 10);
        if (!map[dateKey]) map[dateKey] = [];
        map[dateKey].push(task);
      }
    }
    return map;
  }, [board]);

  const { weeks, monthLabel } = useMemo(() => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startOffset = (firstDay.getDay() || 7) - 1;

    const days: Array<Date | null> = [];
    for (let i = 0; i < startOffset; i++) days.push(null);
    for (let d = 1; d <= lastDay.getDate(); d++) {
      days.push(new Date(year, month, d));
    }
    while (days.length % 7 !== 0) days.push(null);

    const weeks: Array<Array<Date | null>> = [];
    for (let i = 0; i < days.length; i += 7) {
      weeks.push(days.slice(i, i + 7));
    }

    return {
      weeks,
      monthLabel: currentMonth.toLocaleDateString('it-IT', { month: 'long', year: 'numeric' }),
    };
  }, [currentMonth]);

  const prevMonth = () => {
    setCurrentMonth((m) => new Date(m.getFullYear(), m.getMonth() - 1, 1));
  };

  const nextMonth = () => {
    setCurrentMonth((m) => new Date(m.getFullYear(), m.getMonth() + 1, 1));
  };

  const today = new Date();
  const todayKey = today.toISOString().slice(0, 10);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (date: Date | null) => {
    setDraggingTask(null);
    if (!date || !draggingTask || !onTaskDrop) return;
    onTaskDrop(draggingTask, date.toISOString().slice(0, 10));
  };

  const handleDragStart = (taskId: string) => {
    setDraggingTask(taskId);
  };

  return (
    <div className={cn('rounded-xl border border-border/60 overflow-hidden', className)}>
      <div className="flex items-center justify-between px-4 py-3 bg-muted/30 border-b border-border/60">
        <Button variant="ghost" size="icon" onClick={prevMonth}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <h3 className="font-medium text-sm capitalize">{monthLabel}</h3>
        <Button variant="ghost" size="icon" onClick={nextMonth}>
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      <div className="grid grid-cols-7 text-center text-xs font-medium text-muted-foreground border-b border-border/60">
        {['Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab', 'Dom'].map((d) => (
          <div key={d} className="py-2">
            {d}
          </div>
        ))}
      </div>

      <div>
        {weeks.map((week, wi) => (
          <div key={wi} className="grid grid-cols-7 border-b border-border/40 last:border-b-0">
            {week.map((day, di) => {
              const dateKey = day ? day.toISOString().slice(0, 10) : '';
              const tasks = day && tasksByDate[dateKey] ? tasksByDate[dateKey] : [];
              const isToday = dateKey === todayKey;
              const isPast = day && day < new Date(today.getFullYear(), today.getMonth(), today.getDate());

              return (
                <div
                  key={di}
                  className={cn(
                    'min-h-[100px] p-1.5 border-r border-border/40 last:border-r-0',
                    !day && 'bg-muted/10'
                  )}
                  onDragOver={handleDragOver}
                  onDrop={() => handleDrop(day)}
                >
                  {day && (
                    <>
                      <div className="flex items-center justify-between mb-1">
                        <span
                          className={cn(
                            'flex items-center justify-center w-6 h-6 rounded-full text-xs',
                            isToday && 'bg-teal-500 text-white font-bold',
                            !isToday && isPast && 'text-muted-foreground/60',
                            !isToday && !isPast && 'text-foreground'
                          )}
                        >
                          {day.getDate()}
                        </span>
                        {tasks.length > 3 && (
                          <Badge variant="secondary" className="text-[10px] h-4 px-1">
                            <ChevronDown className="h-2.5 w-2.5 mr-0.5" />
                            {tasks.length}
                          </Badge>
                        )}
                      </div>
                      <div className="space-y-0.5">
                        {tasks.slice(0, 3).map((task) => (
                          <button
                            key={task.id}
                            type="button"
                            draggable
                            onDragStart={() => handleDragStart(task.id)}
                            onClick={(e) => {
                              e.stopPropagation();
                              onTaskClick(task);
                            }}
                            className={cn(
                              'w-full text-left text-[11px] rounded-md px-1.5 py-0.5 border truncate transition-colors',
                              priorityBg[task.priority],
                              'hover:opacity-80 cursor-pointer'
                            )}
                            title={task.title}
                          >
                            {task.title}
                          </button>
                        ))}
                        {tasks.length > 3 && (
                          <p className="text-[10px] text-muted-foreground px-1.5">
                            +{tasks.length - 3} altri
                          </p>
                        )}
                      </div>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
