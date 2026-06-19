'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Search, LayoutDashboard, Plus, Settings, CreditCard } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

interface CommandPaletteProps {
  onInvite?: () => void;
  onManageBilling?: () => void;
}

const STATIC_ACTIONS = [
  { id: 'dashboard', label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { id: 'pricing', label: 'Piani e prezzi', href: '/pricing', icon: CreditCard },
  { id: 'docs', label: 'Documentazione API', href: '/docs', icon: Settings },
];

export function CommandPalette({ onInvite, onManageBilling }: CommandPaletteProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  const run = useCallback(
    (action: () => void) => {
      setOpen(false);
      setQuery('');
      action();
    },
    []
  );

  const filtered = STATIC_ACTIONS.filter((a) =>
    a.label.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="p-0 gap-0 max-w-lg overflow-hidden">
        <DialogHeader className="px-4 pt-4 pb-2">
          <DialogTitle className="sr-only">Command palette</DialogTitle>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Cerca azioni... (⌘K)"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="pl-9 border-0 focus-visible:ring-0 shadow-none"
              autoFocus
            />
          </div>
        </DialogHeader>
        <div className="max-h-72 overflow-y-auto py-2">
          {filtered.map((action) => (
            <button
              key={action.id}
              type="button"
              className={cn(
                'flex w-full items-center gap-3 px-4 py-2.5 text-sm hover:bg-muted/60 transition-colors'
              )}
              onClick={() => run(() => router.push(action.href))}
            >
              <action.icon className="h-4 w-4 text-primary" />
              {action.label}
            </button>
          ))}
          {onInvite && (
            <button
              type="button"
              className="flex w-full items-center gap-3 px-4 py-2.5 text-sm hover:bg-muted/60"
              onClick={() => run(onInvite)}
            >
              <Plus className="h-4 w-4 text-primary" />
              Invita membro al team
            </button>
          )}
          {onManageBilling && (
            <button
              type="button"
              className="flex w-full items-center gap-3 px-4 py-2.5 text-sm hover:bg-muted/60"
              onClick={() => run(onManageBilling)}
            >
              <CreditCard className="h-4 w-4 text-primary" />
              Gestisci fatturazione
            </button>
          )}
        </div>
        <p className="text-[10px] text-muted-foreground text-center pb-3">
          Premi Esc per chiudere
        </p>
      </DialogContent>
    </Dialog>
  );
}
