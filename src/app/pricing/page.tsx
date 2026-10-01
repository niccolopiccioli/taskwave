'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronDown,
  Sparkles,
  Shield,
  CreditCard,
  RotateCcw,
  Zap,
  Users,
  Building2,
  Layout,
  Brain,
  Clock,
} from 'lucide-react';
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

const trustItems = [
  { icon: RotateCcw, label: 'Cancella quando vuoi', detail: 'Nessuna penale' },
  { icon: CreditCard, label: 'Pagamenti Stripe', detail: 'Sicuri e tracciabili' },
  { icon: Shield, label: 'Nessun costo nascosto', detail: 'Prezzi chiari in EUR' },
];

const valueProps = [
  {
    icon: Zap,
    title: 'Free generoso',
    description: 'Kanban, realtime e notifiche per sempre — ideal per side project e piccoli team.',
  },
  {
    icon: Users,
    title: 'Pro per team attivi',
    description: 'Inviti, scadenze, commenti e allegati quando inizi a collaborare sul serio.',
  },
  {
    icon: Building2,
    title: 'Business per scale',
    description: 'API, webhook, audit log e SSO quando TaskWave entra nel tuo stack.',
  },
];

const featureCategories = [
  {
    icon: Layout,
    title: 'Viste',
    description: 'Kanban, Calendario, Lista, Gantt — la vista giusta per ogni fase del lavoro.',
    plans: { free: 'Kanban + Calendario', pro: '+ Lista', business: '+ Gantt/Timeline' },
  },
  {
    icon: Brain,
    title: 'AI & Automazione',
    description: 'AI Assistant, ricerca globale, filtri salvati e automazioni per lavorare più veloce.',
    plans: { free: 'AI 5/giorno', pro: 'AI 50/giorno + 3 regole', business: 'AI illimitato + automazioni illimitate' },
  },
  {
    icon: Clock,
    title: 'Produttività',
    description: 'Time tracking, OKR & Goals, GitHub/GitLab, operazioni in massa — tutto per il team.',
    plans: { free: 'Operazioni in massa', pro: 'Time tracking + 3 OKR + 1 repo Git', business: 'OKR illimitati + Git illimitato' },
  },
];

