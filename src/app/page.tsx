'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ArrowRight, Zap, GitBranch, Bell, FileCode, Layers } from 'lucide-react';
import { SiteHeader } from '@/components/layout/site-header';
import { SiteFooter } from '@/components/layout/site-footer';

const features = [
  {
    icon: Zap,
    title: 'Drag-and-drop fluido',
    description: 'Sposta task tra le colonne con un gesto. Zero lag, zero frizione, massima velocità.',
    benefit: 'Risparmi 15 minuti/giorno in operazioni di gestione',
  },
  {
    icon: GitBranch,
    title: 'Sync in tempo reale',
    description: 'Ogni cambiamento appare immediatamente su tutti i dispositivi del team.',
    benefit: 'Zero confusione su stato task',
  },
  {
    icon: Bell,
    title: 'Notifiche smart',
    description: 'Ricevi alert solo per ciò che conta. Personalizza priorità e canali.',
    benefit: 'Non perdi mai una deadline',
  },
  {
    icon: FileCode,
    title: 'API documentata',
    description: 'Integra TaskWave nel tuo stack. Webhook, REST API, CLI ready.',
    benefit: 'Automatizza workflow esistenti',
  },
  {
    icon: Layers,
    title: 'Workspace multipli',
    description: 'Gestisci progetti, team e clienti da un\'unica dashboard centralizzata.',
    benefit: 'Cambio progetto in 1 click',
  },
];

const testimonials = [
  {
    name: 'Marco Rossi',
    role: 'Tech Lead',
    company: 'NexaTech',
    quote: 'Abbiamo ridotto i nostri stand-up meeting di 30 minuti. Tutti sanno sempre cosa fare.',
  },
  {
    name: 'Giulia Conti',
    role: 'PM',
    company: 'Finova',
    quote: 'La differenza con Trello? Notte e giorno. Il team shipping è raddoppiato in 3 mesi.',
  },
  {
    name: 'Alessandro Bianchi',
    role: 'CTO',
    company: 'Cloudify',
    quote: 'Finalmente un tool che non rallenta. L\'interfaccia è minimal, le funzionalità sono massime.',
  },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background noise-bg">
      <SiteHeader />

      <div className="absolute inset-0 bg-gradient-to-br from-teal-500/8 via-transparent to-amber-500/5 pointer-events-none" />

      <section className="pt-24 sm:pt-32 pb-16 sm:pb-20 px-4 sm:px-6 relative">
        <div className="container mx-auto max-w-5xl text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-display font-bold text-balance mb-4 sm:mb-6 px-2">
              Gestisci il tuo team alla velocità del pensiero
            </h1>

            <p className="text-base sm:text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-6 sm:mb-8 px-2">
              TaskWave è il Kanban board che i team di sviluppo scelgono per accelerare le consegne, senza perdere il controllo.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link href="/register">
                <Button size="lg" className="gap-2 bg-teal-500 hover:bg-teal-400 text-zinc-950 shadow-lg shadow-teal-500/25">
                  Inizia gratis
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </Link>
              <Link href="/features">
                <Button variant="outline" size="lg" className="border-border/60 rounded-full px-8">
                  Scopri le funzionalità
                </Button>
              </Link>
            </div>

            <p className="mt-4 text-sm text-muted-foreground">
              Oltre 12.000 developer • 4.9★ su G2
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="mt-10 sm:mt-16 relative px-2 sm:px-0"
          >
            <div className="rounded-xl border border-border/60 bg-card/50 shadow-2xl shadow-teal-500/5 overflow-hidden glow-teal backdrop-blur">
              <div className="h-8 bg-zinc-900 border-b border-border/60 flex items-center gap-2 px-4">
                <div className="w-3 h-3 rounded-full bg-red-500/80" />
                <div className="w-3 h-3 rounded-full bg-amber-500/80" />
                <div className="w-3 h-3 rounded-full bg-emerald-500/80" />
              </div>
              <div className="p-4 sm:p-6 overflow-x-auto">
                <div className="flex gap-3 sm:gap-4 min-w-[280px]">
                  {['Da Fare', 'In Progress', 'Fatto'].map((col, i) => (
                    <div key={col} className="flex-1 min-w-[80px] space-y-2 sm:space-y-3">
                      <div className="text-sm font-medium text-muted-foreground mb-2">{col}</div>
                      <div className={`rounded-lg p-3 space-y-2 border ${
                        i === 1 ? 'bg-teal-500/10 border-teal-500/20' :
                        i === 2 ? 'bg-emerald-500/10 border-emerald-500/20' :
                        'bg-zinc-800/50 border-border/40'
                      }`}>
                        <div className={`h-2 w-3/4 rounded ${i === 0 ? 'bg-zinc-600' : i === 1 ? 'bg-teal-500/40' : 'bg-emerald-500/40'}`} />
                        <div className={`h-2 w-1/2 rounded ${i === 0 ? 'bg-zinc-600' : i === 1 ? 'bg-teal-500/40' : 'bg-emerald-500/40'}`} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      <section id="features" className="py-16 sm:py-20 px-4 sm:px-6 border-t border-border/40 relative">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-display font-bold mb-4">
              Tutto ciò che ti serve per shipping veloce
            </h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto mb-8">
              Funzionalità progettate per team di sviluppo che non vogliono compromessi tra potenza e semplicità.
            </p>
            <Link href="/features">
              <Button variant="outline" className="rounded-full border-white/10">
                Esplora tutte le funzionalità →
              </Button>
            </Link>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {features.map((feature, index) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: index * 0.1 }}
                viewport={{ once: true }}
                className="rounded-xl p-6 border border-border/60 bg-card/30 hover:border-teal-500/30 hover:bg-card/50 transition-all"
              >
                <div className="w-12 h-12 rounded-lg bg-teal-500/10 flex items-center justify-center mb-4">
                  <feature.icon className="w-6 h-6 text-teal-400" />
                </div>
                <h3 className="text-lg font-semibold mb-2">{feature.title}</h3>
                <p className="text-muted-foreground text-sm mb-3">{feature.description}</p>
                <p className="text-xs text-teal-400 font-medium">{feature.benefit}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <section id="testimonials" className="py-16 sm:py-20 px-4 sm:px-6 relative">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-display font-bold mb-4">
              Amato dai team tecnici
            </h2>
            <p className="text-muted-foreground text-lg">
              Migliaia di sviluppatori e PM si fidano di TaskWave ogni giorno.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {testimonials.map((testimonial, index) => (
              <motion.div
                key={testimonial.name}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: index * 0.1 }}
                viewport={{ once: true }}
                className="rounded-xl p-6 border border-border/60 bg-card/30"
              >
                <p className="text-muted-foreground mb-4">&ldquo;{testimonial.quote}&rdquo;</p>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-teal-500/20 flex items-center justify-center ring-1 ring-teal-500/30">
                    <span className="text-teal-400 font-semibold text-sm">
                      {testimonial.name.charAt(0)}
                    </span>
                  </div>
                  <div>
                    <p className="font-semibold text-sm">{testimonial.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {testimonial.role} @ {testimonial.company}
                    </p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}
