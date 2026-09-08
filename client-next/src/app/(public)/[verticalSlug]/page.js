import VerticalPageClient from '@/components/pages/VerticalPageClient';
import { notFound } from 'next/navigation';
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
  };
}

export default async function VerticalPage({ params }) {
  const { verticalSlug } = await params;
  const { vertical, posts, morePosts, hasMore } = await getVerticalData(verticalSlug);

  if (!vertical) notFound();

  return (
    <VerticalPageClient
      vertical={vertical}
      initialPosts={posts}
      initialMorePosts={morePosts}
      initialHasMore={hasMore}
    />
  );
}
