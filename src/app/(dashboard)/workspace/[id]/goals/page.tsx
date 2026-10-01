'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { Brand } from '@/components/layout/brand';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { GoalDetailSheet } from '@/components/goals/goal-detail-sheet';
import { PlanGate } from '@/components/plan/plan-gate';
import { Plus, Target, Loader2, ChevronRight } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { getProfile } from '@/lib/data';
import { useToast } from '@/hooks/use-toast';
import type { Profile, Goal } from '@/lib/database.types';

export default function GoalsPage() {
  const params = useParams();
  const workspaceId = params.id as string;
  const supabase = createClient();
  const { toast } = useToast();

  const [profile, setProfile] = useState<Profile | null>(null);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [keyResults, setKeyResults] = useState<Record<string, Goal[]>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('active');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [createOpen, setCreateOpen] = useState(false);
  const [newGoalTitle, setNewGoalTitle] = useState('');
  const [newGoalDescription, setNewGoalDescription] = useState('');
  const [newGoalDueDate, setNewGoalDueDate] = useState('');

  const [selectedGoal, setSelectedGoal] = useState<(Goal & { children?: Goal[] }) | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  const loadGoals = useCallback(async () => {
    try {
      const userProfile = await getProfile(supabase);
      setProfile(userProfile);

      const url = new URL(`/api/workspaces/${workspaceId}/goals`, window.location.origin);
      url.searchParams.set('type', 'objective');
      if (statusFilter) url.searchParams.set('status', statusFilter);

      const res = await fetch(url.toString());
      const data = await res.json();

      const objectives = data.goals || [];
      setGoals(objectives);

      const krMap: Record<string, Goal[]> = {};
      const objectiveIds = objectives.map((o: Goal) => o.id);
      if (objectiveIds.length) {
        const krRes = await fetch(`/api/workspaces/${workspaceId}/goals?type=key_result`);
        const krData = await krRes.json();
        const allKRs = krData.goals || [];
        for (const kr of allKRs) {
          if (kr.parent_id && objectiveIds.includes(kr.parent_id)) {
            if (!krMap[kr.parent_id]) krMap[kr.parent_id] = [];
            krMap[kr.parent_id].push(kr);
          }
        }
      }
      setKeyResults(krMap);
    } catch (e) {
      toast({
        variant: 'destructive',
        title: 'Errore',
        description: e instanceof Error ? e.message : 'Impossibile caricare gli obiettivi',
      });
    } finally {
      setIsLoading(false);
    }
  }, [supabase, workspaceId, statusFilter, toast]);

  useEffect(() => {
    loadGoals();
  }, [loadGoals]);

  const handleCreate = async () => {
    if (!newGoalTitle.trim()) return;
    setIsSubmitting(true);
    try {
      const body: Record<string, unknown> = {
        title: newGoalTitle.trim(),
        description: newGoalDescription.trim(),
        type: 'objective',
      };
      if (newGoalDueDate) body.due_date = new Date(newGoalDueDate).toISOString();

      const res = await fetch(`/api/workspaces/${workspaceId}/goals`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Errore creazione');

      setCreateOpen(false);
      setNewGoalTitle('');
      setNewGoalDescription('');
      setNewGoalDueDate('');
      await loadGoals();
      toast({ title: 'Obiettivo creato' });
    } catch (e) {
      toast({
        variant: 'destructive',
        title: 'Errore',
        description: e instanceof Error ? e.message : 'Impossibile creare',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const openDetail = (goal: Goal) => {
    const krs = keyResults[goal.id] || [];
    setSelectedGoal({ ...goal, children: krs });
    setDetailOpen(true);
  };

  const statusOptions = [
    { value: 'active', label: 'Attivi' },
    { value: 'completed', label: 'Completati' },
    { value: 'archived', label: 'Archiviati' },
  ];

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-teal-400" />
      </div>
    );
  }

  const plan = profile?.plan || 'free';

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="border-b border-border/60 bg-card/50 backdrop-blur-2xl flex-shrink-0 sticky top-0 z-50">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex h-14 sm:h-16 items-center justify-between gap-3">
            <div className="flex items-center gap-2 sm:gap-4 min-w-0">
              <Brand href="/dashboard" size="sm" className="hidden sm:flex shrink-0" />
              <Link href="/dashboard" className="text-xs sm:text-sm text-muted-foreground hover:text-primary transition-colors shrink-0">
                Dashboard
              </Link>
              <span className="text-muted-foreground shrink-0">/</span>
              <span className="font-medium font-display text-sm sm:text-base truncate">Goals &amp; OKR</span>
            </div>
            <div className="flex items-center gap-2">
              <PlanGate feature="goals" plan={plan}>
                <Button
                  size="sm"
                  className="gap-1.5 bg-teal-500 hover:bg-teal-400 text-zinc-950"
                  onClick={() => setCreateOpen(true)}
                >
                  <Plus className="h-4 w-4" />
                  Nuovo Obiettivo
                </Button>
              </PlanGate>
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 container mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        <div className="mb-6">
          <div className="flex flex-wrap gap-2">
            {statusOptions.map((opt) => (
              <Button
                key={opt.value}
                variant={statusFilter === opt.value ? 'default' : 'outline'}
                size="sm"
                className={statusFilter === opt.value ? 'bg-teal-500 hover:bg-teal-400 text-zinc-950' : ''}
                onClick={() => setStatusFilter(opt.value)}
              >
                {opt.label}
              </Button>
            ))}
          </div>
        </div>

        <PlanGate feature="goals" plan={plan}>
          {goals.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground">
              <Target className="h-12 w-12 mx-auto mb-4 text-muted-foreground/40" />
              <p className="text-lg font-medium">Nessun obiettivo</p>
              <p className="text-sm mt-1">Crea il tuo primo obiettivo per tracciare i progressi del team.</p>
              <Button
                variant="outline"
                className="mt-4"
                onClick={() => setCreateOpen(true)}
              >
                <Plus className="h-4 w-4 mr-2" />
                Nuovo Obiettivo
              </Button>
            </div>
          ) : (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="space-y-4"
            >
              {goals.map((goal) => (
                <Card
                  key={goal.id}
                  className="border-border/60 bg-card/50 hover:border-teal-500/30 cursor-pointer transition-all group"
                  onClick={() => openDetail(goal)}
                >
                  <CardContent className="p-4 sm:p-6">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2">
                          <Badge
                            variant="outline"
                            className={
                              goal.status === 'active'
                                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                                : goal.status === 'completed'
                                ? 'bg-blue-500/10 text-blue-400 border-blue-500/20'
                                : 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20'
                            }
                          >
                            {goal.status === 'active' ? 'Attivo' : goal.status === 'completed' ? 'Completato' : 'Archiviato'}
                          </Badge>
                          {goal.due_date && (
                            <Badge variant="outline" className="text-[11px]">
                              {new Date(goal.due_date).toLocaleDateString('it-IT')}
                            </Badge>
                          )}
                          {keyResults[goal.id] && (
                            <span className="text-xs text-muted-foreground">
                              {keyResults[goal.id].length} KR
                            </span>
                          )}
                        </div>
                        <h3 className="font-semibold">{goal.title}</h3>
                        {goal.description && (
                          <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                            {goal.description}
                          </p>
                        )}
                        <div className="mt-3 space-y-1.5">
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-muted-foreground">Progresso</span>
                            <span className="font-medium">{goal.progress}%</span>
                          </div>
                          <Progress value={goal.progress} className="h-2" />
                        </div>

                        {keyResults[goal.id]?.slice(0, 3).map((kr) => (
                          <div key={kr.id} className="mt-2 flex items-center gap-2">
                            <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
                              <div
                                className="h-full rounded-full bg-teal-500/60"
                                style={{ width: `${kr.progress}%` }}
                              />
                            </div>
                            <span className="text-[10px] text-muted-foreground truncate max-w-[120px]">
                              {kr.title}
                            </span>
                            <span className="text-[10px] text-muted-foreground">{kr.progress}%</span>
                          </div>
                        ))}
                      </div>
                      <ChevronRight className="h-5 w-5 text-muted-foreground/50 group-hover:text-teal-400 shrink-0 mt-2" />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </motion.div>
          )}
        </PlanGate>
      </main>

      <GoalDetailSheet
        goal={selectedGoal}
        open={detailOpen}
        onOpenChange={setDetailOpen}
        workspaceId={workspaceId}
        onUpdated={loadGoals}
        isAdmin={profile?.id === selectedGoal?.created_by}
      />

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="w-[calc(100vw-2rem)] max-w-md">
          <DialogHeader>
            <DialogTitle>Nuovo Obiettivo</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="goal-title">Titolo</Label>
              <Input
                id="goal-title"
                placeholder="es. Aumentare la retention del 20%"
                value={newGoalTitle}
                onChange={(e) => setNewGoalTitle(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="goal-desc">Descrizione</Label>
              <Input
                id="goal-desc"
                placeholder="Dettagli dell'obiettivo..."
                value={newGoalDescription}
                onChange={(e) => setNewGoalDescription(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="goal-due">Data scadenza</Label>
              <Input
                id="goal-due"
                type="date"
                value={newGoalDueDate}
                onChange={(e) => setNewGoalDueDate(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>
              Annulla
            </Button>
            <Button
              onClick={handleCreate}
              disabled={isSubmitting || !newGoalTitle.trim()}
              className="bg-teal-500 hover:bg-teal-400 text-zinc-950"
            >
              {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Crea'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
