'use client';

import { Fragment, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, Lock, ChevronDown } from 'lucide-react';
import { COMPARISON_MATRIX, planLabel } from '@/lib/plans';

function CellValue({ value }: { value: string | boolean }) {
  if (value === true) {
    return (
      <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-primary/15 mx-auto">
        <Check className="h-3.5 w-3.5 text-primary" />
      </span>
    );
  }
  if (value === false) {
    return <Lock className="mx-auto h-3.5 w-3.5 text-muted-foreground/40" aria-hidden />;
  }
  return <span className="text-xs sm:text-sm font-medium">{value}</span>;
}

export function PlanComparisonMatrix() {
  const [expanded, setExpanded] = useState<string | null>(COMPARISON_MATRIX[0]?.category ?? null);

  return (
    <>
      {/* Desktop table */}
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.4 }}
        className="hidden md:block overflow-hidden rounded-2xl border border-border/60 bg-card/30"
      >
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-left">
            <thead>
              <tr className="border-b border-border/60 bg-muted/40">
                <th className="sticky left-0 z-10 bg-muted/40 px-5 py-4 text-sm font-semibold">
                  Funzionalità
                </th>
                <th className="px-4 py-4 text-center text-sm font-semibold w-32">
                  {planLabel('free')}
                </th>
                <th className="px-4 py-4 text-center text-sm font-semibold w-32 text-primary bg-primary/[0.04]">
                  {planLabel('pro')}
                </th>
                <th className="px-4 py-4 text-center text-sm font-semibold w-32 text-amber-600 dark:text-amber-400">
                  {planLabel('business')}
                </th>
              </tr>
            </thead>
            <tbody>
              {COMPARISON_MATRIX.map((section) => (
                <Fragment key={section.category}>
                  <tr className="bg-muted/25">
                    <td
                      colSpan={4}
                      className="px-5 py-2.5 text-[11px] font-bold uppercase tracking-wider text-muted-foreground"
                    >
                      {section.category}
                    </td>
                  </tr>
                  {section.rows.map((row) => (
                    <tr
                      key={row.label}
                      className="border-b border-border/40 transition-colors hover:bg-muted/10"
                    >
                      <td className="sticky left-0 z-10 bg-background/95 backdrop-blur px-5 py-3.5 text-sm">
                        {row.label}
                      </td>
                      <td className="px-4 py-3.5 text-center">
                        <CellValue value={row.free} />
                      </td>
                      <td className="px-4 py-3.5 text-center bg-primary/[0.02]">
                        <CellValue value={row.pro} />
                      </td>
                      <td className="px-4 py-3.5 text-center">
                        <CellValue value={row.business} />
                      </td>
                    </tr>
                  ))}
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>
      </motion.div>

      {/* Mobile accordion */}
      <div className="md:hidden space-y-3">
        {COMPARISON_MATRIX.map((section) => (
          <div
            key={section.category}
            className="overflow-hidden rounded-2xl border border-border/60 bg-card/40"
          >
            <button
              type="button"
              onClick={() =>
                setExpanded(expanded === section.category ? null : section.category)
              }
              className="flex w-full items-center justify-between gap-3 px-4 py-4 text-left font-semibold"
            >
              {section.category}
              <motion.span animate={{ rotate: expanded === section.category ? 180 : 0 }}>
                <ChevronDown className="h-5 w-5 text-muted-foreground" />
              </motion.span>
            </button>
            <AnimatePresence initial={false}>
              {expanded === section.category && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden border-t border-border/60"
                >
                  <ul className="divide-y divide-border/40">
                    {section.rows.map((row) => (
                      <li key={row.label} className="px-4 py-3">
                        <p className="mb-2 text-sm font-medium">{row.label}</p>
                        <div className="grid grid-cols-3 gap-2 text-center text-[11px]">
                          <div className="rounded-lg bg-muted/40 py-2">
                            <p className="mb-1 text-muted-foreground">Free</p>
                            <CellValue value={row.free} />
                          </div>
                          <div className="rounded-lg bg-primary/5 py-2 ring-1 ring-primary/20">
                            <p className="mb-1 text-primary">Pro</p>
                            <CellValue value={row.pro} />
                          </div>
                          <div className="rounded-lg bg-muted/40 py-2">
                            <p className="mb-1 text-muted-foreground">Biz</p>
                            <CellValue value={row.business} />
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        ))}
      </div>
    </>
  );
}
