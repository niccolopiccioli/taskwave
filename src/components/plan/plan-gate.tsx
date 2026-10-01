'use client';

import Link from 'next/link';
import { Lock, Sparkles } from 'lucide-react';
import type { PlanTier } from '@/lib/database.types';
import type { PlanFeature } from '@/lib/plans';
import { hasFeature, nextPlan, planLabel } from '@/lib/plans';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface PlanGateProps {
  feature: PlanFeature;
  plan: PlanTier;
  children: React.ReactNode;
  fallback?: React.ReactNode;
  className?: string;
}

export function PlanGate({ feature, plan, children, fallback, className }: PlanGateProps) {
  if (hasFeature(plan, feature)) {
    return <>{children}</>;
  }

  if (fallback) return <>{fallback}</>;

  return (
    <UpgradeBlur
      feature={featureLabel(feature)}
      requiredPlan={nextPlan(plan) || 'pro'}
      className={className}
    />
  );
}

function featureLabel(feature: PlanFeature): string {
  const labels: Record<PlanFeature, string> = {
    customColumns: 'Colonne personalizzate',
    taskDueDates: 'Scadenze task',
    taskComments: 'Commenti',
    emailInvites: 'Inviti al team',
    advancedAnalytics: 'Analytics avanzate',
    csvExport: 'Export CSV',
    privateWorkspace: 'Workspace privato',
    auditLog: 'Audit log',
    apiKeys: 'API keys',
    guestLinks: 'Guest link',
    taskAttachments: 'Allegati',
    workspaceAccent: 'Accent workspace',
    boardBranding: 'Branding',
    globalSearch: 'Ricerca globale',
    aiAssistant: 'AI Assistant',
    calendarView: 'Vista calendario',
    ganttView: 'Vista Gantt',
    listView: 'Vista lista',
    taskDependencies: 'Dipendenze task',
    recurringTasks: 'Task ricorrenti',
    automationRules: 'Automazioni',
    timeTracking: 'Time tracking',
    bulkOperations: 'Operazioni in massa',
    goals: 'OKR & Goals',
    gitIntegration: 'Integrazione Git',
    templatesMarketplace: 'Template marketplace',
    savedFilters: 'Filtri salvati',
    labels: 'Label',
    taskChecklists: 'Checklist',
    taskTags: 'Tag',
    taskReminders: 'Promemoria',
  };
  return labels[feature];
}

interface UpgradeBlurProps {
  feature: string;
  requiredPlan?: PlanTier;
  className?: string;
  compact?: boolean;
}

export function UpgradeBlur({
  feature,
  requiredPlan = 'pro',
  className,
  compact = false,
}: UpgradeBlurProps) {
  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-xl border border-primary/20',
        compact ? 'p-4' : 'p-6 min-h-[120px]',
        className
      )}
    >
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-muted/30 to-amber-500/5 backdrop-blur-[2px]" />
      <div className="relative flex flex-col items-center justify-center text-center gap-3 py-2">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/15 text-primary">
          <Lock className="h-5 w-5" />
        </div>
        <div>
          <p className="text-sm font-semibold">{feature}</p>
          <p className="text-xs text-muted-foreground mt-1">
            Disponibile con il piano {planLabel(requiredPlan)}
          </p>
        </div>
        <Button asChild size="sm" className="rounded-full gap-1.5">
          <Link href="/pricing">
            <Sparkles className="h-3.5 w-3.5" />
            Passa a {planLabel(requiredPlan)}
          </Link>
        </Button>
      </div>
    </div>
  );
}

export function requireFeature(plan: PlanTier, feature: PlanFeature): boolean {
  return hasFeature(plan, feature);
}
