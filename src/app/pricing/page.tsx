'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, Sparkles } from 'lucide-react';
import { SiteHeader } from '@/components/layout/site-header';
import { SiteFooter } from '@/components/layout/site-footer';
import { PlanRecommender, getHighlightedPlan } from '@/components/pricing/plan-recommender';
import { PricingCards } from '@/components/pricing/pricing-cards';
import { PlanComparisonMatrix } from '@/components/pricing/plan-comparison-matrix';
import { ContactSheet } from '@/components/layout/contact-sheet';
import { AppleHero, ScrollReveal } from '@/components/marketing/apple-sections';
import { createClient } from '@/lib/supabase/client';
import type { PlanTier } from '@/lib/database.types';
import { nextPlan, planLabel } from '@/lib/plans';

const faqs = [
  {
    q: 'Posso restare sul piano gratuito per sempre?',
    a: 'Sì. Il piano Free non ha scadenza: 3 board per workspace, Kanban completo, realtime e notifiche in-app. Upgrade solo quando ti serve di più.',
  },
  {
    q: 'Cosa cambia passando a Pro?',
    a: 'Inviti email, scadenze task, commenti, allegati, analytics workspace, export CSV e colonne personalizzate. Ideale per team fino a ~15 persone.',
  },
  {
    q: 'Business è per chi?',
    a: 'Team che vogliono API keys, webhook, audit log, custom fields, SSO e limiti generosi. Pensato per integrazioni e compliance.',
  },
  {
    q: 'Posso cancellare in qualsiasi momento?',
    a: 'Assolutamente. Dal portale Stripe gestisci abbonamento e fatture. Nessuna penale, nessuna chiamata commerciale.',
  },
];

export default function PricingPage() {
  const router = useRouter();
  const supabase = createClient();
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);
  const [teamSize, setTeamSize] = useState(5);
  const [currentPlan, setCurrentPlan] = useState<PlanTier | null>(null);
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const highlightedPlan = getHighlightedPlan(teamSize);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return;
      supabase
        .from('profiles')
        .select('plan')
        .eq('id', user.id)
        .single()
        .then(({ data }) => {
          if (data?.plan) setCurrentPlan(data.plan);
        });
    });
  }, [supabase]);

  const handleCheckout = async (plan: 'pro' | 'business') => {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      router.push(`/register?plan=${plan}`);
      return;
    }

    setLoadingPlan(plan);
    try {
      const response = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error);

      window.location.href = data.url;
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Errore checkout');
      setLoadingPlan(null);
    }
  };

  const handlePlanAction = (tier: PlanTier) => {
    if (tier === 'free') {
      router.push('/register');
      return;
    }
    if (currentPlan === tier) return;
    handleCheckout(tier);
  };

  const upgradeTarget = currentPlan ? nextPlan(currentPlan) : null;

  return (
    <div className="min-h-screen bg-background noise-bg">
      <SiteHeader activePath="/pricing" />

      <AppleHero
        eyebrow="Prezzi"
        title={
          <>
            Semplice.
            <br />
            <span className="bg-gradient-to-r from-teal-300 to-emerald-400 bg-clip-text text-transparent">
              Trasparente.
            </span>
          </>
        }
        subtitle="Inizia gratis. Scala quando il team cresce. Ogni piano sblocca funzioni reali — niente paywall su ciò che serve per lavorare."
      >
        {currentPlan && upgradeTarget && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="mt-8 inline-flex items-center gap-2 rounded-full border border-teal-500/20 bg-teal-500/10 px-4 py-2 text-sm text-teal-300"
          >
            <Sparkles className="h-4 w-4" />
            Sei su {planLabel(currentPlan)} — prossimo step: {planLabel(upgradeTarget)}
          </motion.p>
        )}
      </AppleHero>

      <section className="pb-20 px-4 sm:px-6 relative">
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
          className="container mx-auto max-w-6xl"
        >
          <div className="rounded-[2rem] border border-white/[0.08] bg-zinc-950/60 backdrop-blur-xl p-6 sm:p-10 shadow-2xl shadow-black/40">
            <div className="grid lg:grid-cols-5 gap-10">
              <div className="lg:col-span-2">
                <PlanRecommender
                  teamSize={teamSize}
                  onTeamSizeChange={setTeamSize}
                  highlightedPlan={highlightedPlan}
                  currentPlan={currentPlan}
                />
              </div>
              <div className="lg:col-span-3">
                <PricingCards
                  highlightedPlan={highlightedPlan}
                  currentPlan={currentPlan}
                  loadingPlan={loadingPlan}
                  onSelectPlan={handlePlanAction}
                />
              </div>
            </div>
          </div>
          <p className="text-center text-xs text-muted-foreground mt-6">
            Prezzi in EUR · IVA esclusa · Stripe test mode — carta{' '}
            <code className="bg-white/5 px-1.5 py-0.5 rounded">4242 4242 4242 4242</code>
          </p>
        </motion.div>
      </section>

      <section className="py-24 border-t border-white/[0.06]">
        <ScrollReveal className="container mx-auto px-4 sm:px-6 max-w-5xl">
          <h2 className="text-3xl sm:text-4xl font-display font-bold text-center mb-4">
            Confronto completo
          </h2>
          <p className="text-center text-muted-foreground mb-12 max-w-xl mx-auto">
            Ogni dettaglio, una riga. Nessuna sorpresa al checkout.
          </p>
          <div className="rounded-3xl border border-white/[0.08] overflow-hidden bg-zinc-950/50">
            <PlanComparisonMatrix />
          </div>
        </ScrollReveal>
      </section>

      <section className="py-24 sm:py-32 border-t border-white/[0.06]">
        <div className="container mx-auto px-4 sm:px-6 max-w-2xl">
          <ScrollReveal className="text-center mb-12">
            <h2 className="text-3xl font-display font-bold">Domande frequenti</h2>
          </ScrollReveal>
          <div className="space-y-3">
            {faqs.map((faq, i) => (
              <ScrollReveal key={faq.q} delay={i * 0.05}>
                <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] overflow-hidden">
                  <button
                    type="button"
                    onClick={() => setOpenFaq(openFaq === i ? null : i)}
                    className="w-full flex items-center justify-between gap-4 px-6 py-5 text-left hover:bg-white/[0.02] transition-colors"
                  >
                    <span className="font-medium">{faq.q}</span>
                    <motion.span animate={{ rotate: openFaq === i ? 180 : 0 }} transition={{ duration: 0.3 }}>
                      <ChevronDown className="h-5 w-5 text-muted-foreground shrink-0" />
                    </motion.span>
                  </button>
                  <AnimatePresence initial={false}>
                    {openFaq === i && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                        className="overflow-hidden"
                      >
                        <p className="px-6 pb-5 text-muted-foreground text-sm leading-relaxed">{faq.a}</p>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      <section className="py-32 border-t border-white/[0.06]">
        <ScrollReveal className="container mx-auto px-4 text-center">
          <h2 className="text-2xl sm:text-3xl font-display font-bold mb-4">Hai bisogno di aiuto per scegliere?</h2>
          <p className="text-muted-foreground mb-8">Scrivici — ti aiutiamo a capire quale piano fa per te.</p>
          <ContactSheet
            triggerLabel="Contattaci"
            triggerClassName="inline-flex items-center rounded-full bg-white text-zinc-950 font-semibold px-8 py-3 hover:bg-white/90 transition-colors"
          />
        </ScrollReveal>
      </section>

      <SiteFooter />
    </div>
  );
}
