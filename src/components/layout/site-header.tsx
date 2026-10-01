'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Menu, X, LayoutDashboard } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Brand } from '@/components/layout/brand';
import { ContactSheet } from '@/components/layout/contact-sheet';
import { useT } from '@/components/providers/i18n-provider';
import { cn } from '@/lib/utils';
import { createClient } from '@/lib/supabase/client';

interface SiteHeaderProps {
  activePath?: string;
}

function isActive(activePath: string | undefined, href: string) {
  if (!activePath) return false;
  if (href.startsWith('/#')) return activePath === href;
  return activePath === href || activePath.startsWith(href);
}

export function SiteHeader({ activePath }: SiteHeaderProps) {
  const t = useT();
  const supabase = createClient();
  const [open, setOpen] = useState(false);
  const [contactOpen, setContactOpen] = useState(false);
  const [user, setUser] = useState<{ id: string } | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data.user));
  }, [supabase.auth]);

  const navLinks = [
    { href: '/features', label: t.nav.features },
    { href: '/pricing', label: t.nav.pricing },
    { href: '/about', label: t.nav.about },
  ];

  const openContactFromMobile = () => {
    setOpen(false);
    setContactOpen(true);
  };

  return (
    <header className="fixed top-0 inset-x-0 z-50 border-b border-border/60 bg-background/80 backdrop-blur-2xl supports-[backdrop-filter]:bg-background/70">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="relative flex h-14 sm:h-[3.75rem] items-center justify-between gap-4">
          <Brand href="/" size="sm" className="sm:hidden" />
          <Brand href="/" size="md" className="hidden sm:flex" />

          <nav
            className="hidden lg:flex absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 items-center gap-0.5 rounded-full border border-border bg-muted/50 p-1 shadow-sm"
            aria-label={t.nav.mainNav}
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
                      ? 'bg-background text-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground hover:bg-background/80'
                  )}
                >
                  {link.label}
                </Link>
              );
            })}
            <ContactSheet
              triggerLabel={t.nav.contact}
              triggerClassName={cn(
                activePath === '/contact' && 'bg-background text-foreground shadow-sm'
              )}
            />
          </nav>

          <div className="flex items-center gap-1.5 sm:gap-2 ml-auto">
            {user ? (
              <Link href="/dashboard" className="hidden sm:block">
                <Button
                  size="sm"
                  className="rounded-full bg-teal-500 hover:bg-teal-400 text-zinc-950 shadow-lg shadow-teal-500/20 text-xs sm:text-sm px-4 font-semibold"
                >
                  <LayoutDashboard className="h-3.5 w-3.5 mr-1.5" />
                  Dashboard
                </Button>
              </Link>
            ) : (
              <>
                <Link href="/login" className="hidden sm:block">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-muted-foreground hover:text-foreground hover:bg-muted rounded-full px-4"
                  >
                    {t.nav.login}
                  </Button>
                </Link>
                <Link href="/register" className="hidden min-[400px]:block">
                  <Button
                    size="sm"
                    className="rounded-full bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg shadow-primary/20 text-xs sm:text-sm px-4 font-semibold"
                  >
                    <span className="hidden sm:inline">{t.nav.signup}</span>
                    <span className="sm:hidden">{t.nav.signupShort}</span>
                  </Button>
                </Link>
              </>
            )}

            <Sheet open={open} onOpenChange={setOpen}>
              <SheetTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="lg:hidden shrink-0 rounded-full hover:bg-muted"
                  aria-label={t.nav.openMenu}
                >
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent
                side="right"
                hideClose
                className="flex flex-col w-[min(100vw-2rem,320px)] border-border bg-background backdrop-blur-2xl p-0"
              >
                <div className="flex items-center justify-between border-b border-border px-5 py-4">
                  <SheetTitle className="sr-only">{t.nav.mobileMenu}</SheetTitle>
                  <div onClick={() => setOpen(false)}>
                    <Brand href="/" size="sm" />
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="rounded-full h-8 w-8"
                    onClick={() => setOpen(false)}
                    aria-label={t.nav.closeMenu}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
                <nav className="flex flex-col gap-1 p-3 flex-1" aria-label={t.nav.mobileMenu}>
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
                            ? 'bg-primary/10 text-primary'
                            : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                        )}
                      >
                        {link.label}
                      </Link>
                    );
                  })}
                  <button
                    type="button"
                    onClick={openContactFromMobile}
                    className="rounded-xl px-4 py-3 text-left text-[15px] font-medium text-muted-foreground hover:bg-muted hover:text-foreground w-full transition-colors"
                  >
                    {t.nav.contact}
                  </button>
                </nav>
                <div className="mt-auto border-t border-border p-4 flex flex-col gap-2">
                  {user ? (
                    <Link href="/dashboard" onClick={() => setOpen(false)}>
                      <Button className="w-full rounded-xl bg-teal-500 hover:bg-teal-400 text-zinc-950 font-semibold">
                        <LayoutDashboard className="h-4 w-4 mr-2" />
                        Dashboard
                      </Button>
                    </Link>
                  ) : (
                    <>
                      <Link href="/login" onClick={() => setOpen(false)}>
                        <Button variant="outline" className="w-full rounded-xl">
                          {t.nav.login}
                        </Button>
                      </Link>
                      <Link href="/register" onClick={() => setOpen(false)}>
                        <Button className="w-full rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-semibold">
                          {t.nav.signup}
                        </Button>
                      </Link>
                    </>
                  )}
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </div>
      <ContactSheet open={contactOpen} onOpenChange={setContactOpen} showTrigger={false} />
    </header>
  );
}
