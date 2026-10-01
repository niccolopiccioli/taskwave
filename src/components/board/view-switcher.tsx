'use client';

import { cn } from '@/lib/utils';
import { PlanGate } from '@/components/plan/plan-gate';
import type { PlanTier } from '@/lib/database.types';
import { LayoutGrid, List, CalendarDays, GanttChart } from 'lucide-react';

export type ViewMode = 'kanban' | 'list' | 'calendar' | 'gantt';

interface ViewSwitcherProps {
  value: ViewMode;
  onChange: (mode: ViewMode) => void;
  plan: PlanTier;
  className?: string;
}

const tabs: Array<{ mode: ViewMode; label: string; icon: typeof LayoutGrid }> = [
  { mode: 'kanban', label: 'Kanban', icon: LayoutGrid },
  { mode: 'list', label: 'Lista', icon: List },
  { mode: 'calendar', label: 'Calendario', icon: CalendarDays },
  { mode: 'gantt', label: 'Timeline', icon: GanttChart },
];

export function ViewSwitcher({ value, onChange, plan, className }: ViewSwitcherProps) {
  return (
    <div className={cn('flex items-center gap-1 rounded-lg bg-muted/60 p-1', className)}>
      {tabs.map((tab) => {
        if (tab.mode === 'gantt') {
          return (
            <PlanGate key={tab.mode} feature="ganttView" plan={plan}>
              <TabButton tab={tab} active={value === tab.mode} onClick={() => onChange(tab.mode)} />
            </PlanGate>
          );
        }
        if (tab.mode === 'list') {
          return (
            <PlanGate key={tab.mode} feature="listView" plan={plan}>
              <TabButton tab={tab} active={value === tab.mode} onClick={() => onChange(tab.mode)} />
            </PlanGate>
          );
        }
        return (
          <TabButton
            key={tab.mode}
            tab={tab}
            active={value === tab.mode}
            onClick={() => onChange(tab.mode)}
          />
        );
      })}
    </div>
  );
}

function TabButton({
  tab,
  active,
  onClick,
}: {
  tab: (typeof tabs)[0];
  active: boolean;
  onClick: () => void;
}) {
  const Icon = tab.icon;
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-all',
        active
          ? 'bg-teal-500 text-white shadow-sm'
          : 'text-muted-foreground hover:text-foreground hover:bg-muted'
      )}
    >
      <Icon className="h-3.5 w-3.5" />
      <span className="hidden sm:inline">{tab.label}</span>
    </button>
  );
}
