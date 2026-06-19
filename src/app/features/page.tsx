'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  Zap,
  GitBranch,
  Bell,
  Shield,
  Layers,
  Keyboard,
  Users,
  Sparkles,
} from 'lucide-react';
import { SiteHeader } from '@/components/layout/site-header';
import { SiteFooter } from '@/components/layout/site-footer';
import { AppleFeatureBlock, AppleHero, ScrollReveal } from '@/components/marketing/apple-sections';
import { Button } from '@/components/ui/button';

function BoardMock({ variant = 'default' }: { variant?: 'default' | 'realtime' | 'privacy' }) {
  const cols =
    variant === 'realtime'
      ? ['Backlog', 'In corso', 'Review', 'Done']
      : ['Da fare', 'In progress', 'Fatto'];

  return (
    <div className="p-6 sm:p-8">
      <div className="flex gap-3 mb-4">
        {variant === 'realtime' && (
          <span className="text-xs px-2 py-1 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/20">
            3 online
          </span>
        )}
        {variant === 'privacy' && (
          <span className="text-xs px-2 py-1 rounded-full bg-violet-500/15 text-violet-400 border border-violet-500/20">
            IP opt-out attivo
          </span>
        )}
      </div>
      <div className="flex gap-3 overflow-x-auto pb-2">
        {cols.map((col, ci) => (
          <div key={col} className="flex-1 min-w-[100px]">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2">{col}</p>
            <div className="space-y-2">
              {[0, 1].map((i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 8 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ delay: ci * 0.1 + i * 0.05 }}
                  className={`rounded-lg p-3 border ${
                    ci === 1 && variant === 'realtime'
                      ? 'border-teal-500/30 bg-teal-500/10'
                      : 'border-white/10 bg-white/[0.03]'
                  }`}
                >
                  <div className="h-2 w-3/4 rounded bg-white/20 mb-2" />
                  <div className="h-1.5 w-1/2 rounded bg-white/10" />
                </motion.div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function FeaturesPage() {
  return (
    <div className="min-h-screen bg-background noise-bg">
      <SiteHeader activePath="/features" />

      <AppleHero
        eyebrow="Funzionalità"
        title={
          <>
            Progettato per team
            <br />
            <span className="bg-gradient-to-r from-teal-300 via-teal-400 to-emerald-400 bg-clip-text text-transparent">
              che consegnano.
            </span>
          </>
        }
        subtitle="Ogni pixel di TaskWave esiste per una sola ragione: farti passare dall'idea al merge request senza attrito."
      >
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="mt-10 flex flex-wrap justify-center gap-4"
        >
          <Link href="/register">
            <Button size="lg" className="rounded-full bg-teal-500 hover:bg-teal-400 text-zinc-950 font-semibold px-8">
              Prova gratis
            </Button>
          </Link>
          <Link href="/pricing">
            <Button size="lg" variant="outline" className="rounded-full border-white/15 px-8">
              Confronta i piani
            </Button>
          </Link>
        </motion.div>
      </AppleHero>

      <AppleFeatureBlock
        label="Kanban"
        title="Drag. Drop. Done."
        description="Sposta task con un gesto fluido. Colonne personalizzabili, priorità visive, filtri per assignee e scadenze. Niente modali inutili — tutto accade sulla board."
        accent="teal"
        visual={<BoardMock />}
      />

      <AppleFeatureBlock
        label="Realtime"
        title="Il team, sincronizzato."
        description="Supabase Realtime mantiene ogni board allineata al millisecondo. Vedi chi è online, ricevi aggiornamenti live su assegnazioni e commenti senza refresh."
        accent="teal"
        reverse
        visual={<BoardMock variant="realtime" />}
      />

      <AppleFeatureBlock
        label="Notifiche"
        title="Solo ciò che conta."
        description="Inbox in-app per assegnazioni, commenti e spostamenti. Email opzionali via Resend. Tu decidi cosa ricevere — niente rumore."
        accent="amber"
        visual={
          <div className="p-8 space-y-3">
            {['Assegnato a te: Fix auth callback', 'Nuovo commento su API v1', 'Task spostato in Done'].map(
              (n, i) => (
                <motion.div
                  key={n}
                  initial={{ opacity: 0, x: -12 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.1 }}
                  className="flex items-start gap-3 rounded-xl border border-white/10 bg-white/[0.03] p-4"
                >
                  <Bell className="h-4 w-4 text-amber-400 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-sm font-medium">{n}</p>
                    <p className="text-xs text-muted-foreground mt-1">2 min fa</p>
                  </div>
                </motion.div>
              )
            )}
          </div>
        }
      />

      <AppleFeatureBlock
        label="Privacy"
        title="Enterprise-ready. Gratis."
        description="Opt-out IP end-to-end, cookie consent, export GDPR e cancellazione account. Hash IP con salt — mai dati in chiaro. GPC e Do Not Track rispettati di default."
        accent="violet"
        reverse
        visual={<BoardMock variant="privacy" />}
      />

      <section className="py-24 sm:py-32 border-t border-white/[0.06]">
        <div className="container mx-auto px-4 sm:px-6 max-w-6xl">
          <ScrollReveal className="text-center mb-16">
            <p className="text-xs uppercase tracking-[0.2em] text-teal-400 mb-4">E molto altro</p>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-display font-bold text-balance">
              Potenza nascosta in ogni dettaglio
            </h2>
          </ScrollReveal>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { icon: Layers, title: 'Workspace multipli', desc: 'Progetti, clienti, team — tutto organizzato.' },
              { icon: Keyboard, title: 'Command palette', desc: '⌘K per navigare e agire senza mouse.' },
              { icon: Users, title: 'Inviti & ruoli', desc: 'Admin e member con permessi chiari.' },
              { icon: Sparkles, title: 'Template board', desc: 'Scrum, Kanban, bug tracker pronti all\'uso.' },
              { icon: GitBranch, title: 'Timeline', desc: 'Vista cronologica delle attività.' },
              { icon: Shield, title: 'Audit log', desc: 'Traccia ogni azione critica (Business).' },
              { icon: Zap, title: 'Webhook', desc: 'Integra Slack, CI o il tuo stack.' },
              { icon: Bell, title: 'Guest link', desc: 'Condividi board read-only in un click.' },
            ].map((item, i) => (
              <ScrollReveal key={item.title} delay={i * 0.05}>
                <div className="group h-full rounded-2xl border border-white/[0.06] bg-white/[0.02] p-6 hover:border-teal-500/20 hover:bg-teal-500/[0.03] transition-all duration-500">
                  <item.icon className="h-6 w-6 text-teal-400 mb-4 group-hover:scale-110 transition-transform" />
                  <h3 className="font-semibold mb-2">{item.title}</h3>
                  <p className="text-sm text-muted-foreground">{item.desc}</p>
                </div>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      <section className="py-32 border-t border-white/[0.06] relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-t from-teal-500/10 via-transparent to-transparent pointer-events-none" />
        <ScrollReveal className="container mx-auto px-4 text-center max-w-2xl relative">
          <h2 className="text-3xl sm:text-4xl font-display font-bold mb-6">
            Pronto a sentire la differenza?
          </h2>
          <p className="text-muted-foreground mb-8">
            Unisciti ai team che hanno scelto semplicità senza compromessi.
          </p>
          <Link href="/register">
            <Button size="lg" className="rounded-full bg-white text-zinc-950 hover:bg-white/90 font-semibold px-10">
              Inizia gratis — nessuna carta
            </Button>
          </Link>
        </ScrollReveal>
      </section>

      <SiteFooter />
    </div>
  );
}
