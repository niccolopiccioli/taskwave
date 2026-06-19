'use client';

import Link from 'next/link';
import { motion, useScroll, useTransform } from 'framer-motion';
import { useRef } from 'react';
import {
  ArrowRight,
  Code2,
  Globe2,
  Heart,
  Lock,
  Rocket,
  Sparkles,
  Target,
  Users,
  Waves,
} from 'lucide-react';
import { SiteHeader } from '@/components/layout/site-header';
import { SiteFooter } from '@/components/layout/site-footer';
import { AppleHero, ScrollReveal, ScrollStat } from '@/components/marketing/apple-sections';
import { Button } from '@/components/ui/button';
import { BRAND_NAME } from '@/lib/brand';

const timeline = [
  {
    year: '2024',
    title: 'La frustrazione',
    body: 'Dopo anni con tool enterprise lenti e tool consumer troppo semplici, un gruppo di developer milanesi inizia a schizzare su un foglio cosa avrebbe voluto davvero: velocità, chiarezza, zero onboarding da manuale.',
  },
  {
    year: '2025',
    title: 'Il primo commit',
    body: 'Next.js 14, Supabase, TypeScript strict. Niente Django legacy, niente vendor lock-in. Ogni decisione architetturale orientata a shipping settimanale e privacy by design.',
  },
  {
    year: '2026',
    title: 'TaskWave',
    body: 'Rebrand, compliance GDPR operativa, opt-out IP, 2FA, realtime presence. Un prodotto gratuito che non si vergogna di presentarsi a un team enterprise — perché la qualità non dovrebbe costare.',
  },
];

const principles = [
  {
    icon: Target,
    title: 'Focus ossessivo',
    body: 'Non costruiamo CRM, chat o wiki. Costruiamo il modo più veloce per capire cosa fare oggi e farlo insieme. Ogni feature che non serve a questo viene tagliata.',
  },
  {
    icon: Lock,
    title: 'Privacy come prodotto',
    body: 'Non trattiamo la compliance come un checkbox legale. Opt-out IP, export dati, hash con salt, GPC nativo — perché fidarsi del tool con cui lavori ogni giorno è fondamentale.',
  },
  {
    icon: Code2,
    title: 'Ingegneria trasparente',
    body: 'Stack moderno, API documentate, RLS lato database. Crediamo che i team tecnici meritino di capire come funziona ciò che usano — e di integrarlo nel proprio flusso.',
  },
  {
    icon: Heart,
    title: 'Fatto con cura',
    body: 'Animazioni che non disturbano. Tipografia che respira. Micro-interazioni che danno feedback immediato. Il dettaglio non è decorazione — è rispetto per il tempo del team.',
  },
];

const stack = [
  { name: 'Next.js 14', role: 'App Router, edge-ready' },
  { name: 'Supabase', role: 'Postgres + Auth + Realtime' },
  { name: 'Stripe', role: 'Pagamenti quando servono' },
  { name: 'Vercel', role: 'Deploy globale' },
  { name: 'Resend', role: 'Email transazionali' },
];

