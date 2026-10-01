'use client';

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Sparkles,
  MessageSquare,
  ListChecks,
  Wand2,
  Send,
  Loader2,
  Plus,
  Zap,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardHeader, CardContent, CardTitle } from '@/components/ui/card';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetTrigger,
} from '@/components/ui/sheet';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { createClient } from '@/lib/supabase/client';
import { createTask, getBoardWithColumns } from '@/lib/data';
import type { TaskPriority, PlanTier } from '@/lib/database.types';
import { hasFeature } from '@/lib/plans';
import { UpgradeBlur } from '@/components/plan/plan-gate';
import { useToast } from '@/hooks/use-toast';

interface AISidebarProps {
  workspaceId: string;
  plan: PlanTier;
  boardId?: string;
}

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface SubtaskSuggestion {
  title: string;
  priority: TaskPriority;
}

interface ParsedTask {
  title: string;
  priority: TaskPriority;
  dueDate?: string;
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

export function AISidebar({ workspaceId, plan: _plan, boardId }: AISidebarProps) {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState('chat');
  const hasAiAccess = hasFeature(_plan, 'aiAssistant');

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button size="sm" variant="outline" className="gap-1.5 relative">
          <Sparkles className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">AI</span>
          <span className="absolute -top-1 -right-1 h-2 w-2 rounded-full bg-primary animate-pulse" />
        </Button>
      </SheetTrigger>
      <SheetContent
        side="right"
        className="w-[min(100vw,28rem)] sm:max-w-md p-0 flex flex-col"
        hideClose
      >
        <div className="flex flex-col h-full">
          <SheetHeader className="px-6 pt-6 pb-4 border-b border-border/60">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/15">
                <Sparkles className="h-4 w-4 text-primary" />
              </div>
              <div>
                <SheetTitle>AI Assistant</SheetTitle>
                <SheetDescription>TaskWave AI</SheetDescription>
              </div>
            </div>
          </SheetHeader>

          <Tabs value={tab} onValueChange={setTab} className="flex-1 flex flex-col min-h-0">
            <div className="px-6 pt-4 pb-2">
              <TabsList className="w-full">
                <TabsTrigger value="chat" className="flex-1 gap-1.5">
                  <MessageSquare className="h-3.5 w-3.5" />
                  Chat
                </TabsTrigger>
                <TabsTrigger value="breakdown" className="flex-1 gap-1.5">
                  <ListChecks className="h-3.5 w-3.5" />
                  Scomponi
                </TabsTrigger>
                <TabsTrigger value="smart-create" className="flex-1 gap-1.5">
                  <Wand2 className="h-3.5 w-3.5" />
                  Smart Create
                </TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="chat" className="flex-1 flex flex-col min-h-0 mt-0">
              {hasAiAccess ? (
                <ChatTab workspaceId={workspaceId} />
              ) : (
                <div className="flex-1 flex items-center justify-center p-6">
                  <UpgradeBlur feature="AI Assistant" requiredPlan="pro" compact />
                </div>
              )}
            </TabsContent>

            <TabsContent value="breakdown" className="flex-1 flex flex-col min-h-0 mt-0">
              {hasAiAccess ? (
                <BreakdownTab
                  workspaceId={workspaceId}
                  boardId={boardId}
                />
              ) : (
                <div className="flex-1 flex items-center justify-center p-6">
                  <UpgradeBlur feature="Scomposizione AI" requiredPlan="pro" compact />
                </div>
              )}
            </TabsContent>

            <TabsContent value="smart-create" className="flex-1 flex flex-col min-h-0 mt-0">
              {hasAiAccess ? (
                <SmartCreateTab
                  workspaceId={workspaceId}
                  boardId={boardId}
                />
              ) : (
                <div className="flex-1 flex items-center justify-center p-6">
                  <UpgradeBlur feature="Smart Create" requiredPlan="pro" compact />
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </SheetContent>
    </Sheet>
  );
}

function ChatTab({ workspaceId }: { workspaceId: string }) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: 'assistant',
      content: 'Ciao! Sono il tuo AI Assistant di TaskWave. Come posso aiutarti?',
    },
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMsg: ChatMessage = { role: 'user', content: input.trim() };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    try {
      const apiMessages = messages
        .concat(userMsg)
        .map((m) => ({ role: m.role, content: m.content }));

      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: apiMessages, workspaceId }),
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Errore nella chat');
      }

      setMessages((prev) => [...prev, { role: 'assistant', content: data.content }]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content:
            err instanceof Error ? err.message : 'Si e\' verificato un errore.',
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <>
      <ScrollArea className="flex-1 px-6" ref={scrollRef}>
        <div className="space-y-4 py-4">
          {messages.map((msg, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2 }}
              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm ${
                  msg.role === 'user'
                    ? 'bg-primary text-primary-foreground rounded-br-md'
                    : 'bg-muted text-foreground rounded-bl-md'
                }`}
              >
                {msg.content}
              </div>
            </motion.div>
          ))}
          {isLoading && (
            <div className="flex justify-start">
              <div className="bg-muted rounded-2xl rounded-bl-md px-4 py-3 flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-primary animate-bounce" />
                <span className="h-1.5 w-1.5 rounded-full bg-primary animate-bounce [animation-delay:0.15s]" />
                <span className="h-1.5 w-1.5 rounded-full bg-primary animate-bounce [animation-delay:0.3s]" />
              </div>
            </div>
          )}
        </div>
      </ScrollArea>

      <div className="px-6 py-4 border-t border-border/60">
        <div className="flex gap-2">
          <Input
            placeholder="Chiedi qualcosa sull'AI..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isLoading}
            className="flex-1"
          />
          <Button
            size="icon"
            onClick={handleSend}
            disabled={isLoading || !input.trim()}
            className="shrink-0"
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>
    </>
  );
}

function BreakdownTab({
  workspaceId,
  boardId,
}: {
  workspaceId: string;
  boardId?: string;
}) {
  const { toast } = useToast();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<SubtaskSuggestion[]>([]);
  const [addingIds, setAddingIds] = useState<Set<number>>(new Set());

  const handleBreakdown = async () => {
    if (!title.trim()) return;
    setIsLoading(true);
    setSuggestions([]);

    try {
      const res = await fetch('/api/ai/breakdown', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim(),
          workspaceId,
        }),
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Errore nella scomposizione');
      }

      setSuggestions(data.subtasks || []);
    } catch (err) {
      toast({
        variant: 'destructive',
        title: 'Errore',
        description:
          err instanceof Error ? err.message : 'Scomposizione fallita',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddSubtask = async (suggestion: SubtaskSuggestion, index: number) => {
    if (!boardId) {
      toast({
        variant: 'destructive',
        title: 'Errore',
        description: 'Apri una board per aggiungere task.',
      });
      return;
    }

    setAddingIds((prev) => new Set(prev).add(index));
    try {
      const supabase = createClient();
      const board = await getBoardWithColumns(supabase, boardId);

      const firstColumn = board?.columns?.[0];
      if (!firstColumn) {
        throw new Error('Nessuna colonna disponibile nella board');
      }

      await createTask(supabase, firstColumn.id, suggestion.title, suggestion.priority);
      toast({ title: 'Task creato', description: suggestion.title });
    } catch (err) {
      toast({
        variant: 'destructive',
        title: 'Errore',
        description:
          err instanceof Error ? err.message : 'Creazione task fallita',
      });
    } finally {
      setAddingIds((prev) => {
        const next = new Set(prev);
        next.delete(index);
        return next;
      });
    }
  };

  return (
    <div className="flex-1 flex flex-col min-h-0">
      <ScrollArea className="flex-1">
        <div className="px-6 py-4 space-y-4">
          <div className="space-y-3">
            <Input
              placeholder="Titolo del task da scomporre..."
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
            <Textarea
              placeholder="Descrizione (opzionale)..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
            />
            <Button
              className="w-full gap-1.5"
              onClick={handleBreakdown}
              disabled={isLoading || !title.trim()}
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Sparkles className="h-4 w-4" />
              )}
              Scomponi in sotto-task
            </Button>
          </div>

          {isLoading && (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-20 w-full rounded-xl" />
              ))}
            </div>
          )}

          <AnimatePresence>
            {suggestions.map((s, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2, delay: i * 0.05 }}
              >
                <Card className="border-border/60 hover:border-primary/30 transition-colors">
                  <CardHeader className="p-4 pb-2">
                    <div className="flex items-start justify-between gap-2">
                      <CardTitle className="text-sm">{s.title}</CardTitle>
                      <Badge
                        variant="outline"
                        className={`text-[10px] capitalize border ${priorityColors[s.priority]}`}
                      >
                        {priorityLabels[s.priority]}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="p-4 pt-0">
                    <Button
                      size="sm"
                      variant="outline"
                      className="w-full gap-1.5 mt-2"
                      onClick={() => handleAddSubtask(s, i)}
                      disabled={addingIds.has(i) || !boardId}
                    >
                      {addingIds.has(i) ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Plus className="h-3.5 w-3.5" />
                      )}
                      Aggiungi task
                    </Button>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </ScrollArea>
    </div>
  );
}

function SmartCreateTab({
  workspaceId,
  boardId,
}: {
  workspaceId: string;
  boardId?: string;
}) {
  const { toast } = useToast();
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [parsed, setParsed] = useState<ParsedTask | null>(null);
  const [isCreating, setIsCreating] = useState(false);

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
        throw new Error(data.error || 'Errore nel parsing');
      }

      setParsed(data);
    } catch (err) {
      toast({
        variant: 'destructive',
        title: 'Errore',
        description:
          err instanceof Error ? err.message : 'Parsing fallito',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!parsed || !boardId) return;
    setIsCreating(true);

    try {
      const supabase = createClient();
      const board = await getBoardWithColumns(supabase, boardId);

      const firstColumn = board?.columns?.[0];
      if (!firstColumn) {
        throw new Error('Nessuna colonna disponibile nella board');
      }

      await createTask(supabase, firstColumn.id, parsed.title, parsed.priority);

      toast({ title: 'Task creato', description: parsed.title });
      setParsed(null);
      setInput('');
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

  return (
    <div className="flex-1 flex flex-col min-h-0">
      <ScrollArea className="flex-1">
        <div className="px-6 py-4 space-y-4">
          <div className="space-y-3">
            <label className="text-sm text-muted-foreground">
              Descrivi il task in linguaggio naturale...
            </label>
            <Textarea
              placeholder='Es: "Creare la landing page entro venerdì, alta priorità"'
              value={input}
              onChange={(e) => setInput(e.target.value)}
              rows={3}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleParse();
                }
              }}
            />
            <Button
              className="w-full gap-1.5"
              onClick={handleParse}
              disabled={isLoading || !input.trim()}
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Zap className="h-4 w-4" />
              )}
              Analizza input
            </Button>
          </div>

          {isLoading && (
            <div className="space-y-3">
              <Skeleton className="h-4 w-2/3 rounded" />
              <Skeleton className="h-4 w-1/3 rounded" />
              <Skeleton className="h-4 w-1/2 rounded" />
            </div>
          )}

          <AnimatePresence>
            {parsed && (
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
              >
                <Card className="border-primary/30 bg-primary/5">
                  <CardHeader className="p-4 pb-2">
                    <CardTitle className="text-base">{parsed.title}</CardTitle>
                  </CardHeader>
                  <CardContent className="p-4 pt-0 space-y-3">
                    <div className="flex items-center gap-3 text-sm">
                      <span className="text-muted-foreground">Priorit&agrave;:</span>
                      <Badge
                        variant="outline"
                        className={`capitalize border ${priorityColors[parsed.priority]}`}
                      >
                        {priorityLabels[parsed.priority]}
                      </Badge>
                    </div>
                    {parsed.dueDate && (
                      <div className="flex items-center gap-3 text-sm">
                        <span className="text-muted-foreground">Scadenza:</span>
                        <span className="text-foreground">
                          {new Date(parsed.dueDate).toLocaleDateString('it-IT')}
                        </span>
                      </div>
                    )}
                    <div className="flex gap-2 pt-2">
                      <Button
                        className="flex-1 gap-1.5"
                        onClick={handleCreate}
                        disabled={isCreating || !boardId}
                      >
                        {isCreating ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Plus className="h-4 w-4" />
                        )}
                        Crea task
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => {
                          setParsed(null);
                          setInput('');
                        }}
                      >
                        Annulla
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </ScrollArea>
    </div>
  );
}
