import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');
    const search = searchParams.get('search');
    const sort = searchParams.get('sort') || 'popular';
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = Math.min(parseInt(searchParams.get('limit') || '20', 10), 50);
    const offset = (page - 1) * limit;

    const supabase = await createClient();

    let query = supabase
      .from('published_templates')
      .select(
        'id, name, description, category, tags, icon, author_id, downloads, is_verified, created_at, updated_at',
        { count: 'exact' }
      )
      .eq('is_public', true);

    if (category) {
      query = query.eq('category', category);
    }

    if (search) {
      query = query.or(`name.ilike.%${search}%,description.ilike.%${search}%`);
    }

    if (sort === 'newest') {
      query = query.order('created_at', { ascending: false });
    } else {
      query = query.order('downloads', { ascending: false });
    }

    query = query.range(offset, offset + limit - 1);

    const { data: templates, error, count } = await query;

    if (error) return NextResponse.json({ error: error.message }, { status: 400 });

    const authorIds = Array.from(new Set((templates ?? []).map((t) => t.author_id)));
    const authors: Record<string, { full_name: string | null; avatar_url: string | null }> = {};

    if (authorIds.length > 0) {
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url')
        .in('id', authorIds);

      for (const p of profiles ?? []) {
        authors[p.id] = { full_name: p.full_name, avatar_url: p.avatar_url };
      }
    }

    const enriched = (templates ?? []).map((t) => ({
      ...t,
      author: authors[t.author_id] || { full_name: null, avatar_url: null },
    }));

    return NextResponse.json({
      templates: enriched,
      total: count ?? 0,
      page,
      limit,
    });
  } catch (error) {
    console.error('List templates error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Errore nel recupero dei template' },
      { status: 500 }
    );
  }
}