const faqs = [
  {
    q: 'Posso restare sul piano gratuito per sempre?',
    a: 'Sì. Il piano Free non ha scadenza: 3 workspace, 5 membri, 3 board per workspace, Kanban completo, sync in tempo reale e notifiche in-app. Upgrade solo quando ti serve di più.',
  },
  {
    q: 'Cosa cambia passando a Pro?',
    a: 'Workspace e board illimitate, fino a 20 membri, inviti (email o link condiviso), scadenze task, commenti, allegati fino a 25 MB, analytics, export CSV e colonne personalizzate. Ideale per team fino a ~15 persone.',
  },
  {
    q: 'Quando conviene Business?',
    a: 'Quando servono API keys, webhook outbound, audit log, custom fields, guest link read-only, allegati fino a 100 MB, workspace privati e membri illimitati. Pensato per integrazioni e compliance.',
  },
  {
    q: 'Serve un dominio personalizzato per gli inviti?',
    a: 'No. Puoi invitare membri con Copia link anche senza dominio. Le email automatiche richiedono un dominio verificato su Resend — vedi docs/EMAIL_AND_DOMAINS.md.',
  },
  {
    q: 'Posso cambiare o cancellare il piano?',
    a: 'Sì. Dal portale Stripe gestisci abbonamento e fatture. Puoi fare upgrade, downgrade o cancellare in qualsiasi momento senza chiamate commerciali.',
  },
  {
    q: 'C’è un periodo di prova?',
    a: 'Il piano Free è già una prova completa e illimitata. Per Pro e Business paghi solo quando attivi l’abbonamento — nessuna carta richiesta per iniziare gratis.',
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
            Paga solo quando
            <br />
            <span className="bg-gradient-to-r from-teal-300 to-emerald-400 bg-clip-text text-transparent">
              il team cresce.
            </span>
          </>
        }
        subtitle="Inizia gratis con Kanban e realtime. Passa a Pro quando servono inviti e collaborazione avanzata. Business quando TaskWave diventa infrastruttura."
      >
        {currentPlan && upgradeTarget && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="mt-8 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-4 py-2 text-sm text-primary"
          >
            <Sparkles className="h-4 w-4" />
            Sei su {planLabel(currentPlan)} — prossimo step: {planLabel(upgradeTarget)}
          </motion.p>
        )}
      </AppleHero>

      {/* Trust bar */}
      <section className="border-y border-border/60 bg-muted/20">
        <div className="container mx-auto max-w-5xl px-4 sm:px-6 py-8">
          <ul className="grid gap-6 sm:grid-cols-3">
            {trustItems.map(({ icon: Icon, label, detail }, i) => (
              <motion.li
                key={label}
                initial={{ opacity: 0, y: 12 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.08 }}
                className="flex items-center gap-3 text-center sm:text-left sm:justify-center"
              >
                <div className="mx-auto sm:mx-0 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10">
                  <Icon className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-semibold">{label}</p>
                  <p className="text-xs text-muted-foreground">{detail}</p>
                </div>
              </motion.li>
            ))}
          </ul>
        </div>
      </section>

      {/* Value props */}
      <section className="py-16 sm:py-20 px-4 sm:px-6">
        <ScrollReveal className="container mx-auto max-w-5xl">
          <div className="grid gap-6 sm:grid-cols-3">
            {valueProps.map(({ icon: Icon, title, description }, i) => (
              <motion.div
                key={title}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="rounded-2xl border border-border/60 bg-card/40 p-6 text-center sm:text-left"
              >
                <div className="mb-4 inline-flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10">
                  <Icon className="h-5 w-5 text-primary" />
                </div>
                <h3 className="font-semibold mb-2">{title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{description}</p>
              </motion.div>
            ))}
          </div>
        </ScrollReveal>
      </section>

      {/* Feature categories */}
      <section className="py-16 sm:py-20 px-4 sm:px-6 border-t border-border/60">
        <ScrollReveal className="container mx-auto max-w-5xl">
          <div className="text-center mb-10 max-w-xl mx-auto">
            <h2 className="text-2xl sm:text-3xl font-display font-bold mb-3">
              Categoria per categoria
            </h2>
            <p className="text-muted-foreground">
              Ogni piano sblocca funzionalità progressive in tre aree chiave.
            </p>
          </div>
          <div className="grid gap-6 sm:grid-cols-3">
            {featureCategories.map(({ icon: Icon, title, description, plans }, i) => (
              <motion.div
                key={title}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="rounded-2xl border border-border/60 bg-card/40 p-6"
              >
                <div className="mb-4 inline-flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10">
                  <Icon className="h-5 w-5 text-primary" />
                </div>
                <h3 className="font-semibold mb-1">{title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed mb-4">{description}</p>
                <div className="space-y-2 pt-4 border-t border-border/40">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">Free</span>
                    <span className="font-medium">{plans.free}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-primary">Pro</span>
                    <span className="font-medium">{plans.pro}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-amber-500">Business</span>
                    <span className="font-medium">{plans.business}</span>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </ScrollReveal>
      </section>

      {/* Recommender + cards */}
      <section className="pb-16 sm:pb-24 px-4 sm:px-6 relative" id="piani">
        <motion.div
          initial={{ opacity: 0, y: 32 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-10%' }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          className="container mx-auto max-w-6xl"
        >
          <div className="mb-10 text-center max-w-2xl mx-auto">
            <h2 className="text-2xl sm:text-3xl font-display font-bold mb-3">
              Scegli il piano giusto
            </h2>
            <p className="text-muted-foreground">
              Usa il consigliatore o confronta le card — Pro è il più scelto dai team in crescita.
            </p>
          </div>

          <div className="grid gap-10 lg:grid-cols-12 lg:gap-12">
            <div className="lg:col-span-4 lg:sticky lg:top-24 lg:self-start">
              <PlanRecommender
                teamSize={teamSize}
                onTeamSizeChange={setTeamSize}
                highlightedPlan={highlightedPlan}
                currentPlan={currentPlan}
              />
            </div>
            <div className="lg:col-span-8">
              <PricingCards
                highlightedPlan={highlightedPlan}
                currentPlan={currentPlan}
                loadingPlan={loadingPlan}
                onSelectPlan={handlePlanAction}
              />
            </div>
          </div>

          <p className="mt-10 text-center text-xs text-muted-foreground">
            Prezzi in EUR · IVA ove applicabile · Fatturazione mensile tramite Stripe
          </p>
        </motion.div>
      </section>

      {/* Comparison */}
      <section className="py-20 sm:py-28 border-t border-border/60 bg-muted/10">
        <ScrollReveal className="container mx-auto px-4 sm:px-6 max-w-5xl">
          <div className="text-center mb-12 max-w-xl mx-auto">
            <h2 className="text-3xl sm:text-4xl font-display font-bold mb-4">
              Confronto completo
            </h2>
            <p className="text-muted-foreground">
              Ogni limite e funzione, piano per piano. Nessuna sorpresa al checkout.
            </p>
          </div>
          <PlanComparisonMatrix />
        </ScrollReveal>
      </section>

      {/* FAQ */}
      <section className="py-20 sm:py-28 border-t border-border/60">
        <div className="container mx-auto px-4 sm:px-6 max-w-2xl">
          <ScrollReveal className="text-center mb-12">
            <h2 className="text-3xl font-display font-bold">Domande frequenti</h2>
            <p className="mt-3 text-muted-foreground text-sm">
              Non trovi la risposta?{' '}
              <ContactSheet
                triggerLabel="Scrivici"
                triggerClassName="text-primary font-medium hover:underline inline"
              />
            </p>
          </ScrollReveal>
          <div className="space-y-3">
            {faqs.map((faq, i) => (
              <ScrollReveal key={faq.q} delay={i * 0.04}>
                <div className="overflow-hidden rounded-2xl border border-border/60 bg-card/30">
                  <button
                    type="button"
                    onClick={() => setOpenFaq(openFaq === i ? null : i)}
                    className="flex w-full items-center justify-between gap-4 px-5 sm:px-6 py-4 sm:py-5 text-left transition-colors hover:bg-muted/30"
                    aria-expanded={openFaq === i}
                  >
                    <span className="font-medium text-sm sm:text-base pr-4">{faq.q}</span>
                    <motion.span
                      animate={{ rotate: openFaq === i ? 180 : 0 }}
                      transition={{ duration: 0.25 }}
                      className="shrink-0"
                    >
                      <ChevronDown className="h-5 w-5 text-muted-foreground" />
                    </motion.span>
                  </button>
                  <AnimatePresence initial={false}>
                    {openFaq === i && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                        className="overflow-hidden"
                      >
                        <p className="px-5 sm:px-6 pb-5 text-sm text-muted-foreground leading-relaxed">
                          {faq.a}
                        </p>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-24 sm:py-32 border-t border-border/60">
        <ScrollReveal className="container mx-auto px-4 text-center max-w-xl">
          <h2 className="text-2xl sm:text-3xl font-display font-bold mb-4">
            Pronto a iniziare?
          </h2>
          <p className="text-muted-foreground mb-8">
            Crea un account gratis in meno di un minuto. Nessuna carta richiesta.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <ContactSheet
              triggerLabel="Hai domande sui piani"
              triggerClassName="inline-flex items-center justify-center rounded-full border border-border bg-background font-semibold px-8 py-3 hover:bg-muted transition-colors"
            />
            <motion.button
              type="button"
              onClick={() => router.push('/register')}
              className="inline-flex items-center justify-center rounded-full bg-primary text-primary-foreground font-semibold px-8 py-3 hover:bg-primary/90 transition-colors shadow-lg shadow-primary/20"
            >
              Inizia gratis
            </motion.button>
          </div>
        </ScrollReveal>
      </section>

      <SiteFooter />
    </div>
  );
}
