'use client';

import { useState, useEffect } from 'react';
import { Search, Download, Loader2, Star, LayoutGrid } from 'lucide-react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';

interface Template {
  id: string;
  name: string;
  description: string;
  category: string;
  tags: string[];
  icon: string;
  downloads: number;
  is_verified: boolean;
  author?: { full_name?: string | null; avatar_url?: string | null } | null;
  created_at: string;
}

interface TemplateGalleryProps {
  onUseTemplate: (template: Template) => void;
  plan: string;
}

const categories = [
  { value: '', label: 'Tutti' },
  { value: 'agile', label: 'Agile' },
  { value: 'engineering', label: 'Engineering' },
  { value: 'marketing', label: 'Marketing' },
  { value: 'product', label: 'Prodotto' },
  { value: 'hr', label: 'HR' },
  { value: 'general', label: 'Generale' },
];

export function TemplateGallery({ onUseTemplate, plan }: TemplateGalleryProps) {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const perPage = 12;

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams({
      limit: String(perPage),
      page: String(page),
      sort: 'popular',
    });
    if (category) params.set('category', category);
    if (search.trim()) params.set('search', search.trim());

    fetch(`/api/templates?${params}`)
      .then((r) => r.json())
      .then((data) => {
        setTemplates(data.templates || []);
        setTotal(data.total || 0);
      })
      .catch(() => setTemplates([]))
      .finally(() => setLoading(false));
  }, [category, search, page]);

  const hasMore = templates.length < total;
  const isBusiness = plan === 'business';

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Cerca template..."
            className="pl-8 h-8 text-xs"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
          />
        </div>
        <div className="flex gap-1 flex-wrap">
          {categories.map((c) => (
            <Button
              key={c.value}
              variant={category === c.value ? 'default' : 'outline'}
              size="sm"
              className="h-7 text-xs"
              onClick={() => {
                setCategory(c.value);
                setPage(1);
              }}
            >
              {c.label}
            </Button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : templates.length === 0 ? (
        <div className="text-center py-12">
          <LayoutGrid className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">Nessun template trovato</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {templates.map((tpl) => (
              <Card
                key={tpl.id}
                className="hover:border-teal-500/20 transition-colors group"
              >
                <CardHeader className="p-3 pb-1">
                  <div className="flex items-start gap-2.5">
                    <div className="h-8 w-8 rounded-lg bg-teal-500/10 flex items-center justify-center text-lg shrink-0">
                      {tpl.icon || '📋'}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <h3 className="font-medium text-sm truncate">{tpl.name}</h3>
                        {tpl.is_verified && (
                          <Star className="h-3 w-3 text-amber-400 fill-amber-400 shrink-0" />
                        )}
                      </div>
                      {isBusiness && tpl.author && (
                        <p className="text-[10px] text-muted-foreground">
                          di {tpl.author.full_name || 'Anonimo'}
                        </p>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-3 pt-2 space-y-2.5">
                  <p className="text-xs text-muted-foreground line-clamp-2">
                    {tpl.description}
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {tpl.tags.map((tag) => (
                      <Badge key={tag} variant="secondary" className="text-[10px] px-1.5 py-0">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                  <div className="flex items-center justify-between pt-1">
                    <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                      <Download className="h-3 w-3" /> {tpl.downloads}
                    </span>
                    <Button
                      size="sm"
                      className="h-7 text-xs"
                      onClick={() => onUseTemplate(tpl)}
                    >
                      Usa questo template
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {hasMore && (
            <div className="flex justify-center pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => p + 1)}
              >
                Carica altri
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
