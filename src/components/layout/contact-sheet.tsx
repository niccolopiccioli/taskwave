'use client';

import { useState } from 'react';
import { Loader2, Mail, Send } from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';

interface ContactSheetProps {
  triggerClassName?: string;
  triggerLabel?: string;
  onNavigate?: () => void;
}

export function ContactSheet({ triggerClassName, triggerLabel = 'Contattaci', onNavigate }: ContactSheetProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({ name: '', email: '', subject: '', message: '' });

  const reset = () => {
    setForm({ name: '', email: '', subject: '', message: '' });
    setSent(false);
    setError(null);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Errore invio');
      setSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Errore invio');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Sheet
      open={open}
      onOpenChange={(v) => {
        setOpen(v);
        if (!v) reset();
        onNavigate?.();
      }}
    >
      <SheetTrigger asChild>
        <button
          type="button"
          className={cn(
            'rounded-full px-4 py-1.5 text-[13px] font-medium transition-all duration-200',
            'text-muted-foreground hover:text-foreground hover:bg-white/[0.05]',
            triggerClassName
          )}
        >
          {triggerLabel}
        </button>
      </SheetTrigger>
      <SheetContent
        side="right"
        className="w-full sm:max-w-md border-white/[0.08] bg-zinc-950/98 backdrop-blur-2xl overflow-y-auto"
      >
        <SheetHeader className="text-left pb-2">
          <SheetTitle className="flex items-center gap-2 text-xl font-display">
            <Mail className="h-5 w-5 text-teal-400" />
            Contattaci
          </SheetTitle>
          <SheetDescription>
            Raccontaci del tuo team, di un&apos;integrazione o di una partnership. Rispondiamo entro 48 ore.
          </SheetDescription>
        </SheetHeader>

        {sent ? (
          <div className="mt-8 rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-6 text-center">
            <p className="text-lg font-semibold text-emerald-400 mb-2">Messaggio inviato</p>
            <p className="text-sm text-muted-foreground">
              Ti abbiamo inviato una conferma via email. A presto!
            </p>
            <Button className="mt-6 rounded-full" onClick={() => setOpen(false)}>
              Chiudi
            </Button>
          </div>
        ) : (
          <form onSubmit={submit} className="mt-6 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="contact-name">Nome</Label>
              <Input
                id="contact-name"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="Il tuo nome"
                required
                className="rounded-xl bg-white/[0.03] border-white/10"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="contact-email">Email</Label>
              <Input
                id="contact-email"
                type="email"
                value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                placeholder="tu@azienda.com"
                required
                className="rounded-xl bg-white/[0.03] border-white/10"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="contact-subject">Oggetto</Label>
              <Input
                id="contact-subject"
                value={form.subject}
                onChange={(e) => setForm((f) => ({ ...f, subject: e.target.value }))}
                placeholder="Demo, supporto, partnership…"
                className="rounded-xl bg-white/[0.03] border-white/10"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="contact-message">Messaggio</Label>
              <Textarea
                id="contact-message"
                value={form.message}
                onChange={(e) => setForm((f) => ({ ...f, message: e.target.value }))}
                placeholder="Come possiamo aiutarti?"
                rows={5}
                required
                className="rounded-xl bg-white/[0.03] border-white/10 resize-none"
              />
            </div>
            {error && <p className="text-sm text-red-400">{error}</p>}
            <Button
              type="submit"
              disabled={loading}
              className="w-full rounded-full bg-teal-500 hover:bg-teal-400 text-zinc-950 font-semibold gap-2"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <Send className="h-4 w-4" />
                  Invia messaggio
                </>
              )}
            </Button>
          </form>
        )}
      </SheetContent>
    </Sheet>
  );
}
