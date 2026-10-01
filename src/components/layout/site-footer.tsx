'use client';

import Link from 'next/link';
import { Brand } from '@/components/layout/brand';
import { useT } from '@/components/providers/i18n-provider';

export function SiteFooter() {
  const t = useT();

  return (
    <footer className="border-t border-border/60 bg-muted/20">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-12">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 mb-8">
          <div className="sm:col-span-2">
            <Brand href="/" size="md" className="mb-4" />
            <p className="text-sm text-muted-foreground max-w-sm leading-relaxed">
              {t.footer.tagline}
            </p>
          </div>
          <div>
            <h4 className="font-medium mb-3 text-sm text-foreground">{t.footer.product}</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><Link href="/features" className="hover:text-primary transition-colors">{t.footer.features}</Link></li>
              <li><Link href="/pricing" className="hover:text-primary transition-colors">{t.footer.pricing}</Link></li>
              <li><Link href="/about" className="hover:text-primary transition-colors">{t.footer.about}</Link></li>
              <li><Link href="/docs" className="hover:text-primary transition-colors">{t.footer.docs}</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="font-medium mb-3 text-sm text-foreground">{t.footer.legal}</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><Link href="/privacy" className="hover:text-primary transition-colors">{t.footer.privacy}</Link></li>
              <li><Link href="/privacy/opt-out" className="hover:text-primary transition-colors">{t.footer.optOut}</Link></li>
              <li><Link href="/?cookies=1" className="hover:text-primary transition-colors">{t.footer.cookies}</Link></li>
              <li><Link href="/terms" className="hover:text-primary transition-colors">{t.footer.terms}</Link></li>
            </ul>
          </div>
        </div>
        <div className="pt-8 border-t border-border/60 text-center text-sm text-muted-foreground">
          © {new Date().getFullYear()} TaskWave. {t.footer.rights}
        </div>
      </div>
    </footer>
  );
}
