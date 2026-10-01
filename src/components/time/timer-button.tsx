'use client';

import { useState, useEffect, useRef } from 'react';
import { Play, Square } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface TimerButtonProps {
  taskId: string;
}

export function TimerButton({ taskId }: TimerButtonProps) {
  const { toast } = useToast();
  const [runningEntryId, setRunningEntryId] = useState<string | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startedAtRef = useRef<string | null>(null);

  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  useEffect(() => {
    if (runningEntryId) {
      intervalRef.current = setInterval(() => {
        if (startedAtRef.current) {
          setElapsed(
            Math.floor((Date.now() - new Date(startedAtRef.current).getTime()) / 1000)
          );
        }
      }, 1000);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      setElapsed(0);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [runningEntryId]);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const handleStart = async () => {
    try {
      const res = await fetch('/api/time/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ taskId }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error);
      }
      const data = await res.json();
      setRunningEntryId(data.entry.id);
      startedAtRef.current = data.entry.started_at;
      setElapsed(0);
    } catch (e) {
      toast({
        variant: 'destructive',
        title: 'Errore',
        description: e instanceof Error ? e.message : 'Avvio timer fallito',
      });
    }
  };

  const handleStop = async () => {
    if (!runningEntryId) return;
    try {
      const res = await fetch('/api/time/stop', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ entryId: runningEntryId }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error);
      }
      setRunningEntryId(null);
      startedAtRef.current = null;
      toast({ title: 'Timer fermato' });
    } catch (e) {
      toast({
        variant: 'destructive',
        title: 'Errore',
        description: e instanceof Error ? e.message : 'Arresto timer fallito',
      });
    }
  };

  if (runningEntryId) {
    return (
      <Button
        size="sm"
        variant="outline"
        onClick={handleStop}
        className={cn(
          'h-8 gap-1.5 border-red-500/40 text-red-400 hover:bg-red-500/10 hover:text-red-300',
          'animate-pulse'
        )}
      >
        <Square className="h-3.5 w-3.5 fill-red-400" />
        <span className="text-xs tabular-nums">{formatTime(elapsed)}</span>
      </Button>
    );
  }

  return (
    <Button
      size="sm"
      variant="outline"
      onClick={handleStart}
      className="h-8 gap-1.5 border-teal-500/30 text-teal-400 hover:bg-teal-500/10 hover:text-teal-300"
    >
      <Play className="h-3.5 w-3.5 fill-teal-400" />
      <span className="text-xs">Timer</span>
    </Button>
  );
}
