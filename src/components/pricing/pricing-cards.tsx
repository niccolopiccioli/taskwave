'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Check, Loader2, Sparkles, ArrowRight } from 'lucide-react';
import type { PlanTier } from '@/lib/database.types';
import { PLAN_CONFIG, PLAN_ORDER, planLabel } from '@/lib/plans';
import { cn } from '@/lib/utils';

interface PricingCardsProps {
  highlightedPlan: PlanTier;
  currentPlan?: PlanTier | null;
  loadingPlan: string | null;
  onSelectPlan: (plan: PlanTier) => void;
}

const TIER_ACCENT: Record<PlanTier, string> = {
  free: 'border-border/60 bg-card/40',
  pro: 'border-primary/40 bg-gradient-to-b from-primary/[0.08] to-card/80 shadow-xl shadow-primary/10',
  business: 'border-amber-500/30 bg-gradient-to-b from-amber-500/[0.06] to-card/60',
};

const HIGHLIGHT_FEATURES = 6;

export function PricingCards({
  highlightedPlan,
  currentPlan,
  loadingPlan,
  onSelectPlan,
}: PricingCardsProps) {
  return (
    <div className="grid gap-6 lg:grid-cols-3 lg:items-stretch lg:gap-5 xl:gap-8">
      {PLAN_ORDER.map((tier, index) => {
        const config = PLAN_CONFIG[tier];
        const isPopular = tier === 'pro';
        const isHighlighted = tier === highlightedPlan;
        const isCurrent = currentPlan === tier;
        const visibleFeatures = config.marketingFeatures.slice(0, HIGHLIGHT_FEATURES);
        const moreCount = config.marketingFeatures.length - visibleFeatures.length;

        return (
          <motion.article
            key={tier}
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.08, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
            className={cn(
              'relative flex flex-col rounded-2xl sm:rounded-3xl border p-6 sm:p-8 transition-all duration-300',
              TIER_ACCENT[tier],
              isPopular && 'lg:-mt-4 lg:mb-4 lg:z-10 lg:scale-[1.03]',
              isHighlighted && !isPopular && 'ring-1 ring-primary/30',
              isCurrent && 'ring-2 ring-primary/50'
            )}
          >
            <div className="flex flex-wrap items-center gap-2 mb-6">
              {isPopular && (
                <span className="inline-flex items-center gap-1 rounded-full bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground">
                  <Sparkles className="h-3 w-3" />
                  Più scelto
                </span>
              )}
              {isCurrent && (
                <span className="rounded-full border border-border bg-muted px-2.5 py-1 text-xs font-medium">
                  Piano attuale
                </span>
              )}
              {isHighlighted && !isCurrent && tier !== 'free' && (
                <span className="rounded-full border border-primary/30 bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary">
                  Consigliato per il tuo team
                </span>
              )}
            </div>

            <header className="mb-6">
              <h3 className="text-xl font-display font-bold">{planLabel(tier)}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{config.description}</p>
              <div className="mt-5 flex items-baseline gap-1.5">
                <span className="text-4xl sm:text-5xl font-display font-bold tracking-tight">
                  {config.price}
                </span>
                <span className="text-muted-foreground text-sm">/mese</span>
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                {tier === 'free'
                  ? 'Per sempre, senza carta'
                  : 'Fatturazione mensile · cancella quando vuoi'}
              </p>
            </header>

            <ul className="mb-8 flex-1 space-y-3">
              {visibleFeatures.map((feature) => (
                <li key={feature} className="flex items-start gap-2.5 text-sm">
                  <Check
                    className={cn(
                      'mt-0.5 h-4 w-4 shrink-0',
                      tier === 'business' ? 'text-amber-500' : 'text-primary'
                    )}
                  />
                  <span>{feature}</span>
                </li>
              ))}
              {moreCount > 0 && (
                <li className="pl-6 text-xs text-muted-foreground">
                  + altri {moreCount} nel confronto completo
                </li>
              )}
            </ul>

            <Button
              size="lg"
              className={cn(
                'w-full gap-2 rounded-full font-semibold',
                (isPopular || isHighlighted) &&
                  tier !== 'free' &&
                  'bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg shadow-primary/20'
              )}
              variant={tier === 'free' ? 'outline' : 'default'}
              onClick={() => onSelectPlan(tier)}
              disabled={loadingPlan === tier || isCurrent}
            >
              {loadingPlan === tier ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Reindirizzamento...
                </>
              ) : isCurrent ? (
                'Piano attivo'
              ) : tier === 'free' ? (
                'Inizia gratis'
              ) : currentPlan && PLAN_ORDER.indexOf(tier) > PLAN_ORDER.indexOf(currentPlan) ? (
                <>
                  <Sparkles className="h-4 w-4" />
                  Passa a {planLabel(tier)}
                </>
              ) : (
                <>
                  Abbonati a {planLabel(tier)}
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </Button>
          </motion.article>
        );
      })}
    </div>
  );
}

export function UpgradeCtaBanner({ plan }: { plan: PlanTier }) {
  if (plan !== 'free') return null;

  return (
    <div className="flex flex-col items-center justify-between gap-3 rounded-2xl border border-primary/20 bg-primary/5 p-4 sm:flex-row">
      <p className="text-sm text-center sm:text-left">
        Stai usando il piano <strong>Gratuito</strong>. Sblocca inviti, analytics e molto altro con Pro.
      </p>
      <Button asChild size="sm" className="shrink-0 rounded-full">
        <Link href="/pricing">Confronta i piani</Link>
      </Button>
    </div>
  );
}
