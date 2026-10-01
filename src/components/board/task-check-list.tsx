'use client';

import { useState } from 'react';
import { Plus, Trash2, GripHorizontal, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';
import type { Json } from '@/lib/database.types';

interface ChecklistItem {
  id: string;
  text: string;
  completed: boolean;
}

interface TaskCheckListProps {
  checklist?: Json;
  onUpdate: (items: ChecklistItem[]) => Promise<void>;
  className?: string;
}

function parseChecklist(raw?: Json): ChecklistItem[] {
  if (!raw || !Array.isArray(raw)) return [];
  const items: ChecklistItem[] = [];
  for (const entry of raw) {
    if (typeof entry !== 'object' || entry === null || Array.isArray(entry)) continue;
    const obj = entry as Record<string, unknown>;
    items.push({
      id: typeof obj.id === 'string' ? obj.id : String(obj.id || Math.random()),
      text: typeof obj.text === 'string' ? obj.text : '',
      completed: !!obj.completed,
    });
  }
  return items;
}

export function TaskCheckList({ checklist, onUpdate, className }: TaskCheckListProps) {
  const [items, setItems] = useState<ChecklistItem[]>(() => parseChecklist(checklist));
  const [newText, setNewText] = useState('');
  const [saving, setSaving] = useState(false);
  const [localIdCounter, setLocalIdCounter] = useState(0);

  const completedCount = items.filter((i) => i.completed).length;
  const totalCount = items.length;
  const progress = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  const save = async (next: ChecklistItem[]) => {
    setItems(next);
    setSaving(true);
    try {
      await onUpdate(next);
    } finally {
      setSaving(false);
    }
  };

  const toggleItem = (id: string) => {
    const next = items.map((i) => (i.id === id ? { ...i, completed: !i.completed } : i));
    save(next);
  };

  const deleteItem = (id: string) => {
    save(items.filter((i) => i.id !== id));
  };

  const addItem = () => {
    if (!newText.trim()) return;
    const nextId = `check_${Date.now()}_${localIdCounter}`;
    setLocalIdCounter((c) => c + 1);
    save([...items, { id: nextId, text: newText.trim(), completed: false }]);
    setNewText('');
  };

  return (
    <div className={cn('space-y-3', className)}>
      {totalCount > 0 && (
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>
              {completedCount}/{totalCount} completati
            </span>
            <span>{progress}%</span>
          </div>
          <Progress value={progress} className="h-1.5" />
        </div>
      )}

      <div className="space-y-1.5">
        {items.map((item) => (
          <div
            key={item.id}
            className="flex items-center gap-2 rounded-lg border border-border/60 px-3 py-2 group"
          >
            <GripHorizontal className="h-3.5 w-3.5 text-muted-foreground/40 shrink-0" />
            <Checkbox
              checked={item.completed}
              onCheckedChange={() => toggleItem(item.id)}
              className="shrink-0"
            />
            <span
              className={cn(
                'flex-1 text-sm',
                item.completed && 'line-through text-muted-foreground'
              )}
            >
              {item.text}
            </span>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity text-red-400 hover:text-red-300"
              onClick={() => deleteItem(item.id)}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        ))}
      </div>

      <div className="flex gap-2">
        <Input
          placeholder="Nuovo elemento..."
          value={newText}
          onChange={(e) => setNewText(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && addItem()}
          className="h-8 text-sm"
        />
        <Button
          size="sm"
          variant="outline"
          className="h-8 shrink-0"
          onClick={addItem}
          disabled={saving || !newText.trim()}
        >
          {saving ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Plus className="h-3.5 w-3.5" />
          )}
        </Button>
      </div>
    </div>
  );
}
