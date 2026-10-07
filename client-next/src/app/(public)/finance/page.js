import Link from 'next/link';
import Image from 'next/image';
import { headers } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import { mapPost, mapVertical } from '@/lib/supabase/mappers';
import { optimizeCloudinaryUrl } from '@/utils/optimizeCloudinaryUrl';
import PostTitle from '@/components/shared/Typography/PostTitle';
import PostExcerpt from '@/components/shared/Typography/PostExcerpt';

const POST_SELECT = 'id, title, slug, excerpt, banner_image, publish_date, status, editors_pick, created_at, updated_at, vertical:verticals(id, name, slug)';
const FINANCE_SLUGS = ['make-money', 'save-money', 'budget-money'];

export const metadata = {
  title: 'Money - WalletPickle',
  description: 'Everything about making, saving, and budgeting your money — the WalletPickle Money umbrella.',
  alternates: { canonical: '/finance' },
  openGraph: {
    title: 'Money - WalletPickle',
    description: 'Everything about making, saving, and budgeting your money — the WalletPickle Money umbrella.',
    url: '/finance',
    images: [{ url: '/og-image.png', width: 1200, height: 630, alt: 'Money - WalletPickle' }],
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Money - WalletPickle',
    description: 'Everything about making, saving, and budgeting your money — the WalletPickle Money umbrella.',
    images: ['/og-image.png'],
  },
};

async function getFinanceUmbrella() {
  const supabase = await createClient();

  // Look up the three sub-vertical IDs so we can fetch posts across them.
  const { data: verticals } = await supabase
    .from('verticals')
    .select('*')
    .in('slug', FINANCE_SLUGS);

  const financeVerticals = (verticals ?? []).map(mapVertical);
  const verticalIds = financeVerticals.map(v => v._id);

  if (verticalIds.length === 0) {
    return { posts: [], subVerticals: [] };
  }

  const { data: posts } = await supabase
    .from('posts')
    .select(POST_SELECT)
    .eq('status', 'published')
    .in('vertical_id', verticalIds)
    .order('publish_date', { ascending: false, nullsFirst: false })
    .order('created_at', { ascending: false })
    .limit(30);

  return {
    posts: (posts ?? []).map(mapPost),
    subVerticals: financeVerticals,
  };
}

