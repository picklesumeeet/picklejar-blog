import VerticalPageClient from '@/components/pages/VerticalPageClient';
import { notFound } from 'next/navigation';
import { headers } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import { mapVertical, mapPost } from '@/lib/supabase/mappers';

const POST_SELECT = 'id, title, slug, excerpt, banner_image, publish_date, status, editors_pick, created_at, updated_at, vertical:verticals(id, name, slug)';

async function getVerticalData(slug) {
  const supabase = await createClient();

  const { data: rawVertical, error: vErr } = await supabase
    .from('verticals')
    .select('*')
    .eq('slug', slug)
    .eq('active', true)
    .maybeSingle();

  if (vErr) console.error('getVerticalData vertical:', vErr);
  if (!rawVertical) return { vertical: null, posts: [], morePosts: [], hasMore: false };

  const vertical = mapVertical(rawVertical);

  const { data: postsRaw, error: pErr } = await supabase
    .from('posts')
    .select(POST_SELECT)
    .eq('status', 'published')
    .eq('vertical_id', vertical._id)
    .order('created_at', { ascending: false })
    .limit(23);

  if (pErr) console.error('getVerticalData posts:', pErr);
  const allPosts = (postsRaw ?? []).map(mapPost);

  return {
    vertical,
    posts: allPosts.slice(0, 15),
    morePosts: allPosts.slice(15, 23),
    hasMore: allPosts.length >= 23,
  };
}

export async function generateMetadata({ params }) {
  const { verticalSlug } = await params;
  const { vertical } = await getVerticalData(verticalSlug);

  if (!vertical) return { title: 'Vertical Not Found | WalletPickle' };

  return {
    title: `${vertical.name} - WalletPickle`,
    description: `Read the latest stories about ${vertical.name} on WalletPickle.`,
    alternates: { canonical: `/${vertical.slug}` },
    openGraph: {
      title: `${vertical.name} - WalletPickle`,
      description: `Read the latest stories about ${vertical.name} on WalletPickle.`,
      url: `/${vertical.slug}`,
      images: [
        {
          url: 'https://walletpickle.com/logo.png',
          width: 1200,
          height: 630,
          alt: `${vertical.name} - WalletPickle`,
        }
      ],
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title: `${vertical.name} - WalletPickle`,
      description: `Read the latest stories about ${vertical.name} on WalletPickle.`,
      images: ['https://walletpickle.com/logo.png'],
    },
  };
}

export default async function VerticalPage({ params }) {
  const { verticalSlug } = await params;
  const { vertical, posts, morePosts, hasMore } = await getVerticalData(verticalSlug);

  if (!vertical) notFound();

  const nonce = (await headers()).get('x-nonce') || undefined;
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
  const verticalUrl = `${siteUrl}/${vertical.slug}`;

  const collectionLd = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: `${vertical.name} - WalletPickle`,
    description: `Read the latest stories about ${vertical.name} on WalletPickle.`,
    url: verticalUrl,
    isPartOf: { '@type': 'WebSite', name: 'WalletPickle', url: siteUrl },
    mainEntity: {
      '@type': 'ItemList',
      itemListElement: posts.slice(0, 10).map((p, i) => ({
        '@type': 'ListItem',
        position: i + 1,
        url: `${siteUrl}/${vertical.slug}/${p.slug}`,
        name: p.title,
      })),
    },
  };

  const breadcrumbLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: siteUrl },
      { '@type': 'ListItem', position: 2, name: vertical.name, item: verticalUrl },
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
      <VerticalPageClient
        vertical={vertical}
        initialPosts={posts}
        initialMorePosts={morePosts}
        initialHasMore={hasMore}
      />
    </>
  );
}
