import TrendingSection from '@/components/home/TrendingSection';
import FeaturedHeroSection from '@/components/home/FeaturedHeroSection';
import FeaturedVerticalSection from '@/components/home/FeaturedVerticalSection';
import MoreStoriesSection from '@/components/home/MoreStoriesSection';
import SectionDividerAd from '@/components/ads/SectionDividerAd';
import SportsSection from '@/components/home/SportsSection';
import { headers } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import { mapPost, mapVertical, mapAd, mapPetition } from '@/lib/supabase/mappers';

export const metadata = {
  title: 'WalletPickle',
  description: 'The latest stories, news, and trends.',
  alternates: { canonical: '/' },
  openGraph: {
    title: 'WalletPickle',
    description: 'The latest stories, news, and trends.',
    url: '/',
    images: [
      {
        url: 'https://walletpickle.com/logo.png',
        width: 1200,
        height: 630,
        alt: 'WalletPickle',
      }
    ],
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'WalletPickle',
    description: 'The latest stories, news, and trends.',
    images: ['https://walletpickle.com/logo.png'],
  },
};

// Columns needed by mapPost when we join vertical.
const POST_SELECT = 'id, title, slug, excerpt, banner_image, publish_date, status, editors_pick, created_at, updated_at, vertical:verticals(id, name, slug)';

async function getHomeData() {
  const supabase = await createClient();

  // Fire everything in parallel.
  const [
    trendingSnapshotRes,
    verticalsRes,
    petitionsRes,
    sidebarAdRes,
    dividerAdRes,
    latestPostsRes,
  ] = await Promise.all([
    supabase.from('trending_snapshots').select('post_ids').order('computed_at', { ascending: false }).limit(1).maybeSingle(),
    supabase.from('verticals').select('*').eq('active', true).order('featured_order').order('created_at', { ascending: false }),
    supabase.from('petitions').select('*').eq('active', true).order('created_at', { ascending: false }).limit(5),
    supabase.from('ads').select('*').eq('placement', 'sidebar').eq('active', true).order('created_at', { ascending: false }).limit(1),
    supabase.from('ads').select('*').eq('placement', 'section_divider').eq('active', true).order('created_at', { ascending: false }).limit(1),
    supabase.from('posts').select(POST_SELECT).eq('status', 'published').order('created_at', { ascending: false }).limit(15),
  ]);

  const allVerticals = (verticalsRes.data ?? []).map(mapVertical);
  const sportsPetitions = (petitionsRes.data ?? []).map(mapPetition);
  const sidebarAd = sidebarAdRes.data?.[0] ? mapAd(sidebarAdRes.data[0]) : null;
  const dividerAd = dividerAdRes.data?.[0] ? mapAd(dividerAdRes.data[0]) : null;
  const latestPosts = (latestPostsRes.data ?? []).map(mapPost);

  // Trending: hydrate the snapshot's post_ids array with actual post rows.
  // Falls back to latest posts if no snapshot exists yet (before cron runs).
  let trendingPosts = [];
  const snapPostIds = trendingSnapshotRes.data?.post_ids ?? [];
  if (snapPostIds.length > 0) {
    const trendingRes = await supabase
      .from('posts')
      .select(POST_SELECT)
      .in('id', snapPostIds)
      .eq('status', 'published');
    // Preserve the snapshot's ordering (Postgres IN doesn't preserve order).
    const trendingById = new Map((trendingRes.data ?? []).map(p => [p.id, p]));
    trendingPosts = snapPostIds
      .map(id => trendingById.get(id))
      .filter(Boolean)
      .map(mapPost);
  } else {
    // Fallback: use the top of latest posts until pg_cron populates trending.
    trendingPosts = latestPosts.slice(0, 5);
  }

  const trendingIds = new Set(trendingPosts.map(p => p._id));
  const moreStories = latestPosts.filter(p => !trendingIds.has(p._id)).slice(0, 7);

  const featuredVerticals = allVerticals.filter(v => v.featured);
  const sportsVertical = allVerticals.find(v => v.slug === 'sports') ?? null;
  const targetHeroVert = featuredVerticals.find(v => v.featuredOrder === 1) ?? featuredVerticals[0] ?? null;
  const targetVertSec = featuredVerticals.find(v => v.featuredOrder === 2) ?? featuredVerticals[1] ?? featuredVerticals[0] ?? null;
  const targetVertA   = featuredVerticals.find(v => v.featuredOrder === 3) ?? null;

  // Fetch per-vertical posts in parallel.
  const [heroPostsRes, vertSecPostsRes, vertAPostsRes, sportsPostsRes] = await Promise.all([
    targetHeroVert
      ? supabase.from('posts').select(POST_SELECT).eq('status', 'published').eq('vertical_id', targetHeroVert._id).order('created_at', { ascending: false }).limit(9)
      : Promise.resolve({ data: [] }),
    targetVertSec
      ? supabase.from('posts').select(POST_SELECT).eq('status', 'published').eq('vertical_id', targetVertSec._id).order('created_at', { ascending: false }).limit(7)
      : Promise.resolve({ data: [] }),
    targetVertA
      ? supabase.from('posts').select(POST_SELECT).eq('status', 'published').eq('vertical_id', targetVertA._id).order('created_at', { ascending: false }).limit(4)
      : Promise.resolve({ data: [] }),
    sportsVertical
      ? supabase.from('posts').select(POST_SELECT).eq('status', 'published').eq('vertical_id', sportsVertical._id).order('created_at', { ascending: false }).limit(7)
      : Promise.resolve({ data: [] }),
  ]);

  return {
    trending: trendingPosts,
    moreStories,
    heroVertical:    targetHeroVert ? { vertical: targetHeroVert, posts: (heroPostsRes.data ?? []).map(mapPost) } : null,
    featuredVertical: targetVertSec ? { vertical: targetVertSec, posts: (vertSecPostsRes.data ?? []).map(mapPost) } : null,
    featuredVertA:    targetVertA   ? { vertical: targetVertA,   posts: (vertAPostsRes.data ?? []).map(mapPost) } : null,
    sports: sportsVertical
      ? { vertical: sportsVertical, posts: (sportsPostsRes.data ?? []).map(mapPost), petitions: sportsPetitions }
      : null,
    ads: { sidebar: sidebarAd, sectionDivider: dividerAd },
  };
}

