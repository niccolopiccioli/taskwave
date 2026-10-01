'use client';

import { ExternalLink } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PrBadgeProps {
  prNumber: number;
  prStatus: 'open' | 'closed' | 'merged' | 'draft';
  prUrl?: string;
}

const statusIcons: Record<string, string> = {
  open: '●',
  closed: '●',
  merged: '●',
  draft: '○',
};

const statusColors: Record<string, string> = {
  open: 'bg-purple-500/10 text-purple-400 border-purple-500/30 hover:bg-purple-500/20',
  closed: 'bg-red-500/10 text-red-400 border-red-500/30 hover:bg-red-500/20',
  merged: 'bg-green-500/10 text-green-400 border-green-500/30 hover:bg-green-500/20',
  draft: 'bg-muted text-muted-foreground border-border hover:bg-muted/80',
};

const statusLabels: Record<string, string> = {
  open: 'Open',
  closed: 'Closed',
  merged: 'Merged',
  draft: 'Draft',
};

export function PrBadge({ prNumber, prStatus, prUrl }: PrBadgeProps) {
  const Wrapper = prUrl ? 'a' : 'span';

  return (
    <Wrapper
      href={prUrl || undefined}
      target={prUrl ? '_blank' : undefined}
      rel={prUrl ? 'noopener noreferrer' : undefined}
      className={cn(
        'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium no-underline transition-colors',
        statusColors[prStatus]
      )}
    >
      <span className="text-[8px]">{statusIcons[prStatus]}</span>
      <span>PR #{prNumber}</span>
      <span className="opacity-60">{statusLabels[prStatus]}</span>
      {prUrl && <ExternalLink className="h-2.5 w-2.5 opacity-60" />}
    </Wrapper>
  );
}
