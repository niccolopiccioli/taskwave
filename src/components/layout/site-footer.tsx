import Link from 'next/link';
import { Brand } from '@/components/layout/brand';

export function SiteFooter() {
  return (
    <footer className="border-t border-white/[0.06] bg-zinc-950/50">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-12">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 mb-8">
          <div className="sm:col-span-2">
            <Brand href="/" size="md" className="mb-4" />
            <p className="text-sm text-muted-foreground max-w-sm leading-relaxed">
              Gestisci il tuo team alla velocità del pensiero. Kanban fluido per startup e team tecnici.
            </p>
          </div>
          <div>
            <h4 className="font-medium mb-3 text-sm text-foreground">Prodotto</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><Link href="/features" className="hover:text-teal-400 transition-colors">Funzionalità</Link></li>
              <li><Link href="/pricing" className="hover:text-teal-400 transition-colors">Prezzi</Link></li>
              <li><Link href="/about" className="hover:text-teal-400 transition-colors">About</Link></li>
              <li><Link href="/docs" className="hover:text-teal-400 transition-colors">Documentazione</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="font-medium mb-3 text-sm text-foreground">Legale</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><Link href="/privacy" className="hover:text-teal-400 transition-colors">Privacy</Link></li>
              <li><Link href="/privacy/opt-out" className="hover:text-teal-400 transition-colors">Opt-out IP</Link></li>
              <li><Link href="/?cookies=1" className="hover:text-teal-400 transition-colors">Gestione cookie</Link></li>
              <li><Link href="/terms" className="hover:text-teal-400 transition-colors">Termini</Link></li>
            </ul>
          </div>
        </div>
        <div className="pt-8 border-t border-white/[0.06] text-center text-sm text-muted-foreground">
          © {new Date().getFullYear()} TaskWave. Tutti i diritti riservati.
        </div>
      </div>
    </footer>
  );
}
