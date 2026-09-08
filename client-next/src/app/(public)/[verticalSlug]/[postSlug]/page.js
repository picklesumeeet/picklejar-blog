import PostPageClient from '@/components/pages/PostPageClient';
import { notFound } from 'next/navigation';
import { headers } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import { mapPost, mapAd } from '@/lib/supabase/mappers';

const POST_SELECT = 'id, title, slug, excerpt, banner_image, publish_date, status, editors_pick, created_at, updated_at, vertical:verticals(id, name, slug)';
const POST_FULL_SELECT = `
  id, title, slug, excerpt, banner_image, body, status, publish_date, read_time,
  editors_pick, is_dummy_seed, created_at, updated_at,
  vertical:verticals(id, name, slug),
  author:profiles(id, name),
  ad_slot_1:ads!posts_ad_slot_1_id_fkey(*),
  ad_slot_2:ads!posts_ad_slot_2_id_fkey(*)
`;

async function isStaffViewer(supabase) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle();
  return profile?.role === 'admin' || profile?.role === 'editor';
}

// Deterministic pseudo-random slot picker based on post id.
function pickInArticleAds(post, candidatePool) {
  let slot1 = post.adSlot1 || null;
  let slot2 = post.adSlot2 || null;

  const algoPool = candidatePool.filter(a => {
    if (slot1 && a._id === slot1._id) return false;
    if (slot2 && a._id === slot2._id) return false;
    return true;
  });

  let hash = 0;
  const key = String(post._id ?? '');
  for (let i = 0; i < key.length; i++) {
    hash = (hash << 5) - hash + key.charCodeAt(i);
    hash |= 0;
  }
  hash = Math.abs(hash);

  if (!slot1 && algoPool.length > 0) {
    const idx = hash % algoPool.length;
    slot1 = algoPool[idx];
    algoPool.splice(idx, 1);
  }
  if (!slot2 && algoPool.length > 0) {
    const idx = (hash + 1) % algoPool.length;
    slot2 = algoPool[idx];
  }

  // If we only had one algorithmically picked ad, duplicate it into the empty slot.
  if (!slot2 && slot1 && algoPool.length === 0 && !post.adSlot1) slot2 = slot1;
  if (!slot1 && slot2 && algoPool.length === 0 && !post.adSlot2) slot1 = slot2;

  return [slot1, slot2].filter(Boolean);
}

async function getPostData(slug) {
  const supabase = await createClient();

  const { data: rawPost, error } = await supabase
    .from('posts')
    .select(POST_FULL_SELECT)
    .eq('slug', slug)
    .maybeSingle();

  if (error) console.error('getPostData:', error);
  if (!rawPost) return null;

  const staff = await isStaffViewer(supabase);
  if (rawPost.status !== 'published' && !staff) return null;

  const post = mapPost(rawPost);
  const verticalId = post.vertical?._id;

  let relatedPosts = [];
  let inArticleAds = [];

  if (verticalId) {
    const [relatedRes, adsRes] = await Promise.all([
      supabase
        .from('posts')
        .select(POST_SELECT)
        .eq('status', 'published')
        .eq('vertical_id', verticalId)
        .neq('id', post._id)
        .order('created_at', { ascending: false })
        .limit(10),
      supabase
        .from('ads')
        .select('*')
        .eq('placement', 'in_article')
        .eq('active', true)
        .or(`target_vertical_id.is.null,target_vertical_id.eq.${verticalId}`)
        .order('created_at', { ascending: true }),
    ]);

    relatedPosts = (relatedRes.data ?? []).map(mapPost);

    const now = new Date();
    const dateOk = (a) =>
      (!a.start_date || new Date(a.start_date) <= now) &&
      (!a.end_date   || new Date(a.end_date)   >= now);
    const candidatePool = (adsRes.data ?? []).filter(dateOk).map(mapAd);

    inArticleAds = pickInArticleAds(post, candidatePool);
  }

  return { ...post, relatedPosts, inArticleAds };
}

export async function generateMetadata({ params }) {
  const { postSlug } = await params;
  const post = await getPostData(postSlug);

  if (!post) return { title: 'Post Not Found | WalletPickle' };

  return {
    title: `${post.title} - WalletPickle`,
    description: post.excerpt || `Read ${post.title} on WalletPickle`,
    openGraph: {
      title: `${post.title} - WalletPickle`,
      description: post.excerpt || `Read ${post.title} on WalletPickle`,
      images: [
        { url: post.bannerImage || 'https://walletpickle.com/logo.png' }
      ],
      type: 'article',
    },
    twitter: {
      card: 'summary_large_image',
      title: `${post.title} - WalletPickle`,
      description: post.excerpt || `Read ${post.title} on WalletPickle`,
      images: [post.bannerImage || 'https://walletpickle.com/logo.png'],
    }
  };
}

export default async function PostPage({ params }) {
  const nonce = (await headers()).get('x-nonce');
  const { postSlug } = await params;
  const post = await getPostData(postSlug);

  if (!post) notFound();

  let initialAds = [null, null];
  if (post.inArticleAds?.length >= 2) {
    initialAds = [post.inArticleAds[0], post.inArticleAds[1]];
  } else if (post.inArticleAds?.length === 1) {
    initialAds = [post.inArticleAds[0], post.inArticleAds[0]];
  }

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: post.title,
    image: post.bannerImage ? [post.bannerImage] : [],
    datePublished: post.publishDate || post.createdAt,
    dateModified: post.updatedAt || post.createdAt,
    author: {
      '@type': 'Person',
      name: post.author?.name || 'WalletPickle Editorial',
    }
  };

  return (
    <>
      <script
        type="application/ld+json"
        nonce={nonce}
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <PostPageClient
        initialData={post}
        initialRelatedPosts={post.relatedPosts || []}
        initialAds={initialAds}
      />
    </>
  );
}