export default function AboutPage() {
  const manifestoRef = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({ target: manifestoRef, offset: ['start end', 'end start'] });
  const manifestoY = useTransform(scrollYProgress, [0, 1], [40, -40]);

  return (
    <div className="min-h-screen bg-background noise-bg">
      <SiteHeader activePath="/about" />

      <AppleHero
        eyebrow="About"
        title={
          <>
            Non un altro tool.
            <br />
            <span className="bg-gradient-to-r from-white via-white/90 to-white/50 bg-clip-text text-transparent">
              Una filosofia di lavoro.
            </span>
          </>
        }
        subtitle={`${BRAND_NAME} nasce dalla convinzione che i team di sviluppo meritino strumenti che rispettino la loro intelligenza — veloci, onesti, belli.`}
      />

      {/* Manifesto — parallax */}
      <section ref={manifestoRef} className="py-32 sm:py-40 border-t border-white/[0.06] overflow-hidden">
        <motion.div style={{ y: manifestoY }} className="container mx-auto px-4 sm:px-6 max-w-4xl">
          <ScrollReveal>
            <p className="text-xs uppercase tracking-[0.25em] text-teal-400 mb-8 text-center">Manifesto</p>
            <blockquote className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-display font-bold leading-[1.15] text-center text-balance">
              &ldquo;Il project management non deve essere un secondo lavoro. Deve scomparire — lasciando spazio
              solo a ciò che conta:{' '}
              <span className="text-teal-400">consegnare valore</span>.&rdquo;
            </blockquote>
            <p className="mt-12 text-center text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">
              Abbiamo visto troppi team passare più tempo ad aggiornare Jira che a scrivere codice. Troppi stand-up
              dedicati a sincronizzare stati che un board ben fatto renderebbe ovvi. TaskWave è la nostra risposta:
              meno cerimonia, più shipping.
            </p>
          </ScrollReveal>
        </motion.div>
      </section>

      {/* Stats */}
      <section className="py-20 border-y border-white/[0.06] bg-zinc-950/50">
        <div className="container mx-auto px-4 grid grid-cols-2 lg:grid-cols-4 gap-8 max-w-4xl">
          <ScrollStat value="12k+" label="Developer registrati" />
          <ScrollStat value="<50ms" label="Latenza board realtime" />
          <ScrollStat value="100%" label="Opt-out IP rispettato" />
          <ScrollStat value="€0" label="Per iniziare, per sempre" />
        </div>
      </section>

      {/* Timeline */}
      <section className="py-24 sm:py-32">
        <div className="container mx-auto px-4 sm:px-6 max-w-3xl">
          <ScrollReveal className="text-center mb-16">
            <p className="text-xs uppercase tracking-[0.2em] text-teal-400 mb-4">La nostra storia</p>
            <h2 className="text-3xl sm:text-4xl font-display font-bold">Da un&apos;idea a TaskWave</h2>
          </ScrollReveal>
          <div className="relative">
            <div className="absolute left-4 sm:left-1/2 top-0 bottom-0 w-px bg-gradient-to-b from-teal-500/50 via-white/10 to-transparent sm:-translate-x-1/2" />
            {timeline.map((item, i) => (
              <ScrollReveal key={item.year} delay={i * 0.1}>
                <div
                  className={`relative pl-12 sm:pl-0 sm:grid sm:grid-cols-2 sm:gap-12 mb-16 last:mb-0 ${
                    i % 2 === 1 ? 'sm:[direction:rtl] sm:*:[direction:ltr]' : ''
                  }`}
                >
                  <div className={`${i % 2 === 1 ? 'sm:text-right' : ''} sm:py-4`}>
                    <span className="inline-block text-4xl font-display font-bold text-teal-400/80 mb-2">
                      {item.year}
                    </span>
                    <h3 className="text-xl font-semibold mb-2">{item.title}</h3>
                  </div>
                  <div className="sm:py-4">
                    <p className="text-muted-foreground leading-relaxed">{item.body}</p>
                  </div>
                  <div className="absolute left-2.5 sm:left-1/2 top-2 w-3 h-3 rounded-full bg-teal-500 ring-4 ring-teal-500/20 sm:-translate-x-1/2" />
                </div>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      {/* Principles */}
      <section className="py-24 sm:py-32 border-t border-white/[0.06] bg-gradient-to-b from-teal-500/[0.04] to-transparent">
        <div className="container mx-auto px-4 sm:px-6 max-w-6xl">
          <ScrollReveal className="text-center mb-16 max-w-2xl mx-auto">
            <p className="text-xs uppercase tracking-[0.2em] text-teal-400 mb-4">Principi</p>
            <h2 className="text-3xl sm:text-4xl font-display font-bold mb-4">Come decidiamo cosa costruire</h2>
            <p className="text-muted-foreground">
              Ogni feature passa attraverso quattro domande. Se non supera almeno tre, non entra nel prodotto.
            </p>
          </ScrollReveal>
          <div className="grid md:grid-cols-2 gap-6">
            {principles.map((p, i) => (
              <ScrollReveal key={p.title} delay={i * 0.08}>
                <div className="group h-full rounded-3xl border border-white/[0.08] bg-zinc-950/60 p-8 hover:border-teal-500/25 transition-all duration-500">
                  <div className="w-12 h-12 rounded-2xl bg-teal-500/10 flex items-center justify-center mb-6 group-hover:scale-105 transition-transform">
                    <p.icon className="h-6 w-6 text-teal-400" />
                  </div>
                  <h3 className="text-xl font-semibold mb-3">{p.title}</h3>
                  <p className="text-muted-foreground leading-relaxed">{p.body}</p>
                </div>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      {/* Stack */}
      <section className="py-24 sm:py-32 border-t border-white/[0.06]">
        <div className="container mx-auto px-4 sm:px-6 max-w-5xl">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <ScrollReveal>
              <p className="text-xs uppercase tracking-[0.2em] text-teal-400 mb-4">Tecnologia</p>
              <h2 className="text-3xl sm:text-4xl font-display font-bold mb-6">
                Costruito con stack che conosci — e rispetti
              </h2>
              <p className="text-muted-foreground leading-relaxed mb-6">
                Niente black box. TaskWave è un&apos;app Next.js open-architecture: puoi ispezionare le API, esportare
                i tuoi dati, self-hostare in futuro se vorrai. Il backend Django legacy è deprecato — tutto vive in
                Postgres con Row Level Security.
              </p>
              <Link href="/features" className="inline-flex items-center gap-2 text-teal-400 hover:text-teal-300 text-sm font-medium">
                Scopri le funzionalità
                <ArrowRight className="h-4 w-4" />
              </Link>
            </ScrollReveal>
            <ScrollReveal delay={0.15}>
              <div className="rounded-3xl border border-white/[0.08] bg-zinc-900/50 overflow-hidden">
                {stack.map((s, i) => (
                  <div
                    key={s.name}
                    className={`flex items-center justify-between px-6 py-4 ${
                      i !== stack.length - 1 ? 'border-b border-white/[0.06]' : ''
                    }`}
                  >
                    <span className="font-medium">{s.name}</span>
                    <span className="text-sm text-muted-foreground">{s.role}</span>
                  </div>
                ))}
              </div>
            </ScrollReveal>
          </div>
        </div>
      </section>

      {/* Vision */}
      <section className="py-24 sm:py-32 border-t border-white/[0.06]">
        <div className="container mx-auto px-4 sm:px-6 max-w-4xl text-center">
          <ScrollReveal>
            <Waves className="h-10 w-10 text-teal-400 mx-auto mb-6" />
            <h2 className="text-3xl sm:text-4xl font-display font-bold mb-6">Dove stiamo andando</h2>
            <p className="text-lg text-muted-foreground leading-relaxed mb-4">
              TaskWave resterà gratuito per iniziare — sempre. Stiamo costruendo calendar view, automazioni leggere,
              marketplace di template e integrazioni Slack/GitHub senza trasformare il prodotto in un mostro enterprise.
            </p>
            <p className="text-lg text-muted-foreground leading-relaxed">
              La nostra ambizione è semplice: essere lo strumento Kanban che consiglieresti a un amico developer —
              perché lo usi davvero ogni giorno.
            </p>
          </ScrollReveal>
          <ScrollReveal delay={0.2} className="mt-12 flex flex-wrap justify-center gap-6 text-sm text-muted-foreground">
            <span className="inline-flex items-center gap-2">
              <Globe2 className="h-4 w-4 text-teal-400" /> Team in Europa
            </span>
            <span className="inline-flex items-center gap-2">
              <Users className="h-4 w-4 text-teal-400" /> Remote-first
            </span>
            <span className="inline-flex items-center gap-2">
              <Rocket className="h-4 w-4 text-teal-400" /> Ship ogni settimana
            </span>
            <span className="inline-flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-teal-400" /> Gratis per iniziare
            </span>
          </ScrollReveal>
        </div>
      </section>

      {/* CTA */}
      <section className="py-32 border-t border-white/[0.06] relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-teal-500/15 via-transparent to-transparent pointer-events-none" />
        <ScrollReveal className="container mx-auto px-4 text-center relative">
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-display font-bold mb-6 text-balance">
            Unisciti alla wave
          </h2>
          <p className="text-muted-foreground mb-10 max-w-xl mx-auto">
            Crea il tuo workspace in 30 secondi. Nessuna carta di credito. Nessun trucchetto.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <Link href="/register">
              <Button size="lg" className="rounded-full bg-teal-500 hover:bg-teal-400 text-zinc-950 font-semibold px-10 gap-2">
                Inizia gratis
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            <Link href="/pricing">
              <Button size="lg" variant="outline" className="rounded-full border-white/15 px-10">
                Vedi i prezzi
              </Button>
            </Link>
          </div>
        </ScrollReveal>
      </section>

      <SiteFooter />
    </div>
  );
}
