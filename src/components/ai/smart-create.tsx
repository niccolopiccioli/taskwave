'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Loader2, Plus, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import { createClient } from '@/lib/supabase/client';
import { createTask } from '@/lib/data';
import type { TaskPriority } from '@/lib/database.types';
import { hasFeature } from '@/lib/plans';
import { useToast } from '@/hooks/use-toast';

interface SmartCreateProps {
  columnId: string;
  workspaceId: string;
  plan: 'free' | 'pro' | 'business';
  onTaskCreated?: () => void;
}

const priorityColors: Record<TaskPriority, string> = {
  low: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
  medium: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  high: 'bg-red-500/20 text-red-400 border-red-500/30',
};

const priorityLabels: Record<TaskPriority, string> = {
  low: 'Bassa',
  medium: 'Media',
  high: 'Alta',
};

interface ParsedTask {
  title: string;
  priority: TaskPriority;
  dueDate?: string;
}

export function SmartCreate({ columnId, workspaceId, plan, onTaskCreated }: SmartCreateProps) {
  const { toast } = useToast();
  const [aiMode, setAiMode] = useState(false);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [parsed, setParsed] = useState<ParsedTask | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  const hasAiAccess = hasFeature(plan, 'aiAssistant');

  const handleParse = async () => {
    if (!input.trim()) return;
    setIsLoading(true);
    setParsed(null);

    try {
      const res = await fetch('/api/ai/parse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ input: input.trim(), workspaceId }),
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Errore nel parsing AI');
      }

      setParsed(data);
    } catch (err) {
      toast({
        variant: 'destructive',
        title: 'Errore AI',
        description:
          err instanceof Error ? err.message : 'Analisi del testo fallita',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!parsed) return;
    setIsCreating(true);

    try {
      const supabase = createClient();
      await createTask(supabase, columnId, parsed.title, parsed.priority);

      toast({ title: 'Task creato con AI', description: parsed.title });
      setInput('');
      setParsed(null);
      setAiMode(false);
      onTaskCreated?.();
    } catch (err) {
      toast({
        variant: 'destructive',
        title: 'Errore',
        description:
          err instanceof Error ? err.message : 'Creazione task fallita',
      });
    } finally {
      setIsCreating(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (parsed) {
        handleCreate();
      } else {
        handleParse();
      }
    }
  };

  if (!hasAiAccess) return null;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Button
          variant="ghost"
          size="sm"
          className="gap-1.5 text-muted-foreground hover:text-primary"
          onClick={() => {
            setAiMode(!aiMode);
            setParsed(null);
            setInput('');
          }}
        >
          <Sparkles className="h-3.5 w-3.5" />
          <span className="text-xs">AI Smart Create</span>
          <Switch checked={aiMode} className="ml-1 scale-75" />
        </Button>
      </div>

      <AnimatePresence>
        {aiMode && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="space-y-3 overflow-hidden"
          >
            <div className="relative">
              <Input
                placeholder="Descrivi il task con linguaggio naturale... (es. 'Preparare report finanziario entro venerdì, urgente')"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                disabled={isLoading}
                className="pr-20 border-primary/30 focus-visible:ring-primary text-sm"
              />
              <div className="absolute right-1.5 top-1/2 -translate-y-1/2 flex items-center gap-1">
                {!parsed && (
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 px-2 text-primary hover:text-primary"
                    onClick={handleParse}
                    disabled={isLoading || !input.trim()}
                  >
                    {isLoading ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Sparkles className="h-3.5 w-3.5" />
                    )}
                    <span className="text-xs ml-1">Analizza</span>
                  </Button>
                )}
                {parsed && (
                  <>
                    <Button
                      size="sm"
                      className="h-7 px-2 gap-1"
                      onClick={handleCreate}
                      disabled={isCreating}
                    >
                      {isCreating ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <Plus className="h-3 w-3" />
                      )}
                      <span className="text-xs">Crea</span>
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7"
                      onClick={() => {
                        setParsed(null);
                        setInput('');
                      }}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </>
                )}
              </div>
            </div>

            {isLoading && (
              <div className="space-y-2 p-2">
                <Skeleton className="h-3 w-3/4 rounded" />
                <Skeleton className="h-3 w-1/3 rounded" />
              </div>
            )}

            <AnimatePresence>
              {parsed && (
                <motion.div
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  className="flex items-center gap-2 p-2 rounded-lg bg-primary/5 border border-primary/20"
                >
                  <span className="text-sm font-medium truncate flex-1">{parsed.title}</span>
                  <Badge
                    variant="outline"
                    className={`text-[10px] capitalize border ${priorityColors[parsed.priority]}`}
                  >
                    {priorityLabels[parsed.priority]}
                  </Badge>
                  {parsed.dueDate && (
                    <span className="text-[10px] text-amber-400">
                      {new Date(parsed.dueDate).toLocaleDateString('it-IT')}
                    </span>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
