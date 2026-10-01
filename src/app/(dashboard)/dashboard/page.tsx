'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';

import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Plus, Layout, CheckCircle, Clock, AlertCircle, Loader2, Download, BarChart3, Timer, StopCircle, Target, Github, Puzzle, Trash2, ArrowRight, Layers, TrendingUp, Users, Sparkles,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { createClient } from '@/lib/supabase/client';
import {
  getProfile,
  getWorkspaces,
  createWorkspace,
  createBoard,
  inviteMemberByEmail,
  getBoards,
  getWorkspaceStats,
  getWorkspaceAnalytics,
  exportWorkspaceCsv,
  logAuditEvent,
} from '@/lib/data';
import type { Profile, WorkspaceWithMembers } from '@/lib/database.types';
import { canCreateWorkspace, canAddMember, canCreateBoard, canSendEmailInvites, hasFeature } from '@/lib/plans';
import { canInviteMembers, canDeleteWorkspace } from '@/lib/workspace-permissions';
import { deleteWorkspaceApi } from '@/lib/data';
import { DashboardHeader } from '@/components/layout/dashboard-header';
import { WorkspaceTeamPanel } from '@/components/workspace/workspace-team-panel';
import { WorkspaceAuditPanel } from '@/components/workspace/workspace-audit-panel';
import { WorkspaceWebhooksPanel } from '@/components/workspace/workspace-webhooks-panel';
import { WorkspaceCustomFieldsPanel } from '@/components/workspace/workspace-custom-fields-panel';
import { WorkspaceActivityFeed } from '@/components/workspace/workspace-activity-feed';
import { PlanGate } from '@/components/plan/plan-gate';
import { UpgradeCtaBanner } from '@/components/pricing/pricing-cards';
import { PendingInvitesBanner } from '@/components/workspace/pending-invites-banner';
import { CommandPalette } from '@/components/command-palette';
import { OnboardingWizard } from '@/components/onboarding/onboarding-wizard';
import { BOARD_TEMPLATES, type BoardTemplateId } from '@/lib/board-templates';

interface Board {
  id: string;
  name: string;
  columns?: Array<{ id: string; name: string }>;
}

function StatCard({ label, value, icon: Icon, color, delay = 0 }: { label: string; value: number; icon: React.ElementType; color: string; delay?: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.4, ease: [0.25, 0.1, 0.25, 1] }}
      className="group relative overflow-hidden rounded-2xl border border-border/60 bg-card/40 p-5 hover:border-border/80 transition-all"
    >
      <div className={`absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 bg-gradient-to-br ${color.replace('text-', 'from-').replace('text-amber', 'from-amber').replace('text-emerald', 'from-emerald').replace('text-zinc', 'from-zinc').replace('text-teal', 'from-teal').replace('text-red', 'from-red').replace('text-blue', 'from-blue')}/5 to-transparent`} />
      <div className="relative">
        <div className="flex items-center justify-between mb-3">
          <span className="text-[11px] font-medium uppercase tracking-widest text-muted-foreground/70">{label}</span>
          <Icon className={`w-4 h-4 ${color}`} />
        </div>
        <p className={`text-3xl sm:text-4xl font-bold tracking-tight ${color}`}>{value}</p>
      </div>
    </motion.div>
  );
}


export default function DashboardPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-background">
          <Loader2 className="w-8 h-8 animate-spin text-teal-400" />
        </div>
      }
    >
      <DashboardContent />
    </Suspense>
  );
}

function DashboardContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const supabase = createClient();

  const [isLoading, setIsLoading] = useState(true);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [workspaces, setWorkspaces] = useState<WorkspaceWithMembers[]>([]);
  const [boards, setBoards] = useState<Board[]>([]);
  const [selectedWorkspace, setSelectedWorkspace] = useState<WorkspaceWithMembers | null>(null);
  const [stats, setStats] = useState({ total: 0, inProgress: 0, done: 0, boardCount: 0 });
  const [analytics, setAnalytics] = useState<{ weeklyDone: number[]; completionRate: number } | null>(null);
  const [runningTimer, setRunningTimer] = useState<{ entryId: string; taskTitle: string; taskId: string; startedAt: string } | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [goals, setGoals] = useState<Array<{ id: string; title: string; progress: number; status: string; type: string }>>([]);
  const [timeSummary, setTimeSummary] = useState<{ today: number; week: number }>({ today: 0, week: 0 });
  const [quickStats, setQuickStats] = useState({ dueThisWeek: 0, overdue: 0, activeAutomations: 0 });

  const [createWorkspaceOpen, setCreateWorkspaceOpen] = useState(false);
  const [createBoardOpen, setCreateBoardOpen] = useState(false);
  const [inviteMemberOpen, setInviteMemberOpen] = useState(false);

  const [newWorkspaceName, setNewWorkspaceName] = useState('');
  const [newBoardName, setNewBoardName] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');
  const [boardTemplate, setBoardTemplate] = useState<BoardTemplateId>('default');
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);
  const [deleting, setDeleting] = useState(false);

  const loadData = async () => {
    const userProfile = await getProfile(supabase);
    if (!userProfile) { router.push('/login'); return; }
    setProfile(userProfile);
    const ws = await getWorkspaces(supabase);
    setWorkspaces(ws);
    if (ws.length > 0) {
      const current = selectedWorkspace ? ws.find((w) => w.id === selectedWorkspace.id) || ws[0] : ws[0];
      setSelectedWorkspace(current);
      const boardsData = await getBoards(supabase, current.id);
      setBoards(boardsData);
      const statsData = await getWorkspaceStats(supabase, current.id);
      setStats(statsData);
      const analyticsData = await getWorkspaceAnalytics(supabase, current.id);
      setAnalytics(analyticsData);
      fetchTimeEntries(current.id);
      fetchGoals(current.id);
      fetchQuickStats(current.id);
    }
  };

  useEffect(() => { loadData().finally(() => setIsLoading(false)); // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!runningTimer) return;
    const started = new Date(runningTimer.startedAt).getTime();
    setElapsedSeconds(Math.floor((Date.now() - started) / 1000));
    const interval = setInterval(() => setElapsedSeconds(Math.floor((Date.now() - started) / 1000)), 1000);
    return () => clearInterval(interval);
  }, [runningTimer]);

  const fetchTimeEntries = async (workspaceId: string) => {
    try {
      const res = await fetch(`/api/time/entries?workspaceId=${workspaceId}&dateFrom=${getTodayISO()}`);
      const data = await res.json();
      const entries = data.entries || [];
      const running = entries.find((e: Record<string, unknown>) => e.is_running);
      if (running) {
        const taskTitle = (running as Record<string, unknown>).tasks as Record<string, string> | undefined;
        setRunningTimer({ entryId: running.id as string, taskTitle: taskTitle?.title || 'Task', taskId: running.task_id as string, startedAt: running.started_at as string });
      } else setRunningTimer(null);
      let todaySec = 0, weekSec = 0;
      const now = new Date(), todayStr = getTodayISO();
      const weekStart = new Date(now); weekStart.setDate(now.getDate() - now.getDay());
      const weekStartStr = weekStart.toISOString().slice(0, 10);
      for (const e of entries) {
        const dur = (e.duration_seconds as number) || 0;
        const day = (e.started_at as string).slice(0, 10);
        if (day === todayStr) todaySec += dur;
        if (day >= weekStartStr) weekSec += dur;
      }
      setTimeSummary({ today: Math.round((todaySec / 3600) * 100) / 100, week: Math.round((weekSec / 3600) * 100) / 100 });
    } catch {}
  };

  const fetchGoals = async (workspaceId: string) => {
    try {
      const res = await fetch(`/api/workspaces/${workspaceId}/goals?status=active&limit=5`);
      const data = await res.json();
      setGoals((data.goals || []).filter((g: Record<string, unknown>) => g.type === 'objective').slice(0, 5));
    } catch {}
  };

  const fetchQuickStats = async (workspaceId: string) => {
    try {
      const { data: boards } = await supabase.from('boards').select('id').eq('workspace_id', workspaceId);
      if (!boards?.length) return;
      const boardIds = boards.map((b) => b.id);
      const { data: columns } = await supabase.from('columns').select('id').in('board_id', boardIds);
      if (!columns?.length) return;
      const colIds = columns.map((c) => c.id);
      const { data: tasks } = await supabase.from('tasks').select('id, due_date').in('column_id', colIds);
      let dueThisWeek = 0, overdue = 0;
      const now = new Date(), weekEnd = new Date(now);
      weekEnd.setDate(now.getDate() + (7 - now.getDay()));
      for (const t of tasks || []) {
        if (!t.due_date) continue;
        const d = new Date(t.due_date);
        if (d < now) overdue++; else if (d <= weekEnd) dueThisWeek++;
      }
      const { count } = await supabase.from('automation_rules').select('id', { count: 'exact', head: true }).eq('workspace_id', workspaceId).eq('enabled', true);
      setQuickStats({ dueThisWeek, overdue, activeAutomations: count || 0 });
    } catch {}
  };

  function getTodayISO() { return new Date().toISOString().slice(0, 10); }

  useEffect(() => {
    if (!isLoading && workspaces.length === 0 && !localStorage.getItem('taskwave_onboarding_done')) setShowOnboarding(true);
  }, [isLoading, workspaces.length]);

  useEffect(() => {
    if (searchParams.get('checkout') === 'success') {
      toast({ title: 'Abbonamento attivato!', description: 'Il tuo piano è stato aggiornato con successo.' });
      loadData(); router.replace('/dashboard');
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams, toast, router]);

  const handleStopTimer = async () => {
    if (!runningTimer) return;
    try {
      await fetch('/api/time/stop', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ entryId: runningTimer.entryId }) });
      setRunningTimer(null);
      if (selectedWorkspace) fetchTimeEntries(selectedWorkspace.id);
      toast({ title: 'Timer fermato' });
    } catch { toast({ variant: 'destructive', title: 'Errore', description: 'Impossibile fermare il timer' }); }
  };

  function formatElapsed(seconds: number) {
    const h = Math.floor(seconds / 3600), m = Math.floor((seconds % 3600) / 60), s = seconds % 60;
    return h > 0 ? `${h}h ${m}m ${s}s` : m > 0 ? `${m}m ${s}s` : `${s}s`;
  }

  const handleLogout = async () => {
    await fetch('/api/auth/step-up/send', { method: 'DELETE' });
    await supabase.auth.signOut();
    router.push('/login'); router.refresh();
  };

  const handleCreateWorkspace = async () => {
    if (!newWorkspaceName.trim() || !profile) return;
    if (!canCreateWorkspace(profile.plan, workspaces.length)) { toast({ variant: 'destructive', title: 'Limite raggiunto', description: 'Passa a Pro per workspace illimitati.' }); return; }
    setIsSubmitting(true);
    try {
      await createWorkspace(supabase, newWorkspaceName);
      setCreateWorkspaceOpen(false); setNewWorkspaceName(''); await loadData();
      toast({ title: 'Workspace creato' });
    } catch (error) { toast({ variant: 'destructive', title: 'Errore', description: error instanceof Error ? error.message : 'Errore nella creazione' }); }
    finally { setIsSubmitting(false); }
  };

  const handleCreateBoard = async () => {
    if (!newBoardName.trim() || !selectedWorkspace || !profile) return;
    if (!canCreateBoard(profile.plan, boards.length)) { toast({ variant: 'destructive', title: 'Limite board raggiunto', description: 'Il piano Gratuito permette max 3 board. Passa a Pro su /pricing.' }); return; }
    setIsSubmitting(true);
    try {
      const board = await createBoard(supabase, selectedWorkspace.id, newBoardName, '', boardTemplate);
      await logAuditEvent(supabase, selectedWorkspace.id, 'board.created', 'board', board.id, { name: newBoardName, template: boardTemplate });
      setCreateBoardOpen(false); setNewBoardName('');
      const boardsData = await getBoards(supabase, selectedWorkspace.id);
      setBoards(boardsData); toast({ title: 'Board creata' });
    } catch (error) { toast({ variant: 'destructive', title: 'Errore', description: error instanceof Error ? error.message : 'Errore nella creazione' }); }
    finally { setIsSubmitting(false); }
  };

  const handleInviteMember = async () => {
    if (!inviteEmail.trim() || !selectedWorkspace || !profile) return;
    if (!canInviteMembers(selectedWorkspace, profile.id)) { toast({ variant: 'destructive', title: 'Permesso negato', description: 'Solo gli admin possono invitare membri.' }); return; }
    if (!canAddMember(profile.plan, selectedWorkspace.members.length)) { toast({ variant: 'destructive', title: 'Limite membri raggiunto', description: 'Passa a un piano superiore per più membri.' }); return; }
    if (!canSendEmailInvites(profile.plan)) { toast({ variant: 'destructive', title: 'Funzione Pro', description: 'Gli inviti al team richiedono il piano Pro o Business.' }); return; }
    setIsSubmitting(true);
    try {
      const result = await inviteMemberByEmail(supabase, selectedWorkspace.id, inviteEmail);
      setInviteMemberOpen(false); setInviteEmail(''); await loadData();
      toast({ title: result.hasAccount ? 'Invito inviato in-app' : 'Invito creato', description: result.message });
    } catch (error) { toast({ variant: 'destructive', title: 'Errore invito', description: error instanceof Error ? error.message : 'Impossibile invitare' }); }
    finally { setIsSubmitting(false); }
  };

  const handleWorkspaceChange = async (workspace: WorkspaceWithMembers) => {
    setSelectedWorkspace(workspace);
    const boardsData = await getBoards(supabase, workspace.id);
    setBoards(boardsData);
    const statsData = await getWorkspaceStats(supabase, workspace.id);
    setStats(statsData);
    const analyticsData = await getWorkspaceAnalytics(supabase, workspace.id);
    setAnalytics(analyticsData);
    fetchTimeEntries(workspace.id); fetchGoals(workspace.id); fetchQuickStats(workspace.id);
  };

  const handleManageBilling = async () => {
    try {
      const response = await fetch('/api/stripe/portal', { method: 'POST' });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      window.location.href = data.url;
    } catch (error) { toast({ variant: 'destructive', title: 'Errore', description: error instanceof Error ? error.message : 'Impossibile aprire il portale.' }); }
  };

  const handleDeleteWorkspace = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteWorkspaceApi(deleteTarget.id);
      toast({ title: 'Workspace eliminato', description: `"${deleteTarget.name}" è stato eliminato.` });
      setDeleteTarget(null);
      if (selectedWorkspace?.id === deleteTarget.id) setSelectedWorkspace(workspaces.find((w) => w.id !== deleteTarget.id) || null);
      setWorkspaces((prev) => prev.filter((w) => w.id !== deleteTarget.id));
    } catch (e) { toast({ variant: 'destructive', title: 'Errore', description: e instanceof Error ? e.message : 'Impossibile eliminare il workspace' }); }
    finally { setDeleting(false); }
  };

  const handleWorkspaceLeftOrDeleted = async () => { setSelectedWorkspace(null); await loadData(); };

  const userCanInvite = !!profile && !!selectedWorkspace && canInviteMembers(selectedWorkspace, profile.id);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <div className="relative w-16 h-16 mx-auto">
            <div className="absolute inset-0 rounded-full bg-teal-500/20 animate-ping" />
            <div className="relative w-16 h-16 rounded-full bg-teal-500/10 flex items-center justify-center">
              <Layers className="w-6 h-6 text-teal-400" />
            </div>
          </div>
          <p className="text-sm text-muted-foreground animate-pulse">Caricamento dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/4 w-[600px] h-[600px] bg-teal-500/5 rounded-full blur-[150px]" />
        <div className="absolute bottom-0 right-1/4 w-[400px] h-[400px] bg-amber-500/5 rounded-full blur-[120px]" />
      </div>

      <CommandPalette onInvite={() => setInviteMemberOpen(true)} onManageBilling={handleManageBilling} />

      {showOnboarding && (
        <OnboardingWizard
          onSkip={() => { localStorage.setItem('taskwave_onboarding_done', '1'); setShowOnboarding(false); }}
          onComplete={async ({ workspaceName, boardName }) => {
            localStorage.setItem('taskwave_onboarding_done', '1'); setShowOnboarding(false);
            try {
              const ws = await createWorkspace(supabase, workspaceName);
              await createBoard(supabase, ws.id, boardName, '', 'sprint');
              await loadData(); toast({ title: 'Setup completato!', description: 'Workspace e board pronti.' });
            } catch (e) { toast({ variant: 'destructive', title: 'Errore setup', description: e instanceof Error ? e.message : 'Riprova' }); }
          }}
        />
      )}

      <DashboardHeader
        profile={profile} workspaceName={selectedWorkspace?.name}
        canInvite={userCanInvite} onInvite={() => setInviteMemberOpen(true)}
        onLogout={handleLogout} onManageBilling={handleManageBilling} onProfileUpdated={setProfile}
      />

      <main className="relative container mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-8">
          <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.5 }}>
            <h1 className="text-2xl sm:text-3xl font-display font-bold tracking-tight">
              <span className="text-muted-foreground font-normal">Ciao, </span>
              {profile?.full_name || 'Utente'}
            </h1>
            <p className="text-muted-foreground text-sm mt-1">
              {new Date().toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.5 }}
            className="flex items-center gap-2 flex-wrap"
          >
            {selectedWorkspace && profile && (
              <>
                <PlanGate feature="goals" plan={profile.plan}>
                  <Button size="sm" variant="outline" className="gap-1.5 rounded-full text-xs h-8" onClick={() => router.push(`/workspace/${selectedWorkspace.id}/goals`)}>
                    <Target className="w-3.5 h-3.5" /> Nuovo Goal
                  </Button>
                </PlanGate>
                <PlanGate feature="gitIntegration" plan={profile.plan}>
                  <Button size="sm" variant="outline" className="gap-1.5 rounded-full text-xs h-8">
                    <Github className="w-3.5 h-3.5" /> Connetti GitHub
                  </Button>
                </PlanGate>
                <Button size="sm" variant="outline" className="gap-1.5 rounded-full text-xs h-8" onClick={() => router.push('/templates')}>
                  <Puzzle className="w-3.5 h-3.5" /> Templates
                </Button>
              </>
            )}
          </motion.div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
          className="flex items-center gap-2 flex-wrap mb-8"
        >
          {workspaces.length === 0 ? (
            <Button size="sm" onClick={() => setCreateWorkspaceOpen(true)} className="rounded-full bg-teal-500 hover:bg-teal-400 text-zinc-950 gap-1.5">
              <Plus className="w-3.5 h-3.5" /> Crea il tuo primo workspace
            </Button>
          ) : (
            <>
              <span className="text-[11px] font-medium uppercase tracking-widest text-muted-foreground/50 mr-1">Workspace</span>
              {workspaces.map((ws) => (
                <motion.button
                  key={ws.id}
                  layout
                  onClick={() => handleWorkspaceChange(ws)}
                  className={`relative group px-3.5 py-1.5 rounded-full text-xs font-medium transition-all duration-300 ${
                    selectedWorkspace?.id === ws.id
                      ? 'bg-teal-500/15 text-teal-300 shadow-sm shadow-teal-500/10 ring-1 ring-teal-500/25'
                      : 'bg-card/30 text-muted-foreground hover:text-foreground border border-border/40'
                  }`}
                >
                  {ws.name}
                  {selectedWorkspace?.id === ws.id && (
                    <motion.span layoutId="pill-active" className="absolute inset-0 rounded-full bg-teal-500/5" transition={{ type: 'spring', stiffness: 300, damping: 30 }} />
                  )}
                  {profile && canDeleteWorkspace(ws, profile.id) && (
                    <button
                      onClick={(e) => { e.stopPropagation(); setDeleteTarget({ id: ws.id, name: ws.name }); }}
                      className="absolute -top-1 -right-1 h-3 w-3 rounded-full bg-red-500/70 border border-background flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-400"
                    >
                      <Trash2 className="h-1.5 w-1.5 text-white" />
                    </button>
                  )}
                </motion.button>
              ))}
              <Button size="sm" variant="ghost" onClick={() => setCreateWorkspaceOpen(true)} className="rounded-full text-xs h-7 w-7 p-0">
                <Plus className="w-3.5 h-3.5" />
              </Button>
            </>
          )}
        </motion.div>

        <PendingInvitesBanner onAccepted={loadData} />
        {profile && <div className="mb-6"><UpgradeCtaBanner plan={profile.plan} /></div>}

        <AnimatePresence mode="wait">
          {!selectedWorkspace ? (
            <motion.div key="empty" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="text-center py-20">
              <div className="w-16 h-16 mx-auto mb-6 rounded-2xl bg-teal-500/10 flex items-center justify-center">
                <Layers className="w-8 h-8 text-teal-400" />
              </div>
              <h2 className="text-xl font-display font-bold mb-2">Nessun workspace selezionato</h2>
              <p className="text-muted-foreground text-sm mb-6">Crea o seleziona un workspace per iniziare.</p>
              <Button onClick={() => setCreateWorkspaceOpen(true)} className="bg-teal-500 hover:bg-teal-400 text-zinc-950">
                <Plus className="w-4 h-4 mr-2" /> Crea workspace
              </Button>
            </motion.div>
          ) : (
            <motion.div key={selectedWorkspace.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-8">

              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                <motion.div
                  initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
                  className="relative overflow-hidden rounded-2xl border border-border/60 bg-card/30 p-5 lg:col-span-1"
                >
                  <div className="absolute top-0 right-0 w-32 h-32 bg-teal-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
                  <div className="relative">
                    <span className="text-[11px] font-medium uppercase tracking-widest text-muted-foreground/50">Task totali</span>
                    <p className="text-4xl sm:text-5xl font-bold text-teal-400 mt-2 tabular-nums">{stats.total}</p>
                    <div className="flex items-center gap-2 mt-2">
                      <TrendingUp className="w-3 h-3 text-emerald-400" />
                      <span className="text-[11px] text-emerald-400/70">{stats.done} completati</span>
                    </div>
                  </div>
                </motion.div>

                <StatCard label="In progresso" value={stats.inProgress} icon={Clock} color="text-amber-400" delay={0.15} />
                <StatCard label="Completati" value={stats.done} icon={CheckCircle} color="text-emerald-400" delay={0.2} />
                <StatCard label="Board" value={stats.boardCount} icon={Layers} color="text-zinc-400" delay={0.25} />
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-6">

                  <motion.div
                    initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
                  >
                    <div className="flex items-center justify-between mb-4">
                      <h2 className="text-sm font-semibold flex items-center gap-2">
                        <Layout className="w-4 h-4 text-teal-400" />
                        Board
                        <span className="text-muted-foreground/50 font-normal text-xs">({boards.length})</span>
                      </h2>
                      <Button size="sm" className="h-7 text-xs rounded-full bg-teal-500 hover:bg-teal-400 text-zinc-950 gap-1" onClick={() => setCreateBoardOpen(true)} disabled={!selectedWorkspace}>
                        <Plus className="w-3 h-3" /> Nuova Board
                      </Button>
                    </div>

                    {boards.length === 0 ? (
                      <div className="rounded-2xl border border-dashed border-border/40 p-10 text-center">
                        <div className="w-12 h-12 mx-auto mb-4 rounded-xl bg-teal-500/5 flex items-center justify-center">
                          <Layout className="w-6 h-6 text-teal-400/40" />
                        </div>
                        <p className="text-sm text-muted-foreground mb-3">Nessuna board in questo workspace</p>
                        <Button size="sm" variant="outline" className="rounded-full" onClick={() => setCreateBoardOpen(true)}>
                          <Plus className="w-3 h-3 mr-1.5" /> Crea la prima board
                        </Button>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {boards.map((board, i) => (
                          <motion.div
                            key={board.id}
                            initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 + i * 0.05 }}
                            whileHover={{ y: -2 }}
                            onClick={() => router.push(`/workspace/${selectedWorkspace.id}/board/${board.id}`)}
                            className="group relative overflow-hidden rounded-xl border border-border/50 bg-card/30 p-4 cursor-pointer hover:border-teal-500/30 hover:bg-teal-500/[0.03] transition-all duration-300"
                          >
                            <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-bl from-teal-500/5 to-transparent rounded-bl-full" />
                            <div className="relative flex items-start gap-3">
                              <div className="w-9 h-9 rounded-lg bg-teal-500/10 flex items-center justify-center shrink-0 group-hover:bg-teal-500/20 transition-colors">
                                <Layout className="w-4 h-4 text-teal-400" />
                              </div>
                              <div className="min-w-0">
                                <p className="font-medium text-sm truncate">{board.name}</p>
                                <p className="text-[11px] text-muted-foreground/60 mt-0.5">{board.columns?.length || 3} colonne</p>
                              </div>
                              <ArrowRight className="w-3.5 h-3.5 text-teal-400/0 group-hover:text-teal-400/60 transition-all ml-auto shrink-0 mt-1.5" />
                            </div>
                          </motion.div>
                        ))}
                      </div>
                    )}
                  </motion.div>

                  {analytics && profile && (
                    <motion.div
                      initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}
                    >
                      <PlanGate feature="advancedAnalytics" plan={profile.plan}>
                        <div className="rounded-2xl border border-border/50 bg-card/30 p-5">
                          <div className="flex items-center justify-between mb-5">
                            <h3 className="text-sm font-semibold flex items-center gap-2">
                              <BarChart3 className="w-4 h-4 text-teal-400" />
                              Analytics
                            </h3>
                            <div className="flex items-center gap-3">
                              <span className="text-xs text-muted-foreground">
                                Completamento: <strong className="text-emerald-400">{analytics.completionRate}%</strong>
                              </span>
                              {hasFeature(profile.plan, 'csvExport') && (
                                <Button size="sm" variant="ghost" className="h-7 text-xs gap-1 rounded-full"
                                  onClick={() => exportWorkspaceCsv({ ...stats, completionRate: analytics.completionRate }, selectedWorkspace.name)}
                                >
                                  <Download className="w-3 h-3" /> CSV
                                </Button>
                              )}
                            </div>
                          </div>
                          <div className="flex items-end gap-2 h-24">
                            {analytics.weeklyDone.map((count, i) => {
                              const max = Math.max(...analytics.weeklyDone, 1);
                              return (
                                <div key={i} className="flex-1 flex flex-col items-center gap-1.5 group/chart">
                                  <div className="relative w-full rounded-lg bg-gradient-to-t from-teal-500/60 to-teal-400/30 transition-all duration-500 min-h-[4px] hover:from-teal-400/80 hover:to-teal-300/50"
                                    style={{ height: `${Math.max(6, (count / max) * 100)}%` }}
                                  >
                                    <div className="absolute -top-5 left-1/2 -translate-x-1/2 text-[10px] text-teal-400/0 group-hover/chart:text-teal-400/80 transition-colors">{count}</div>
                                  </div>
                                  <span className="text-[9px] text-muted-foreground/50">{4 - i} sett.</span>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      </PlanGate>
                    </motion.div>
                  )}
                </div>

                <div className="space-y-4">

                  <motion.div
                    initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}
                    className="rounded-2xl border border-border/50 bg-card/30 p-5"
                  >
                    <h3 className="text-sm font-semibold flex items-center gap-2 mb-4">
                      <AlertCircle className="w-4 h-4 text-amber-400" />
                      Scadenze
                    </h3>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between py-2 border-b border-border/30">
                        <span className="text-xs text-muted-foreground">In scadenza</span>
                        <span className="text-sm font-semibold text-amber-400">{quickStats.dueThisWeek}</span>
                      </div>
                      <div className="flex items-center justify-between py-2 border-b border-border/30">
                        <span className="text-xs text-muted-foreground">In ritardo</span>
                        <span className="text-sm font-semibold text-red-400">{quickStats.overdue}</span>
                      </div>
                      <div className="flex items-center justify-between py-2">
                        <span className="text-xs text-muted-foreground">Automazioni</span>
                        <span className="text-sm font-semibold text-blue-400">{quickStats.activeAutomations}</span>
                      </div>
                    </div>
                  </motion.div>

                  {goals.length > 0 && profile && (
                    <motion.div
                      initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}
                    >
                      <PlanGate feature="goals" plan={profile.plan}>
                        <div className="rounded-2xl border border-border/50 bg-card/30 p-5">
                          <div className="flex items-center justify-between mb-4">
                            <h3 className="text-sm font-semibold flex items-center gap-2">
                              <Target className="w-4 h-4 text-teal-400" />
                              Obiettivi
                            </h3>
                            <Button size="sm" variant="ghost" className="h-6 text-[10px] rounded-full" onClick={() => router.push(`/workspace/${selectedWorkspace.id}/goals`)}>
                              Vedi tutti
                            </Button>
                          </div>
                          <div className="space-y-3">
                            {goals.slice(0, 3).map((goal) => (
                              <div key={goal.id}>
                                <div className="flex items-center justify-between mb-1.5">
                                  <span className="text-xs font-medium truncate">{goal.title}</span>
                                  <span className="text-[10px] text-muted-foreground/60">{goal.progress}%</span>
                                </div>
                                <div className="h-1.5 rounded-full bg-muted/50 overflow-hidden">
                                  <motion.div
                                    initial={{ width: 0 }} animate={{ width: `${goal.progress}%` }}
                                    transition={{ duration: 1, ease: 'easeOut', delay: 0.5 }}
                                    className="h-full rounded-full bg-gradient-to-r from-teal-500 to-emerald-400"
                                  />
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </PlanGate>
                    </motion.div>
                  )}

                  {runningTimer && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
                      className="rounded-2xl border border-teal-500/30 bg-gradient-to-br from-teal-500/10 to-emerald-500/5 p-5"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-teal-500/20 flex items-center justify-center">
                            <Timer className="w-4 h-4 text-teal-400 animate-pulse" />
                          </div>
                          <div>
                            <p className="text-[10px] text-teal-400/70 uppercase tracking-wider">Timer attivo</p>
                            <p className="text-xs font-medium">{runningTimer.taskTitle}</p>
                          </div>
                        </div>
                        <p className="text-lg font-bold tabular-nums text-teal-300">{formatElapsed(elapsedSeconds)}</p>
                      </div>
                      <Button variant="destructive" size="sm" className="w-full mt-3 h-7 text-xs rounded-full gap-1" onClick={handleStopTimer}>
                        <StopCircle className="w-3 h-3" /> Ferma timer
                      </Button>
                    </motion.div>
                  )}

                  {(timeSummary.today > 0 || timeSummary.week > 0) && profile && (
                    <motion.div
                      initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.45 }}
                    >
                      <PlanGate feature="timeTracking" plan={profile.plan}>
                        <div className="rounded-2xl border border-border/50 bg-card/30 p-5">
                          <h3 className="text-sm font-semibold flex items-center gap-2 mb-4">
                            <Timer className="w-4 h-4 text-teal-400" />
                            Tempo
                          </h3>
                          <div className="grid grid-cols-2 gap-3">
                            <div className="text-center p-3 rounded-xl bg-muted/30">
                              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Oggi</p>
                              <p className="text-xl font-bold text-teal-300">{timeSummary.today}h</p>
                            </div>
                            <div className="text-center p-3 rounded-xl bg-muted/30">
                              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Settimana</p>
                              <p className="text-xl font-bold text-teal-300">{timeSummary.week}h</p>
                            </div>
                          </div>
                        </div>
                      </PlanGate>
                    </motion.div>
                  )}

                  <motion.div
                    initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}
                    className="rounded-2xl border border-border/50 bg-card/30 p-5"
                  >
                    <h3 className="text-sm font-semibold flex items-center gap-2 mb-3">
                      <Sparkles className="w-4 h-4 text-amber-400" />
                      Azioni rapide
                    </h3>
                    <div className="space-y-2">
                      <Button size="sm" variant="outline" className="w-full justify-start text-xs h-8 rounded-lg gap-2" onClick={() => setCreateBoardOpen(true)}>
                        <Plus className="w-3 h-3 text-teal-400" /> Nuova board
                      </Button>
                      <Button size="sm" variant="outline" className="w-full justify-start text-xs h-8 rounded-lg gap-2" onClick={() => setInviteMemberOpen(true)} disabled={!userCanInvite}>
                        <Users className="w-3 h-3 text-teal-400" /> Invita membro
                      </Button>
                      <Button size="sm" variant="outline" className="w-full justify-start text-xs h-8 rounded-lg gap-2" onClick={() => router.push('/templates')}>
                        <Puzzle className="w-3 h-3 text-teal-400" /> Esplora template
                      </Button>
                    </div>
                  </motion.div>

                </div>
              </div>

              <motion.div
                initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}
                id="team" className="space-y-6"
              >
                <WorkspaceTeamPanel
                  workspace={selectedWorkspace}
                  currentUserId={profile!.id}
                  plan={profile!.plan}
                  onInvite={() => setInviteMemberOpen(true)}
                  onRefresh={loadData}
                  onWorkspaceDeleted={handleWorkspaceLeftOrDeleted}
                />
                <WorkspaceAuditPanel workspaceId={selectedWorkspace.id} plan={profile!.plan} />
                <WorkspaceWebhooksPanel workspaceId={selectedWorkspace.id} plan={profile!.plan} />
                <WorkspaceCustomFieldsPanel workspaceId={selectedWorkspace.id} plan={profile!.plan} />
                <WorkspaceActivityFeed workspaceId={selectedWorkspace.id} plan={profile!.plan} />
              </motion.div>

            </motion.div>
          )}
        </AnimatePresence>
      </main>

      <Dialog open={createWorkspaceOpen} onOpenChange={setCreateWorkspaceOpen}>
        <DialogContent className="w-[calc(100vw-2rem)] max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Layers className="w-4 h-4 text-teal-400" /> Crea Workspace</DialogTitle>
            <DialogDescription>Un workspace ti permette di organizzare progetti e team.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="workspace-name">Nome del workspace</Label>
              <Input id="workspace-name" placeholder="es. Project Alpha" value={newWorkspaceName} onChange={(e) => setNewWorkspaceName(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateWorkspaceOpen(false)}>Annulla</Button>
            <Button onClick={handleCreateWorkspace} disabled={isSubmitting || !newWorkspaceName.trim()} className="bg-teal-500 hover:bg-teal-400 text-zinc-950">
              {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Crea'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={createBoardOpen} onOpenChange={setCreateBoardOpen}>
        <DialogContent className="w-[calc(100vw-2rem)] max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Layout className="w-4 h-4 text-teal-400" /> Crea Board</DialogTitle>
            <DialogDescription>Una board Kanban per gestire i tuoi task.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="board-template">Template</Label>
              <select id="board-template" className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                value={boardTemplate} onChange={(e) => setBoardTemplate(e.target.value as BoardTemplateId)}
              >
                {Object.entries(BOARD_TEMPLATES).map(([id, t]) => (<option key={id} value={id}>{t.name}</option>))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="board-name">Nome della board</Label>
              <Input id="board-name" placeholder="es. Sprint 1" value={newBoardName} onChange={(e) => setNewBoardName(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateBoardOpen(false)}>Annulla</Button>
            <Button onClick={handleCreateBoard} disabled={isSubmitting || !newBoardName.trim()} className="bg-teal-500 hover:bg-teal-400 text-zinc-950">
              {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Crea'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!deleteTarget} onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}>
        <DialogContent className="w-[calc(100vw-2rem)] max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Trash2 className="w-4 h-4 text-red-400" /> Elimina workspace</DialogTitle>
            <DialogDescription>
              Sei sicuro di voler eliminare <strong>&quot;{deleteTarget?.name}&quot;</strong>? Questa azione è irreversibile.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>Annulla</Button>
            <Button variant="destructive" onClick={handleDeleteWorkspace} disabled={deleting}>
              {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Elimina'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={inviteMemberOpen} onOpenChange={setInviteMemberOpen}>
        <DialogContent className="w-[calc(100vw-2rem)] max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Users className="w-4 h-4 text-teal-400" /> Invita membro</DialogTitle>
            <DialogDescription>Se ha già un account TaskWave, riceverà una notifica in-app.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="invite-email">Email</Label>
              <Input id="invite-email" type="email" placeholder="collega@azienda.it" value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setInviteMemberOpen(false)}>Annulla</Button>
            <Button onClick={handleInviteMember} disabled={isSubmitting || !inviteEmail.trim()} className="bg-teal-500 hover:bg-teal-400 text-zinc-950">
              {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Invia invito'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
