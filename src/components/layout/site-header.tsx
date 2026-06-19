'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Menu, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Brand } from '@/components/layout/brand';
import { ContactSheet } from '@/components/layout/contact-sheet';
import { cn } from '@/lib/utils';

interface SiteHeaderProps {
  activePath?: string;
}

const navLinks = [
  { href: '/features', label: 'Funzionalità' },
  { href: '/pricing', label: 'Prezzi' },
  { href: '/about', label: 'About' },
];

function isActive(activePath: string | undefined, href: string) {
  if (!activePath) return false;
  if (href.startsWith('/#')) return activePath === href;
  return activePath === href || activePath.startsWith(href);
}

export function SiteHeader({ activePath }: SiteHeaderProps) {
  const [open, setOpen] = useState(false);

  return (
    <header className="fixed top-0 inset-x-0 z-50 border-b border-white/[0.06] bg-zinc-950/80 backdrop-blur-2xl supports-[backdrop-filter]:bg-zinc-950/65">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="relative flex h-14 sm:h-[3.75rem] items-center justify-between gap-4">
          <Brand href="/" size="sm" className="sm:hidden" />
          <Brand href="/" size="md" className="hidden sm:flex" />

          <nav
            className="hidden lg:flex absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 items-center gap-0.5 rounded-full border border-white/[0.08] bg-white/[0.03] p-1 shadow-inner shadow-black/20"
            aria-label="Navigazione principale"
          >
            {navLinks.map((link) => {
              const active = isActive(activePath, link.href);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={cn(
                    'rounded-full px-4 py-1.5 text-[13px] font-medium transition-all duration-200',
                    active
                      ? 'bg-white/10 text-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground hover:bg-white/[0.05]'
                  )}
                >
                  {link.label}
                </Link>
              );
            })}
            <ContactSheet
              triggerClassName={cn(
                activePath === '/contact' && 'bg-white/10 text-foreground shadow-sm'
              )}
            />
          </nav>

          <div className="flex items-center gap-1.5 sm:gap-2 ml-auto">
            <Link href="/login" className="hidden sm:block">
              <Button
                variant="ghost"
                size="sm"
                className="text-muted-foreground hover:text-foreground hover:bg-white/[0.05] rounded-full px-4"
              >
                Accedi
              </Button>
            </Link>
            <Link href="/register" className="hidden min-[400px]:block">
              <Button
                size="sm"
                className="rounded-full bg-teal-500 hover:bg-teal-400 text-zinc-950 shadow-lg shadow-teal-500/20 text-xs sm:text-sm px-4 font-semibold"
              >
                <span className="hidden sm:inline">Inizia gratis</span>
                <span className="sm:hidden">Registrati</span>
              </Button>
            </Link>

            <Sheet open={open} onOpenChange={setOpen}>
              <SheetTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="lg:hidden shrink-0 rounded-full hover:bg-white/[0.06]"
                  aria-label="Apri menu"
                >
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent
                side="right"
                className="flex flex-col w-[min(100vw-2rem,320px)] border-white/[0.08] bg-zinc-950/95 backdrop-blur-2xl p-0"
              >
                <div className="flex items-center justify-between border-b border-white/[0.06] px-5 py-4">
                  <SheetTitle className="sr-only">Menu navigazione</SheetTitle>
                  <div onClick={() => setOpen(false)}>
                    <Brand href="/" size="sm" />
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="rounded-full h-8 w-8"
                    onClick={() => setOpen(false)}
                    aria-label="Chiudi menu"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
                <nav className="flex flex-col gap-1 p-3 flex-1" aria-label="Menu mobile">
                  {navLinks.map((link) => {
                    const active = isActive(activePath, link.href);
                    return (
                      <Link
                        key={link.href}
                        href={link.href}
                        onClick={() => setOpen(false)}
                        className={cn(
                          'rounded-xl px-4 py-3 text-[15px] font-medium transition-colors',
                          active
                            ? 'bg-teal-500/10 text-teal-400'
                            : 'text-muted-foreground hover:bg-white/[0.04] hover:text-foreground'
                        )}
                      >
                        {link.label}
                      </Link>
                    );
                  })}
                  <ContactSheet onNavigate={() => setOpen(false)} triggerClassName="rounded-xl px-4 py-3 text-left text-[15px] font-medium text-muted-foreground hover:bg-white/[0.04] hover:text-foreground w-full" />
                </nav>
                <div className="mt-auto border-t border-white/[0.06] p-4 flex flex-col gap-2">
                  <Link href="/login" onClick={() => setOpen(false)}>
                    <Button variant="outline" className="w-full rounded-xl border-white/10 bg-transparent hover:bg-white/[0.04]">
                      Accedi
                    </Button>
                  </Link>
                  <Link href="/register" onClick={() => setOpen(false)}>
                    <Button className="w-full rounded-xl bg-teal-500 hover:bg-teal-400 text-zinc-950 font-semibold">
                      Inizia gratis
                    </Button>
                  </Link>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </div>
    </header>
  );
}