export default async function FinanceUmbrellaPage() {
  const { posts, subVerticals } = await getFinanceUmbrella();
  const nonce = (await headers()).get('x-nonce') || undefined;
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
  const financeUrl = `${siteUrl}/finance`;

  const heroPost = posts[0];
  const gridPosts = posts.slice(1, 7);
  const listPosts = posts.slice(7, 30);

  const collectionLd = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: 'Money - WalletPickle',
    description: 'Everything about making, saving, and budgeting your money.',
    url: financeUrl,
    isPartOf: { '@type': 'WebSite', name: 'WalletPickle', url: siteUrl },
    mainEntity: {
      '@type': 'ItemList',
      itemListElement: posts.slice(0, 10).map((p, i) => ({
        '@type': 'ListItem',
        position: i + 1,
        url: `${siteUrl}/${p.vertical?.slug ?? ''}/${p.slug}`,
        name: p.title,
      })),
    },
  };

  const breadcrumbLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: siteUrl },
      { '@type': 'ListItem', position: 2, name: 'Money', item: financeUrl },
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        nonce={nonce}
        dangerouslySetInnerHTML={{ __html: JSON.stringify(collectionLd) }}
      />
      <script
        type="application/ld+json"
        nonce={nonce}
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }}
      />

      <div className="bg-white min-h-screen">
        <div className="max-w-7xl mx-auto px-6 py-12">
          <h1 className="text-5xl md:text-7xl font-bold font-serif text-[var(--ink)] text-center mb-6 tracking-tight">
            Money
          </h1>
          <p className="text-center text-[var(--gray)] max-w-2xl mx-auto mb-8">
            Everything about making, saving, and budgeting your money.
          </p>
          {subVerticals.length > 0 && (
            <div className="flex items-center justify-center gap-3 flex-wrap mb-12 pb-10 border-b-[3px] border-[var(--ink)]">
              {subVerticals.map(v => (
                <Link
                  key={v._id}
                  href={`/${v.slug}`}
                  className="text-xs font-bold tracking-widest uppercase px-4 py-2 border border-[var(--line)] rounded-full text-[var(--ink)] hover:bg-[var(--green)] hover:text-white hover:border-[var(--green)] transition-colors"
                >
                  {v.name}
                </Link>
              ))}
            </div>
          )}

          {posts.length === 0 ? (
            <div className="text-center text-[var(--gray)] py-16">More stories coming soon.</div>
          ) : (
            <>
              {/* Hero + grid */}
              <section className="mb-16">
                <div className="flex flex-col lg:flex-row gap-10">
                  {heroPost && (
                    <div className="w-full lg:w-[55%] flex flex-col lg:pr-10 lg:border-r border-[var(--line)]">
                      <Link
                        href={`/${heroPost.vertical?.slug ?? ''}/${heroPost.slug}`}
                        className="group block transition-all duration-200 ease-in-out hover:bg-gray-50 hover:shadow-md hover:scale-[1.01] rounded-xl p-4 -mx-4"
                      >
                        {heroPost.bannerImage ? (
                          <Image
                            src={optimizeCloudinaryUrl(heroPost.bannerImage, { width: 800, crop: 'fill' })}
                            alt={heroPost.title}
                            width={800}
                            height={450}
                            className="w-full aspect-[16/9] object-cover mb-4 rounded-sm"
                            priority
                          />
                        ) : (
                          <div className="w-full aspect-[16/9] bg-gray-100 border border-[var(--line)] mb-4 flex items-center justify-center text-gray-400 text-sm rounded-sm">No Image</div>
                        )}
                        {heroPost.vertical && (
                          <div className="mb-4">
                            <span className="inline-block bg-[var(--green)] text-white px-3 py-1 rounded-full text-xs font-bold tracking-wider uppercase">
                              {heroPost.vertical.name}
                            </span>
                          </div>
                        )}
                        <PostTitle title={heroPost.title} size="hero" className="mb-4 leading-tight" />
                        <PostExcerpt excerpt={heroPost.excerpt} size="large" className="text-gray-600 leading-relaxed" />
                      </Link>
                    </div>
                  )}

                  {gridPosts.length > 0 && (
                    <div className="w-full lg:w-[45%] flex flex-col">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                        {gridPosts.map(post => (
                          <Link
                            key={post._id}
                            href={`/${post.vertical?.slug ?? ''}/${post.slug}`}
                            className="group flex flex-col transition-all duration-200 ease-in-out hover:bg-gray-50 hover:shadow-md hover:scale-[1.01] rounded-xl p-3 -mx-3 -my-3"
                          >
                            {post.bannerImage ? (
                              <Image
                                src={optimizeCloudinaryUrl(post.bannerImage, { width: 400, crop: 'fill' })}
                                alt={post.title}
                                width={400}
                                height={225}
                                className="w-full aspect-video object-cover mb-3 rounded-sm"
                              />
                            ) : (
                              <div className="w-full aspect-video bg-gray-100 border border-[var(--line)] mb-3 flex items-center justify-center text-gray-400 text-xs rounded-sm">No Image</div>
                            )}
                            {post.vertical && (
                              <div className="text-[10px] tracking-wider text-[var(--green)] font-bold uppercase mb-1">
                                {post.vertical.name}
                              </div>
                            )}
                            <PostTitle title={post.title} size="small" />
                          </Link>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </section>

              {/* Dense list */}
              {listPosts.length > 0 && (
                <section className="mb-12 border-t-[3px] border-[var(--ink)] pt-8">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-12 gap-y-0">
                    {listPosts.map((post, idx) => {
                      const isLastRow = idx >= listPosts.length - (listPosts.length % 2 === 0 ? 2 : 1);
                      return (
                        <div
                          key={post._id}
                          className={`py-4 ${!isLastRow ? 'border-b border-[var(--line)]' : ''}`}
                        >
                          <Link
                            href={`/${post.vertical?.slug ?? ''}/${post.slug}`}
                            className="group flex gap-5 items-center transition-all duration-200 ease-in-out hover:bg-gray-50 hover:shadow-md hover:scale-[1.01] rounded-xl p-3 -mx-3 h-full"
                          >
                            <div className="w-[120px] shrink-0">
                              {post.bannerImage ? (
                                <Image
                                  src={optimizeCloudinaryUrl(post.bannerImage, { width: 200, crop: 'fill' })}
                                  alt={post.title}
                                  width={200}
                                  height={150}
                                  className="w-full aspect-[4/3] object-cover rounded-sm"
                                />
                              ) : (
                                <div className="w-full aspect-[4/3] bg-gray-100 border border-[var(--line)] flex items-center justify-center text-xs text-gray-400 rounded-sm">No Img</div>
                              )}
                            </div>
                            <div className="flex flex-col flex-1 min-w-0">
                              {post.vertical && (
                                <div className="text-[10px] tracking-wider text-[var(--green)] font-bold uppercase mb-1">
                                  {post.vertical.name}
                                </div>
                              )}
                              <div className="mb-2 overflow-hidden">
                                <PostTitle title={post.title} size="medium" className="line-clamp-2" />
                              </div>
                              <div className="overflow-hidden">
                                <PostExcerpt excerpt={post.excerpt} size="small" className="line-clamp-2" />
                              </div>
                            </div>
                          </Link>
                        </div>
                      );
                    })}
                  </div>
                </section>
              )}
            </>
          )}
        </div>
      </div>
    </>
  );
}
