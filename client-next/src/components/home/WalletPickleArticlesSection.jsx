import Link from 'next/link';
import Image from 'next/image';
import { optimizeCloudinaryUrl } from '../../utils/optimizeCloudinaryUrl';

// Compact article feed shown at the bottom of the homepage. Lists the latest
// posts (10 per page server-side) with "page number" chips that link out to
// the dedicated /articles page so the homepage itself stays static.
export default function WalletPickleArticlesSection({ posts = [], totalCount = 0 }) {
  if (posts.length === 0) return null;

  // Homepage shows the first page only; downstream pages live at /articles?page=N.
  // Compute the "fake" chip row to hint at how much more content exists.
  const perPage = 10;
  const totalPages = Math.max(1, Math.ceil(totalCount / perPage));
  const previewPages = Array.from({ length: Math.min(4, totalPages) }, (_, i) => i + 1);

  return (
    <section className="w-full mb-12 font-[var(--font-ui)]">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl md:text-3xl font-bold font-[var(--font-heading)] text-[var(--ink)]">
          WalletPickle Articles
        </h2>
        <Link
          href="/articles"
          className="text-xs font-bold tracking-widest uppercase text-[var(--ink)] hover:text-[var(--green)] transition-colors"
        >
          View all →
        </Link>
      </div>

      <div className="bg-white border border-[var(--line)] rounded-lg divide-y divide-[var(--line)]">
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
              <h3 className="font-[var(--font-heading)] font-bold text-[var(--ink)] text-lg md:text-xl leading-snug mb-2 group-hover:text-[var(--green)] transition-colors">
                {post.title}
              </h3>
              {post.excerpt && (
                <p className="text-[var(--gray)] text-sm leading-relaxed line-clamp-2">
                  {post.excerpt}
                </p>
              )}
            </div>
          </Link>
        ))}
      </div>

      <div className="flex items-center justify-between mt-5 flex-wrap gap-3">
        <div className="flex items-center gap-2">
          {previewPages.map(n => (
            <Link
              key={n}
              href={n === 1 ? '/articles' : `/articles?page=${n}`}
              className={`w-9 h-9 flex items-center justify-center text-sm font-bold rounded-sm transition-colors ${
                n === 1
                  ? 'bg-[var(--green)] text-white'
                  : 'bg-white border border-[var(--line)] text-[var(--ink)] hover:border-[var(--green)] hover:text-[var(--green)]'
              }`}
            >
              {String(n).padStart(2, '0')}
            </Link>
          ))}
          {totalPages > 1 && (
            <Link
              href="/articles?page=2"
              className="h-9 px-3 flex items-center justify-center text-sm font-bold rounded-sm bg-white border border-[var(--line)] text-[var(--ink)] hover:border-[var(--green)] hover:text-[var(--green)] transition-colors"
            >
              Next
            </Link>
          )}
        </div>
        <div className="text-xs text-[var(--gray)]">
          1&ndash;{posts.length} of {totalCount.toLocaleString()}
        </div>
      </div>
    </section>
  );
}
