'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Sparkles, ArrowRight, CheckCircle } from 'lucide-react';

const STEPS = ['Benvenuto', 'Workspace', 'Board', 'Fatto'] as const;

interface OnboardingWizardProps {
  onComplete: (data: { workspaceName: string; boardName: string }) => void;
  onSkip: () => void;
}

export function OnboardingWizard({ onComplete, onSkip }: OnboardingWizardProps) {
  const [step, setStep] = useState(0);
  const [workspaceName, setWorkspaceName] = useState('');
  const [boardName, setBoardName] = useState('La mia prima board');

  const next = () => {
    if (step < STEPS.length - 1) setStep(step + 1);
    else onComplete({ workspaceName: workspaceName.trim(), boardName: boardName.trim() });
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-background/95 backdrop-blur-xl p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md rounded-2xl border border-border/60 bg-card p-8 shadow-2xl"
      >
        <div className="flex items-center gap-2 mb-6">
          <Sparkles className="h-5 w-5 text-primary" />
          <span className="text-sm text-muted-foreground">
            Step {step + 1} di {STEPS.length}
          </span>
        </div>

        <AnimatePresence mode="wait">
          {step === 0 && (
            <motion.div key="0" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <h2 className="text-2xl font-bold mb-2">Benvenuto in TaskWave</h2>
              <p className="text-muted-foreground mb-6">
                Organizza i tuoi progetti con board Kanban, team e analytics. Configuriamo tutto in 30 secondi.
              </p>
            </motion.div>
          )}
          {step === 1 && (
            <motion.div key="1" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <h2 className="text-xl font-display font-bold mb-4">Crea il tuo workspace</h2>
              <Label htmlFor="onboard-ws">Nome workspace</Label>
              <Input
                id="onboard-ws"
                className="mt-2"
                placeholder="Es. Il mio team"
                value={workspaceName}
                onChange={(e) => setWorkspaceName(e.target.value)}
              />
            </motion.div>
          )}
          {step === 2 && (
            <motion.div key="2" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <h2 className="text-xl font-display font-bold mb-4">Prima board Kanban</h2>
              <Label htmlFor="onboard-board">Nome board</Label>
              <Input
                id="onboard-board"
                className="mt-2"
                value={boardName}
                onChange={(e) => setBoardName(e.target.value)}
              />
            </motion.div>
          )}
          {step === 3 && (
            <motion.div key="3" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="text-center">
              <CheckCircle className="h-12 w-12 text-primary mx-auto mb-4" />
              <h2 className="text-xl font-display font-bold mb-2">Tutto pronto!</h2>
              <p className="text-muted-foreground">Inizia a creare task e invitare il team.</p>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="flex gap-2 mt-8">
          <Button variant="ghost" onClick={onSkip} className="text-muted-foreground">
            Salta
          </Button>
          <Button
            className="flex-1 bg-teal-500 hover:bg-teal-400 text-zinc-950"
            onClick={next}
            disabled={(step === 1 && !workspaceName.trim()) || (step === 2 && !boardName.trim())}
          >
            {step === STEPS.length - 1 ? 'Inizia' : 'Continua'}
            <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        </div>
      </motion.div>
    </div>
  );
}
