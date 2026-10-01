'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Users, Sparkles, Layout, Brain, Zap } from 'lucide-react';
import type { PlanTier } from '@/lib/database.types';
import { recommendPlan, planLabel, PLAN_CONFIG } from '@/lib/plans';
import { cn } from '@/lib/utils';

interface PlanRecommenderProps {
  teamSize: number;
  onTeamSizeChange: (size: number) => void;
  highlightedPlan: PlanTier;
  currentPlan?: PlanTier | null;
}

const PRESETS = [
  { label: 'Solo / side project', size: 1, hint: 'Free' },
  { label: 'Team piccolo', size: 5, hint: 'Pro' },
  { label: 'Team in crescita', size: 12, hint: 'Pro' },
  { label: 'Scale-up', size: 25, hint: 'Business' },
] as const;

const FEATURE_NEEDS = [
  { id: 'views', label: 'Viste multiple', icon: Layout, feature: 'listView' as const, desc: 'Calendario, Lista, Gantt' },
  { id: 'ai', label: 'AI & Automazioni', icon: Brain, feature: 'aiAssistant' as const, desc: 'Assistant AI, regole automatiche' },
  { id: 'prod', label: 'Produttività avanzata', icon: Zap, feature: 'timeTracking' as const, desc: 'Time tracking, OKR, Git' },
];

function recommendPlanWithFeatures(teamSize: number, selectedFeatures: string[]): PlanTier {
  const base = recommendPlan(teamSize);
  if (base === 'business') return 'business';
  if (selectedFeatures.includes('views') && base === 'free') return 'pro';
  if (selectedFeatures.includes('ai') && base === 'free') return 'pro';
  if (selectedFeatures.includes('prod') && base === 'free') return 'pro';
  if (selectedFeatures.includes('views') && selectedFeatures.includes('ai') && selectedFeatures.includes('prod')) {
    return 'business';
  }
  return base;
}

export function PlanRecommender({
  teamSize,
  onTeamSizeChange,
  highlightedPlan,
  currentPlan,
}: PlanRecommenderProps) {
  const [selectedFeatures, setSelectedFeatures] = useState<string[]>([]);
  const recommended = recommendPlanWithFeatures(teamSize, selectedFeatures);

  const toggleFeature = (id: string) => {
    setSelectedFeatures((prev) =>
      prev.includes(id) ? prev.filter((f) => f !== id) : [...prev, id]
    );
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative overflow-hidden rounded-2xl sm:rounded-3xl border border-border/60 bg-card/50 p-6 sm:p-8 backdrop-blur-sm"
    >
      <div className="absolute -right-16 -top-16 h-48 w-48 rounded-full bg-primary/10 blur-3xl pointer-events-none" />

      <div className="relative">
        <div className="mb-2 flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/15">
            <Users className="h-4 w-4 text-primary" />
          </div>
          <h2 className="text-lg font-semibold">Quale piano ti serve?</h2>
        </div>

        <p className="mb-6 text-sm text-muted-foreground leading-relaxed">
          Indica quante persone lavoreranno insieme e cosa ti serve. Evidenziamo il piano più adatto.
        </p>

        <div className="mb-6 flex flex-wrap gap-2">
          {PRESETS.map((preset) => (
            <button
              key={preset.size}
              type="button"
              onClick={() => onTeamSizeChange(preset.size)}
              className={cn(
                'rounded-full border px-3 py-1.5 text-xs font-medium transition-colors',
                teamSize === preset.size
                  ? 'border-primary bg-primary/10 text-primary'
                  : 'border-border bg-background/50 text-muted-foreground hover:border-primary/30 hover:text-foreground'
              )}
            >
              {preset.label}
            </button>
          ))}
        </div>

        <div className="space-y-4 rounded-xl border border-border/60 bg-muted/30 p-4 sm:p-5">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Membri nel workspace</span>
            <span className="font-display text-3xl font-bold tabular-nums text-primary">{teamSize}</span>
          </div>
          <input
            type="range"
            min={1}
            max={30}
            value={teamSize}
            onChange={(e) => onTeamSizeChange(Number(e.target.value))}
            aria-label="Dimensione team"
            className="h-2 w-full cursor-pointer appearance-none rounded-full bg-border accent-primary"
          />
          <div className="flex justify-between text-[11px] uppercase tracking-wider text-muted-foreground">
            <span>1</span>
            <span>15</span>
            <span>30+</span>
          </div>
        </div>

        <div className="mt-5 space-y-2">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            Cosa ti serve?
          </p>
          {FEATURE_NEEDS.map((item) => {
            const active = selectedFeatures.includes(item.id);
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => toggleFeature(item.id)}
                className={cn(
                  'w-full flex items-center gap-3 rounded-xl border px-3 py-2.5 text-left transition-colors',
                  active
                    ? 'border-primary/40 bg-primary/10'
                    : 'border-border/40 bg-background/50 hover:border-primary/20'
                )}
              >
                <item.icon className={cn('h-4 w-4 shrink-0', active ? 'text-primary' : 'text-muted-foreground')} />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium">{item.label}</p>
                  <p className="text-[10px] text-muted-foreground">{item.desc}</p>
                </div>
                <div
                  className={cn(
                    'h-4 w-4 rounded border flex items-center justify-center shrink-0',
                    active ? 'border-primary bg-primary' : 'border-border'
                  )}
                >
                  {active && (
                    <svg className="h-3 w-3 text-primary-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </div>
              </button>
            );
          })}
        </div>

        <motion.div
          key={recommended}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-6 flex items-start gap-3 rounded-xl border border-primary/25 bg-primary/5 p-4"
        >
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/15">
            <Sparkles className="h-5 w-5 text-primary" />
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-primary/80">Consigliato</p>
            <p className="font-semibold text-lg">
              {planLabel(recommended)}{' '}
              <span className="text-sm font-normal text-muted-foreground">
                — {PLAN_CONFIG[recommended].price}/mese
              </span>
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {PLAN_CONFIG[recommended].description}
            </p>
          </div>
        </motion.div>

        {currentPlan && (
          <p className="mt-4 text-center text-xs text-muted-foreground sm:text-left">
            Il tuo piano: <strong className="text-foreground">{planLabel(currentPlan)}</strong>
            {highlightedPlan !== currentPlan && (
              <> · In evidenza: <strong className="text-foreground">{planLabel(highlightedPlan)}</strong></>
            )}
          </p>
        )}
      </div>
    </motion.div>
  );
}

export function getHighlightedPlan(teamSize: number): PlanTier {
  return recommendPlan(teamSize);
}