export default async function HomePage() {
  const homeData = await getHomeData();
  const nonce = (await headers()).get('x-nonce') || undefined;
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

  const organizationLd = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'WalletPickle',
    url: siteUrl,
    logo: {
      '@type': 'ImageObject',
      url: `${siteUrl}/logo.png`,
    },
  };

  const websiteLd = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: 'WalletPickle',
    url: siteUrl,
    potentialAction: {
      '@type': 'SearchAction',
      target: `${siteUrl}/search?q={search_term_string}`,
      'query-input': 'required name=search_term_string',
    },
  };

  return (
    <div className="max-w-[1440px] mx-auto px-6 py-10">
      <script
        type="application/ld+json"
        nonce={nonce}
        dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationLd) }}
      />
      <script
        type="application/ld+json"
        nonce={nonce}
        dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteLd) }}
      />
      <div className="flex flex-col lg:flex-row gap-12">
        <div className="flex-1 w-full">
          <TrendingSection data={homeData.trending} latestData={homeData.moreStories} adData={homeData.ads?.sidebar} />
          <FeaturedHeroSection data={homeData.heroVertical} />
          <FeaturedVerticalSection data={homeData.featuredVertical} />
          <SectionDividerAd data={homeData.ads?.sectionDivider} />
          <MoreStoriesSection data={homeData.moreStories} vertAData={homeData.featuredVertA} adData={homeData.ads?.sidebar} />
        </div>
      </div>

      <SportsSection data={homeData.sports} />
    </div>
  );
}
