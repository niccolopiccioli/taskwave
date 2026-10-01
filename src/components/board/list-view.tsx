'use client';

import { useState } from 'react';
import { ArrowUpDown, Search } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import type { BoardWithColumns, TaskPriority } from '@/lib/database.types';

type TaskItem = BoardWithColumns['columns'][0]['tasks'][0];

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

type SortField = 'title' | 'priority' | 'assignee' | 'column' | 'due_date';
type SortDir = 'asc' | 'desc';

interface ListViewProps {
  board: BoardWithColumns;
  onTaskClick: (task: TaskItem) => void;
  selectedTaskIds: Set<string>;
  onSelectionChange: (ids: Set<string>) => void;
  className?: string;
}

export function ListView({
  board,
  onTaskClick,
  selectedTaskIds,
  onSelectionChange,
  className,
}: ListViewProps) {
  const [sortField, setSortField] = useState<SortField>('title');
  const [sortDir, setSortDir] = useState<SortDir>('asc');

  const allTasks = board.columns.flatMap((col) =>
    col.tasks.map((task) => ({
      ...task,
      _columnName: col.name,
      _columnId: col.id,
    }))
  );

  const sorted = [...allTasks].sort((a, b) => {
    let cmp = 0;
    switch (sortField) {
      case 'title':
        cmp = a.title.localeCompare(b.title);
        break;
      case 'priority': {
        const order: Record<string, number> = { high: 0, medium: 1, low: 2 };
        cmp = (order[a.priority] ?? 1) - (order[b.priority] ?? 1);
        break;
      }
      case 'assignee':
        cmp = (a.assignee?.full_name || '').localeCompare(b.assignee?.full_name || '');
        break;
      case 'column':
        cmp = a._columnName.localeCompare(b._columnName);
        break;
      case 'due_date':
        cmp = (a.due_date || '').localeCompare(b.due_date || '');
        break;
    }
    return sortDir === 'asc' ? cmp : -cmp;
  });

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDir('asc');
    }
  };

  const toggleSelect = (taskId: string) => {
    const next = new Set(selectedTaskIds);
    if (next.has(taskId)) next.delete(taskId);
    else next.add(taskId);
    onSelectionChange(next);
  };

  const toggleAll = () => {
    if (selectedTaskIds.size === sorted.length) {
      onSelectionChange(new Set());
    } else {
      onSelectionChange(new Set(sorted.map((t) => t.id)));
    }
  };

  if (sorted.length === 0) {
    return (
      <div className={cn('rounded-xl border border-dashed border-border/60 p-12 text-center', className)}>
        <Search className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
        <p className="text-sm text-muted-foreground">Nessun task in questa vista.</p>
      </div>
    );
  }

  const columns: Array<{ field: SortField; label: string }> = [
    { field: 'title', label: 'Titolo' },
    { field: 'priority', label: 'Priorità' },
    { field: 'assignee', label: 'Assegnatario' },
    { field: 'column', label: 'Colonna' },
    { field: 'due_date', label: 'Data Scadenza' },
  ];

  return (
    <div className={cn('rounded-xl border border-border/60 overflow-hidden', className)}>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border/60 bg-muted/30">
              <th className="w-10 px-3 py-2.5">
                <Checkbox
                  checked={sorted.length > 0 && selectedTaskIds.size === sorted.length}
                  onCheckedChange={toggleAll}
                />
              </th>
              {columns.map((col) => (
                <th
                  key={col.field}
                  className="px-3 py-2.5 text-left font-medium text-muted-foreground cursor-pointer hover:text-foreground transition-colors"
                  onClick={() => toggleSort(col.field)}
                >
                  <div className="flex items-center gap-1">
                    {col.label}
                    <ArrowUpDown
                      className={cn(
                        'h-3 w-3',
                        sortField === col.field ? 'text-teal-500' : 'opacity-40'
                      )}
                    />
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sorted.map((task) => (
              <tr
                key={task.id}
                className="border-b border-border/40 hover:bg-muted/20 transition-colors cursor-pointer"
                onClick={() => onTaskClick(task)}
              >
                <td className="px-3 py-2.5" onClick={(e) => e.stopPropagation()}>
                  <Checkbox
                    checked={selectedTaskIds.has(task.id)}
                    onCheckedChange={() => toggleSelect(task.id)}
                  />
                </td>
                <td className="px-3 py-2.5 font-medium truncate max-w-[300px]">
                  {task.title}
                </td>
                <td className="px-3 py-2.5">
                  <Badge
                    variant="secondary"
                    className="flex items-center gap-1 w-fit"
                  >
                    <span className={cn('w-2 h-2 rounded-full', priorityColors[task.priority])} />
                    {priorityLabels[task.priority]}
                  </Badge>
                </td>
                <td className="px-3 py-2.5">
                  {task.assignee ? (
                    <div className="flex items-center gap-1.5">
                      <Avatar className="w-5 h-5">
                        <AvatarFallback className="text-[10px] bg-teal-500/20 text-teal-600">
                          {task.assignee.full_name?.slice(0, 2).toUpperCase() || 'U'}
                        </AvatarFallback>
                      </Avatar>
                      <span className="truncate max-w-[120px]">{task.assignee.full_name}</span>
                    </div>
                  ) : (
                    <span className="text-muted-foreground text-xs">—</span>
                  )}
                </td>
                <td className="px-3 py-2.5 text-muted-foreground">{task._columnName}</td>
                <td className="px-3 py-2.5 text-muted-foreground">
                  {task.due_date
                    ? new Date(task.due_date).toLocaleDateString('it-IT')
                    : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
