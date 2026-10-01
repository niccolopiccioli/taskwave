'use client';

import { useState, useMemo } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Calendar, RefreshCw } from 'lucide-react';

export type RecurrenceRule =
  | 'none'
  | 'daily'
  | 'weekly'
  | 'biweekly'
  | 'monthly'
  | 'weekdays';

interface RecurrencePickerProps {
  value: string;
  endDate?: string;
  onChange: (rule: string, endDate?: string) => void;
  className?: string;
}

const presets: Array<{ rule: RecurrenceRule; label: string; rrule: string }> = [
  { rule: 'none', label: 'Nessuno', rrule: '' },
  { rule: 'daily', label: 'Ogni giorno', rrule: 'FREQ=DAILY' },
  { rule: 'weekly', label: 'Ogni settimana', rrule: 'FREQ=WEEKLY' },
  { rule: 'biweekly', label: 'Ogni 2 settimane', rrule: 'FREQ=WEEKLY;INTERVAL=2' },
  { rule: 'monthly', label: 'Ogni mese', rrule: 'FREQ=MONTHLY' },
  { rule: 'weekdays', label: 'Giorni feriali', rrule: 'FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR' },
];

function parseRule(input: string): RecurrenceRule {
  const mapping: Record<string, RecurrenceRule> = {
    '': 'none',
    'FREQ=DAILY': 'daily',
    'FREQ=WEEKLY': 'weekly',
    'FREQ=WEEKLY;INTERVAL=2': 'biweekly',
    'FREQ=MONTHLY': 'monthly',
    'FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR': 'weekdays',
  };
  return mapping[input] || 'none';
}

function computeNextOccurrence(rule: string): Date | null {
  if (!rule) return null;
  const now = new Date();

  if (rule === 'FREQ=DAILY') {
    const next = new Date(now);
    next.setDate(next.getDate() + 1);
    return next;
  }
  if (rule === 'FREQ=WEEKLY') {
    const next = new Date(now);
    next.setDate(next.getDate() + 7);
    return next;
  }
  if (rule === 'FREQ=WEEKLY;INTERVAL=2') {
    const next = new Date(now);
    next.setDate(next.getDate() + 14);
    return next;
  }
  if (rule === 'FREQ=MONTHLY') {
    const next = new Date(now);
    next.setMonth(next.getMonth() + 1);
    return next;
  }
  if (rule === 'FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR') {
    const next = new Date(now);
    const day = next.getDay();
    if (day === 5) {
      next.setDate(next.getDate() + 3);
    } else if (day === 6) {
      next.setDate(next.getDate() + 2);
    } else {
      next.setDate(next.getDate() + 1);
    }
    return next;
  }

  return null;
}

export function RecurrencePicker({ value, endDate, onChange, className }: RecurrencePickerProps) {
  const active = parseRule(value);
  const [localEndDate, setLocalEndDate] = useState(endDate?.slice(0, 10) || '');

  const nextOccurrence = useMemo(() => computeNextOccurrence(value), [value]);

  return (
    <div className={cn('space-y-3', className)}>
      <Label className="flex items-center gap-1.5">
        <RefreshCw className="h-3.5 w-3.5" /> Ricorrenza
      </Label>
      <div className="flex flex-wrap gap-1.5">
        {presets.map((p) => (
          <Button
            key={p.rule}
            type="button"
            size="sm"
            variant={active === p.rule ? 'default' : 'outline'}
            className={cn(active === p.rule && 'bg-teal-500 hover:bg-teal-600')}
            onClick={() => {
              onChange(p.rrule, localEndDate || undefined);
            }}
          >
            {p.label}
          </Button>
        ))}
      </div>

      {nextOccurrence && (
        <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Calendar className="h-3 w-3" />
          Prossima occorrenza:{' '}
          {nextOccurrence.toLocaleDateString('it-IT', {
            day: 'numeric',
            month: 'long',
            year: 'numeric',
          })}
        </p>
      )}

      <div className="space-y-1.5">
        <Label className="text-xs text-muted-foreground">Fine ricorrenza (opzionale)</Label>
        <Input
          type="date"
          value={localEndDate}
          onChange={(e) => {
            setLocalEndDate(e.target.value);
            const preset = presets.find((p) => p.rule === active);
            onChange(preset?.rrule || '', e.target.value);
          }}
        />
      </div>
    </div>
  );
}
