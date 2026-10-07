import Link from 'next/link';
import Image from 'next/image';
import { createClient } from '@/lib/supabase/server';
import { mapPost } from '@/lib/supabase/mappers';
import { optimizeCloudinaryUrl } from '@/utils/optimizeCloudinaryUrl';

const POST_SELECT = 'id, title, slug, excerpt, banner_image, publish_date, status, editors_pick, created_at, updated_at, vertical:verticals(id, name, slug)';
const PER_PAGE = 20;

export async function generateMetadata({ searchParams }) {
  const { page } = await searchParams;
  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const pageSuffix = pageNum > 1 ? ` – Page ${pageNum}` : '';
  return {
    title: `WalletPickle Articles${pageSuffix}`,
    description: 'Browse every WalletPickle article — the latest personal finance tips, side-hustle guides, and money strategies.',
    alternates: { canonical: pageNum === 1 ? '/articles' : `/articles?page=${pageNum}` },
  };
}

async function getArticlesPage(pageNum) {
  const supabase = await createClient();
  const from = (pageNum - 1) * PER_PAGE;
  const to = from + PER_PAGE - 1;

  const [{ data, error }, { count }] = await Promise.all([
    supabase
      .from('posts')
      .select(POST_SELECT)
      .eq('status', 'published')
      .order('publish_date', { ascending: false, nullsFirst: false })
      .order('created_at', { ascending: false })
      .range(from, to),
    supabase.from('posts').select('id', { count: 'exact', head: true }).eq('status', 'published'),
  ]);

  if (error) console.error('getArticlesPage:', error);
  return {
    posts: (data ?? []).map(mapPost),
    totalCount: count ?? 0,
  };
}

function pageHref(n) {
  return n === 1 ? '/articles' : `/articles?page=${n}`;
}

function buildPageNumbers(current, total) {
  // Show a condensed strip: first, last, current ± 2, with ellipses for gaps.
  const pages = new Set([1, total, current, current - 1, current + 1, current - 2, current + 2]);
  const filtered = [...pages].filter(n => n >= 1 && n <= total).sort((a, b) => a - b);
  const out = [];
  for (let i = 0; i < filtered.length; i++) {
    out.push(filtered[i]);
    if (i < filtered.length - 1 && filtered[i + 1] - filtered[i] > 1) out.push('…');
  }
  return out;
}

export default async function ArticlesPage({ searchParams }) {
  const { page } = await searchParams;
  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const { posts, totalCount } = await getArticlesPage(pageNum);
  const totalPages = Math.max(1, Math.ceil(totalCount / PER_PAGE));
  const safePageNum = Math.min(pageNum, totalPages);
  const chips = buildPageNumbers(safePageNum, totalPages);
  const rangeStart = (safePageNum - 1) * PER_PAGE + 1;
  const rangeEnd = Math.min(safePageNum * PER_PAGE, totalCount);

  return (
    <div className="max-w-[1100px] mx-auto px-6 py-12 font-[var(--font-ui)]">
      <header className="mb-10 border-b-[3px] border-[var(--ink)] pb-6">
        <h1 className="text-4xl md:text-5xl font-bold font-[var(--font-heading)] text-[var(--ink)] mb-2">
          WalletPickle Articles
        </h1>
        <p className="text-[var(--gray)]">
          Every published story — latest first.
        </p>
      </header>

      {posts.length === 0 ? (
        <div className="text-center text-[var(--gray)] py-16">No articles found on this page.</div>
      ) : (
        <>
          <div className="bg-white border border-[var(--line)] rounded-lg divide-y divide-[var(--line)] mb-8">
            {posts.map(post => (
              <Link
                key={post._id}
                href={`/${post.vertical?.slug ?? ''}/${post.slug}`}
                className="group flex gap-5 items-start p-5 transition-colors hover:bg-[var(--bg-2)]/40"
              >
                {post.bannerImage ? (
                  <Image
                    src={optimizeCloudinaryUrl(post.bannerImage, { width: 240, crop: 'fill' })}
                    alt={post.title}
                    width={120}
                    height={90}
                    className="w-[120px] h-[90px] object-cover rounded-sm shrink-0"
                  />
                ) : (
                  <div className="w-[120px] h-[90px] bg-[var(--bg-2)] border border-[var(--line)] rounded-sm shrink-0" />
                )}
                <div className="flex-1 min-w-0">
                  {post.vertical && (
                    <div className="text-[10px] tracking-wider text-[var(--green)] font-bold uppercase mb-1">
                      {post.vertical.name}
                    </div>
                  )}
                  <h2 className="font-[var(--font-heading)] font-bold text-[var(--ink)] text-lg md:text-xl leading-snug mb-2 group-hover:text-[var(--green)] transition-colors">
                    {post.title}
                  </h2>
                  {post.excerpt && (
                    <p className="text-[var(--gray)] text-sm leading-relaxed line-clamp-2">
                      {post.excerpt}
                    </p>
                  )}
                </div>
              </Link>
            ))}
          </div>

          <nav aria-label="Pagination" className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-2 flex-wrap">
              {safePageNum > 1 && (
                <Link
                  href={pageHref(safePageNum - 1)}
                  className="h-9 px-3 flex items-center justify-center text-sm font-bold rounded-sm bg-white border border-[var(--line)] text-[var(--ink)] hover:border-[var(--green)] hover:text-[var(--green)] transition-colors"
                >
                  ← Prev
                </Link>
              )}
              {chips.map((n, i) =>
                n === '…' ? (
                  <span key={`gap-${i}`} className="px-2 text-[var(--gray)]">…</span>
                ) : (
                  <Link
                    key={n}
                    href={pageHref(n)}
                    className={`w-9 h-9 flex items-center justify-center text-sm font-bold rounded-sm transition-colors ${
                      n === safePageNum
                        ? 'bg-[var(--green)] text-white'
                        : 'bg-white border border-[var(--line)] text-[var(--ink)] hover:border-[var(--green)] hover:text-[var(--green)]'
                    }`}
                  >
                    {String(n).padStart(2, '0')}
                  </Link>
                )
              )}
              {safePageNum < totalPages && (
                <Link
                  href={pageHref(safePageNum + 1)}
                  className="h-9 px-3 flex items-center justify-center text-sm font-bold rounded-sm bg-white border border-[var(--line)] text-[var(--ink)] hover:border-[var(--green)] hover:text-[var(--green)] transition-colors"
                >
                  Next →
                </Link>
              )}
            </div>
            <div className="text-xs text-[var(--gray)]">
              {rangeStart}&ndash;{rangeEnd} of {totalCount.toLocaleString()}
            </div>
          </nav>
        </>
      )}
    </div>
  );
}
