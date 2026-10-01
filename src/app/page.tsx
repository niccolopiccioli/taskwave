'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ArrowRight, Zap, GitBranch, Bell, FileCode, Layers } from 'lucide-react';
import { SiteHeader } from '@/components/layout/site-header';
import { SiteFooter } from '@/components/layout/site-footer';
import { useT } from '@/components/providers/i18n-provider';

const featureIcons = [Zap, GitBranch, Bell, FileCode, Layers];

export default function LandingPage() {
  const t = useT();
  const boardCols = [t.landing.colTodo, t.landing.colProgress, t.landing.colDone];

  return (
    <div className="min-h-screen bg-background noise-bg">
      <SiteHeader />

      <div className="absolute inset-0 bg-gradient-to-br from-primary/8 via-transparent to-accent/5 pointer-events-none" />

      <section className="pt-24 sm:pt-32 pb-16 sm:pb-20 px-4 sm:px-6 relative">
        <div className="container mx-auto max-w-5xl text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-display font-bold text-balance mb-4 sm:mb-6 px-2">
              {t.landing.heroTitle}
            </h1>

            <p className="text-base sm:text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-6 sm:mb-8 px-2">
              {t.landing.heroSubtitle}
            </p>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-3 sm:gap-4 max-w-md sm:max-w-none mx-auto">
              <Link href="/register" className="w-full sm:w-auto">
                <Button size="lg" className="w-full sm:w-auto gap-2 bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg shadow-primary/25 rounded-full">
                  {t.landing.ctaPrimary}
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </Link>
              <Link href="/features" className="w-full sm:w-auto">
                <Button variant="outline" size="lg" className="w-full sm:w-auto border-border rounded-full px-8">
                  {t.landing.ctaSecondary}
                </Button>
              </Link>
            </div>

            <p className="mt-4 text-sm text-muted-foreground">
              {t.landing.socialProof}
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="mt-10 sm:mt-16 relative px-2 sm:px-0"
          >
            <div className="rounded-xl border border-border/60 bg-card/50 shadow-2xl shadow-primary/5 overflow-hidden glow-teal backdrop-blur">
              <div className="h-8 bg-muted border-b border-border/60 flex items-center gap-2 px-4">
                <div className="w-3 h-3 rounded-full bg-red-500/80" />
                <div className="w-3 h-3 rounded-full bg-amber-500/80" />
                <div className="w-3 h-3 rounded-full bg-emerald-500/80" />
              </div>
              <div className="p-4 sm:p-6 overflow-x-auto">
                <div className="flex gap-3 sm:gap-4 min-w-[280px]">
                  {boardCols.map((col, i) => (
                    <div key={col} className="flex-1 min-w-[80px] space-y-2 sm:space-y-3">
                      <div className="text-sm font-medium text-muted-foreground mb-2">{col}</div>
                      <div className={`rounded-lg p-3 space-y-2 border ${
                        i === 1 ? 'bg-primary/10 border-primary/20' :
                        i === 2 ? 'bg-emerald-500/10 border-emerald-500/20 dark:bg-emerald-500/10' :
                        'bg-muted/80 border-border/40'
                      }`}>
                        <div className={`h-2 w-3/4 rounded ${
                          i === 0 ? 'bg-muted-foreground/30' :
                          i === 1 ? 'bg-primary/40' : 'bg-emerald-500/40'
                        }`} />
                        <div className={`h-2 w-1/2 rounded ${
                          i === 0 ? 'bg-muted-foreground/30' :
                          i === 1 ? 'bg-primary/40' : 'bg-emerald-500/40'
                        }`} />
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
          <div className="text-center mb-12 sm:mb-16">
            <h2 className="text-3xl md:text-4xl font-display font-bold mb-4">
              {t.landing.featuresTitle}
            </h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto mb-8">
              {t.landing.featuresSubtitle}
            </p>
            <Link href="/features">
              <Button variant="outline" className="rounded-full border-border">
                {t.landing.exploreFeatures}
              </Button>
            </Link>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {t.landing.features.map((feature, index) => {
              const Icon = featureIcons[index] ?? Zap;
              return (
                <motion.div
                  key={feature.title}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: index * 0.1 }}
                  viewport={{ once: true }}
                  className="rounded-xl p-6 border border-border/60 bg-card/30 hover:border-primary/30 hover:bg-card/50 transition-all"
                >
                  <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                    <Icon className="w-6 h-6 text-primary" />
                  </div>
                  <h3 className="text-lg font-semibold mb-2">{feature.title}</h3>
                  <p className="text-muted-foreground text-sm mb-3">{feature.description}</p>
                  <p className="text-xs text-primary font-medium">{feature.benefit}</p>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      <section id="testimonials" className="py-16 sm:py-20 px-4 sm:px-6 relative">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-12 sm:mb-16">
            <h2 className="text-3xl md:text-4xl font-display font-bold mb-4">
              {t.landing.testimonialsTitle}
            </h2>
            <p className="text-muted-foreground text-lg">
              {t.landing.testimonialsSubtitle}
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {t.landing.testimonials.map((testimonial, index) => (
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
                  <div className="w-10 h-10 rounded-full bg-primary/15 flex items-center justify-center ring-1 ring-primary/30">
                    <span className="text-primary font-semibold text-sm">
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
