'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { SiteHeader } from '@/components/layout/site-header';
import { SiteFooter } from '@/components/layout/site-footer';
import { AppleHero, ScrollReveal } from '@/components/marketing/apple-sections';
import { TemplateCloneDialog } from '@/components/templates/template-clone-dialog';
import {
  Search,
  Download,
  Layout,
  Sparkles,
  Check,
  ArrowRight,
  Loader2,
  Puzzle,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import type { Workspace } from '@/lib/database.types';

const CATEGORIES = [
  { value: '', label: 'Tutte' },
  { value: 'sprint', label: 'Sprint' },
  { value: 'marketing', label: 'Marketing' },
  { value: 'development', label: 'Sviluppo' },
  { value: 'design', label: 'Design' },
  { value: 'operations', label: 'Operazioni' },
  { value: 'hr', label: 'HR' },
  { value: 'sales', label: 'Vendite' },
] as const;

const CATEGORY_ICONS: Record<string, string> = {
  sprint: '🏃',
  marketing: '📢',
  development: '💻',
  design: '🎨',
  operations: '⚙️',
  hr: '👥',
  sales: '💰',
};

interface Template {
  id: string;
  name: string;
  description: string;
  category: string;
  tags: string[];
  icon: string;
  author_id: string;
  downloads: number;
  is_verified: boolean;
  created_at: string;
  updated_at: string;
  author: { full_name: string | null; avatar_url: string | null };
}

export default function TemplatesPage() {
  const router = useRouter();
  const supabase = createClient();
  const [templates, setTemplates] = useState<Template[]>([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [sort, setSort] = useState<'popular' | 'newest'>('popular');
  const [page, setPage] = useState(1);
  const limit = 12;
  const [user, setUser] = useState<{ id: string } | null>(null);
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [cloneDialog, setCloneDialog] = useState<{
    open: boolean;
    templateId: string;
    templateName: string;
  }>({ open: false, templateId: '', templateName: '' });

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data.user));
  }, [supabase.auth]);

  useEffect(() => {
    if (!user) return;
    supabase
      .from('workspaces')
      .select('*')
      .then(({ data }) => setWorkspaces(data || []));
  }, [user, supabase]);

  useEffect(() => {
    const fetchTemplates = async () => {
      setIsLoading(true);
      try {
        const params = new URLSearchParams();
        if (category) params.set('category', category);
        if (search) params.set('search', search);
        params.set('sort', sort);
        params.set('page', String(page));
        params.set('limit', String(limit));

        const res = await fetch(`/api/templates?${params.toString()}`);
        const data = await res.json();
        setTemplates(data.templates || []);
        setTotal(data.total || 0);
      } catch {
        // silent
      } finally {
        setIsLoading(false);
      }
    };

    fetchTemplates();
  }, [category, search, sort, page]);

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="min-h-screen bg-background noise-bg">
      <SiteHeader activePath="/templates" />

      <AppleHero
        eyebrow="Template"
        title={
          <>
            Template per
            <br />
            <span className="bg-gradient-to-r from-teal-300 to-emerald-400 bg-clip-text text-transparent">
              ogni workflow.
            </span>
          </>
        }
        subtitle="Board preconfigurate da copiare in un click. Sprint, marketing, sviluppo, design: scegli il template e parti veloce."
      />

      <section className="py-12 sm:py-16 border-y border-border/60 bg-muted/10">
        <div className="container mx-auto px-4 sm:px-6 max-w-6xl">
          <div className="flex flex-col sm:flex-row gap-4 mb-8">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Cerca template..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                className="pl-10 rounded-full"
              />
            </div>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant={sort === 'popular' ? 'default' : 'outline'}
                className={sort === 'popular' ? 'bg-teal-500 hover:bg-teal-400 text-zinc-950 rounded-full' : 'rounded-full'}
                onClick={() => { setSort('popular'); setPage(1); }}
              >
                Più usati
              </Button>
              <Button
                size="sm"
                variant={sort === 'newest' ? 'default' : 'outline'}
                className={sort === 'newest' ? 'bg-teal-500 hover:bg-teal-400 text-zinc-950 rounded-full' : 'rounded-full'}
                onClick={() => { setSort('newest'); setPage(1); }}
              >
                Più recenti
              </Button>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 mb-8">
            {CATEGORIES.map((cat) => (
              <Button
                key={cat.value}
                size="sm"
                variant={category === cat.value ? 'default' : 'outline'}
                className={category === cat.value ? 'bg-teal-500 hover:bg-teal-400 text-zinc-950 rounded-full' : 'rounded-full'}
                onClick={() => { setCategory(cat.value); setPage(1); }}
              >
                {CATEGORY_ICONS[cat.value] && <span className="mr-1">{CATEGORY_ICONS[cat.value]}</span>}
                {cat.label}
              </Button>
            ))}
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-8 h-8 animate-spin text-teal-400" />
            </div>
          ) : templates.length === 0 ? (
            <div className="text-center py-20 text-muted-foreground">
              <Puzzle className="h-12 w-12 mx-auto mb-4 text-muted-foreground/40" />
              <p className="text-lg font-medium">Nessun template trovato</p>
              <p className="text-sm mt-1">Prova a cambiare categoria o ricerca.</p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                {templates.map((template, i) => (
                  <ScrollReveal key={template.id} delay={i * 0.05}>
                    <motion.article
                      whileHover={{ y: -4 }}
                      className="group relative overflow-hidden rounded-2xl border border-border/60 bg-card/40 p-5 sm:p-6 transition-all hover:border-teal-500/30 hover:shadow-lg hover:shadow-teal-500/5"
                    >
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-teal-500/10 rounded-xl flex items-center justify-center text-lg">
                            {template.icon || CATEGORY_ICONS[template.category] || '📋'}
                          </div>
                          <div>
                            <h3 className="font-semibold text-sm">{template.name}</h3>
                            <p className="text-[11px] text-muted-foreground">
                              {template.author.full_name || 'TaskWave'}
                              {template.is_verified && (
                                <span className="ml-1 inline-flex items-center gap-0.5 text-teal-400">
                                  <Check className="h-3 w-3" />
                                  Verificato
                                </span>
                              )}
                            </p>
                          </div>
                        </div>
                        <Badge variant="outline" className="text-[10px] shrink-0">
                          {CATEGORIES.find((c) => c.value === template.category)?.label || template.category}
                        </Badge>
                      </div>

                      <p className="text-xs text-muted-foreground leading-relaxed mb-4 line-clamp-2">
                        {template.description}
                      </p>

                      <div className="flex flex-wrap gap-1.5 mb-4">
                        {template.tags?.slice(0, 3).map((tag) => (
                          <span key={tag} className="text-[10px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                            {tag}
                          </span>
                        ))}
                      </div>

                      <div className="flex items-center justify-between pt-3 border-t border-border/40">
                        <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                          <Download className="h-3 w-3" />
                          {template.downloads}
                        </span>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="gap-1 text-xs group-hover:text-teal-400"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (user) {
                              setCloneDialog({ open: true, templateId: template.id, templateName: template.name });
                            } else {
                              router.push('/register');
                            }
                          }}
                        >
                          Usa ora
                          <ArrowRight className="h-3 w-3" />
                        </Button>
                      </div>
                    </motion.article>
                  </ScrollReveal>
                ))}
              </div>

              {totalPages > 1 && (
                <div className="flex items-center justify-center gap-2 mt-10">
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={page <= 1}
                    onClick={() => setPage((p) => p - 1)}
                  >
                    Precedente
                  </Button>
                  <span className="text-sm text-muted-foreground">
                    {page} / {totalPages}
                  </span>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={page >= totalPages}
                    onClick={() => setPage((p) => p + 1)}
                  >
                    Successiva
                  </Button>
                </div>
              )}
            </>
          )}
        </div>
      </section>

      <section className="py-24 sm:py-32 border-t border-border/60">
        <ScrollReveal className="container mx-auto px-4 text-center max-w-xl">
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-teal-500/15 mb-6">
            <Sparkles className="h-6 w-6 text-teal-400" />
          </div>
          <h2 className="text-2xl sm:text-3xl font-display font-bold mb-4">
            Pronto a provare un template?
          </h2>
          <p className="text-muted-foreground mb-8">
            Crea un account gratis e scegli il template che fa per te. Copia in un click e inizia subito.
          </p>
          <Button
            size="lg"
            className="rounded-full bg-teal-500 hover:bg-teal-400 text-zinc-950 font-semibold shadow-lg shadow-teal-500/20"
            onClick={() => router.push(user ? '/dashboard' : '/register')}
          >
            <Layout className="h-4 w-4 mr-2" />
            {user ? 'Vai alla dashboard' : 'Inizia gratis'}
          </Button>
        </ScrollReveal>
      </section>

      <TemplateCloneDialog
        open={cloneDialog.open}
        onOpenChange={(open) => setCloneDialog((prev) => ({ ...prev, open }))}
        templateId={cloneDialog.templateId}
        templateName={cloneDialog.templateName}
        workspaces={workspaces}
      />

      <SiteFooter />
    </div>
  );
}
