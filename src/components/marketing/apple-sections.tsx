'use client';

import { useRef, type ReactNode } from 'react';
import { motion, useInView, useScroll, useTransform } from 'framer-motion';
import { cn } from '@/lib/utils';

export function AppleHero({
  eyebrow,
  title,
  subtitle,
  children,
  className,
}: {
  eyebrow?: string;
  title: ReactNode;
  subtitle?: string;
  children?: ReactNode;
  className?: string;
}) {
  const ref = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end start'] });
  const y = useTransform(scrollYProgress, [0, 1], [0, 120]);
  const opacity = useTransform(scrollYProgress, [0, 0.6], [1, 0]);

  return (
    <section ref={ref} className={cn('relative min-h-[90vh] flex items-center overflow-hidden', className)}>
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[800px] h-[800px] rounded-full bg-teal-500/10 blur-[120px] animate-pulse-slow" />
        <div className="absolute bottom-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
      </div>
      <motion.div style={{ y, opacity }} className="relative container mx-auto px-4 sm:px-6 lg:px-8 py-32 text-center max-w-5xl">
        {eyebrow && (
          <motion.p
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-xs sm:text-sm font-medium uppercase tracking-[0.2em] text-teal-400/90 mb-6"
          >
            {eyebrow}
          </motion.p>
        )}
        <motion.h1
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.1 }}
          className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-display font-bold tracking-tight text-balance leading-[1.05]"
        >
          {title}
        </motion.h1>
        {subtitle && (
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.25 }}
            className="mt-6 text-lg sm:text-xl md:text-2xl text-muted-foreground max-w-3xl mx-auto text-balance font-light leading-relaxed"
          >
            {subtitle}
          </motion.p>
        )}
        {children}
      </motion.div>
    </section>
  );
}

export function AppleFeatureBlock({
  label,
  title,
  description,
  visual,
  reverse = false,
  accent = 'teal',
}: {
  label: string;
  title: string;
  description: string;
  visual: ReactNode;
  reverse?: boolean;
  accent?: 'teal' | 'amber' | 'violet';
}) {
  const ref = useRef<HTMLElement>(null);
  const inView = useInView(ref, { once: true, margin: '-15%' });
  const accentMap = {
    teal: 'from-teal-500/20 to-teal-600/5 text-teal-400',
    amber: 'from-amber-500/20 to-amber-600/5 text-amber-400',
    violet: 'from-violet-500/20 to-violet-600/5 text-violet-400',
  };

  return (
    <section ref={ref} className="py-24 sm:py-32 lg:py-40 border-t border-white/[0.06]">
      <div
        className={cn(
          'container mx-auto px-4 sm:px-6 lg:px-8 max-w-6xl grid lg:grid-cols-2 gap-12 lg:gap-20 items-center',
          reverse && 'lg:[direction:rtl] lg:*:[direction:ltr]'
        )}
      >
        <motion.div
          initial={{ opacity: 0, x: reverse ? 40 : -40 }}
          animate={inView ? { opacity: 1, x: 0 } : {}}
          transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
        >
          <p className={cn('text-xs font-semibold uppercase tracking-[0.18em] mb-4', accentMap[accent].split(' ').pop())}>
            {label}
          </p>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-display font-bold tracking-tight mb-6 text-balance">
            {title}
          </h2>
          <p className="text-lg text-muted-foreground leading-relaxed">{description}</p>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, scale: 0.92 }}
          animate={inView ? { opacity: 1, scale: 1 } : {}}
          transition={{ duration: 0.9, delay: 0.15, ease: [0.22, 1, 0.36, 1] }}
          className={cn(
            'relative rounded-3xl border border-white/[0.08] bg-gradient-to-br p-1 shadow-2xl',
            accentMap[accent].split(' ').slice(0, 2).join(' ')
          )}
        >
          <div className="rounded-[22px] bg-zinc-950/80 backdrop-blur-xl overflow-hidden">{visual}</div>
        </motion.div>
      </div>
    </section>
  );
}

export function ScrollStat({ value, label }: { value: string; label: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true });

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 20 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.6 }}
      className="text-center"
    >
      <p className="text-4xl sm:text-5xl font-display font-bold bg-gradient-to-b from-white to-white/60 bg-clip-text text-transparent">
        {value}
      </p>
      <p className="mt-2 text-sm text-muted-foreground">{label}</p>
    </motion.div>
  );
}

export function StickyShowcase({
  items,
}: {
  items: Array<{ id: string; title: string; body: string; visual: ReactNode }>;
}) {
  return (
    <section className="py-24 border-t border-white/[0.06]">
      <div className="container mx-auto px-4 sm:px-6 max-w-6xl">
        <div className="grid lg:grid-cols-2 gap-16">
          <div className="lg:sticky lg:top-32 lg:self-start space-y-16">
            {items.map((item, i) => (
              <ScrollReveal key={item.id} delay={i * 0.05}>
                <p className="text-xs uppercase tracking-[0.15em] text-teal-400 mb-3">{String(i + 1).padStart(2, '0')}</p>
                <h3 className="text-2xl sm:text-3xl font-display font-bold mb-4">{item.title}</h3>
                <p className="text-muted-foreground leading-relaxed">{item.body}</p>
              </ScrollReveal>
            ))}
          </div>
          <div className="space-y-8">
            {items.map((item) => (
              <div
                key={item.id}
                className="rounded-3xl border border-white/[0.08] bg-zinc-900/50 overflow-hidden min-h-[280px]"
              >
                {item.visual}
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

export function ScrollReveal({
  children,
  delay = 0,
  className,
}: {
  children: ReactNode;
  delay?: number;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: '-10%' });

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 32 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.7, delay, ease: [0.22, 1, 0.36, 1] }}
      className={className}
    >
      {children}
    </motion.div>
  );
}
