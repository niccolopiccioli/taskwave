import Link from 'next/link';
import { SiteHeader } from '@/components/layout/site-header';
import { SiteFooter } from '@/components/layout/site-footer';
import { getBlogPost } from '@/lib/blog';
import { notFound } from 'next/navigation';

export async function generateStaticParams() {
  const { getBlogPosts } = await import('@/lib/blog');
  return getBlogPosts().map((p) => ({ slug: p.slug }));
}

export default function BlogPostPage({ params }: { params: { slug: string } }) {
  const post = getBlogPost(params.slug);
  if (!post) notFound();

  return (
    <div className="min-h-screen bg-background noise-bg">
      <SiteHeader />

      <article className="pt-24 sm:pt-32 pb-16 px-4 sm:px-6">
        <div className="container mx-auto max-w-3xl">
          <Link href="/blog" className="text-sm text-primary hover:underline mb-6 inline-block">
            ← Torna al blog
          </Link>
          <div className="flex items-center gap-3 text-xs text-muted-foreground mb-4">
            <span className="bg-primary/10 text-primary px-2 py-1 rounded-full font-medium">
              {post.category}
            </span>
            <span>{post.date}</span>
            <span>•</span>
            <span>{post.readTime} lettura</span>
          </div>
          <h1 className="text-3xl md:text-4xl font-display font-bold mb-8">{post.title}</h1>
          <div className="prose prose-slate max-w-none space-y-4 text-muted-foreground">
            {post.body.split('\n\n').map((block, i) => {
              if (block.startsWith('## ')) {
                return (
                  <h2 key={i} className="text-xl font-semibold text-foreground mt-8">
                    {block.replace(/^## /, '')}
                  </h2>
                );
              }
              return <p key={i}>{block}</p>;
            })}
          </div>
        </div>
      </article>

      <SiteFooter />
    </div>
  );
}
