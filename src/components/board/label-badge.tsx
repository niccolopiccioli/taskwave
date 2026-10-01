'use client';

import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface LabelBadgeProps {
  name: string;
  color?: string;
  editable?: boolean;
  onRemove?: () => void;
  className?: string;
}

const defaultColors = [
  '#14b8a6',
  '#3b82f6',
  '#8b5cf6',
  '#ec4899',
  '#f97316',
  '#eab308',
  '#22c55e',
  '#ef4444',
];

function getLabelColor(color?: string): string {
  if (!color) return defaultColors[0];
  if (/^#[0-9a-fA-F]{6}$/.test(color)) return color;
  const idx = color.charCodeAt(0) % defaultColors.length;
  return defaultColors[idx];
}

export function LabelBadge({ name, color, editable = false, onRemove, className }: LabelBadgeProps) {
  const bg = getLabelColor(color);

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium text-white',
        className
      )}
      style={{ backgroundColor: bg }}
    >
      {name}
      {editable && onRemove && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            e.preventDefault();
            onRemove();
          }}
          className="ml-0.5 rounded-full p-0.5 hover:bg-black/20 transition-colors"
          aria-label={`Rimuovi ${name}`}
        >
          <X className="h-3 w-3" />
        </button>
      )}
    </span>
  );
}
