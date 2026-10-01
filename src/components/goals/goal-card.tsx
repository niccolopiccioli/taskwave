'use client';

import { useState } from 'react';
import { ChevronDown, ChevronRight, Pencil, Trash2, Target } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import type { Goal } from '@/lib/database.types';

interface GoalCardProps {
  goal: Goal & { children?: Goal[]; taskCount?: number };
  onEdit?: (goal: Goal) => void;
  onDelete?: (goal: Goal) => void;
  onClick?: (goal: Goal) => void;
  isAdmin?: boolean;
}

const statusLabels: Record<string, string> = {
  active: 'Attivo',
  completed: 'Completato',
  cancelled: 'Annullato',
  archived: 'Archiviato',
};

const statusColors: Record<string, string> = {
  active: 'bg-teal-500/10 text-teal-400 border-teal-500/30',
  completed: 'bg-green-500/10 text-green-400 border-green-500/30',
  cancelled: 'bg-red-500/10 text-red-400 border-red-500/30',
  archived: 'bg-muted text-muted-foreground border-border',
};

const typeLabels: Record<string, string> = {
  objective: 'Obiettivo',
  key_result: 'Key Result',
};

function progressColor(pct: number): string {
  if (pct >= 80) return 'bg-green-500';
  if (pct >= 50) return 'bg-teal-500';
  if (pct >= 25) return 'bg-amber-500';
  return 'bg-red-400';
}

export function GoalCard({ goal, onEdit, onDelete, onClick, isAdmin }: GoalCardProps) {
  const [expanded, setExpanded] = useState(false);
  const progress = goal.target_value > 0
    ? Math.round((goal.current_value / goal.target_value) * 100)
    : 0;
  const hasChildren = goal.children && goal.children.length > 0;

  return (
    <Card className="p-4 space-y-3 transition-colors hover:border-teal-500/20">
      <div className="flex items-start justify-between gap-3">
        <button
          type="button"
          className="flex-1 text-left"
          onClick={() => {
            if (hasChildren) setExpanded(!expanded);
            onClick?.(goal);
          }}
        >
          <div className="flex items-center gap-2">
            {hasChildren && (
              expanded
                ? <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
                : <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
            )}
            <Target className="h-4 w-4 text-teal-400 shrink-0" />
            <h3 className="font-medium text-sm truncate">{goal.title}</h3>
          </div>
          {goal.description && (
            <p className="text-xs text-muted-foreground mt-1.5 line-clamp-2 ml-6 pl-4">
              {goal.description}
            </p>
          )}
        </button>

        <div className="flex items-center gap-1.5 shrink-0">
          <Badge variant="outline" className={cn('text-[10px] px-1.5 py-0', statusColors[goal.status])}>
            {statusLabels[goal.status] || goal.status}
          </Badge>
          {isAdmin && (
            <>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-muted-foreground hover:text-foreground"
                onClick={(e) => { e.stopPropagation(); onEdit?.(goal); }}
              >
                <Pencil className="h-3.5 w-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-red-400 hover:text-red-300 hover:bg-red-500/10"
                onClick={(e) => { e.stopPropagation(); onDelete?.(goal); }}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </>
          )}
        </div>
      </div>

      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground">
            {typeLabels[goal.type] || goal.type}
          </span>
          <span className="text-muted-foreground">
            {goal.current_value} / {goal.target_value} {goal.unit || '%'}
          </span>
        </div>
        <Progress value={Math.min(progress, 100)} className={cn('h-2', progressColor(progress))} />
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>{progress}%</span>
          {(goal as Goal & { taskCount?: number }).taskCount !== undefined && (
            <span>{(goal as Goal & { taskCount?: number }).taskCount} task collegati</span>
          )}
          {goal.due_date && (
            <span>Scadenza: {new Date(goal.due_date).toLocaleDateString('it-IT')}</span>
          )}
        </div>
      </div>

      {expanded && hasChildren && (
        <div className="pl-6 space-y-2 pt-1 border-t border-border/60">
          {goal.children!.map((child) => (
            <div key={child.id} className="flex items-center gap-2 py-1.5">
              <div className={cn('h-1.5 w-1.5 rounded-full', progressColor(
                child.target_value > 0
                  ? Math.round((child.current_value / child.target_value) * 100)
                  : 0
              ))} />
              <span className="text-xs flex-1 truncate">{child.title}</span>
              <span className="text-[10px] text-muted-foreground">
                {child.target_value > 0
                  ? Math.round((child.current_value / child.target_value) * 100)
                  : 0}%
              </span>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
