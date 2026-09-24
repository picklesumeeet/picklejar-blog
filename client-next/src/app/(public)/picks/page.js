import Link from 'next/link';
import Image from 'next/image';
import { getPublishedPicks } from '@/lib/picks-server';
import { optimizeCloudinaryUrl } from '@/utils/optimizeCloudinaryUrl';

export const metadata = {
  title: 'Listicles - WalletPickle',
  description: 'Curated lists, guides, and roundups on personal finance, retirement, credit cards, and more.',
  alternates: { canonical: '/picks' },
};

function formatDate(dateStr) {
  if (!dateStr) return null;
  return new Date(dateStr).toLocaleDateString('en-US', {
    timeZone: 'UTC', month: 'short', day: 'numeric', year: 'numeric',
  });
}

export default async function PicksIndex() {
  const picks = await getPublishedPicks();

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10">
      <header className="mb-10 border-b border-[var(--line)] pb-6">
        <h1 className="text-4xl sm:text-5xl font-bold font-heading text-[var(--ink)] mb-3">Listicles</h1>
        <p className="text-lg text-[var(--gray)] font-medium">
          Curated lists, guides, and roundups from the WalletPickle editors.
        </p>
      </header>

      {picks.length === 0 ? (
        <div className="p-16 text-center text-[var(--gray)] border border-[var(--line)] rounded-xl bg-white font-medium">
          No listicles published yet. Check back soon.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {picks.map(pick => (
            <Link
              key={pick._id}
              href={`/picks/${pick.slug}`}
              className="group bg-white border border-[var(--line)] rounded-xl overflow-hidden shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 flex flex-col"
            >
              <div className="relative aspect-[16/9] bg-[var(--bg-2)]">
                {pick.heroImage ? (
                  <Image
                    src={optimizeCloudinaryUrl(pick.heroImage, { width: 600, crop: 'fill' })}
                    alt={pick.title}
                    fill
                    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                    className="object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-[var(--gray)] text-sm font-medium">No image</div>
                )}
              </div>
              <div className="p-5 flex-1 flex flex-col">
                {pick.vertical && (
                  <span className="text-xs font-bold uppercase tracking-wider text-[var(--green)] mb-2">
                    {pick.vertical.name}
                  </span>
                )}
                <h2 className="text-xl font-bold font-heading text-[var(--ink)] group-hover:text-[var(--green)] transition-colors mb-2 leading-snug">
                  {pick.title}
                </h2>
                {pick.excerpt && (
                  <p className="text-sm text-[var(--gray)] line-clamp-3 mb-4">{pick.excerpt}</p>
                )}
                <div className="mt-auto text-xs text-[var(--gray)] font-medium">
                  {formatDate(pick.publishDate) || formatDate(pick.createdAt)}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
