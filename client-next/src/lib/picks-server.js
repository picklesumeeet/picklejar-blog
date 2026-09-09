import 'server-only';

import { createClient } from '@/lib/supabase/server';
import { mapVertical, mapPost, mapAd } from '@/lib/supabase/mappers';
import { getPick, getPickSlugs } from '@/lib/picks';

const POST_SELECT = 'id, title, slug, excerpt, banner_image, publish_date, status, editors_pick, created_at, updated_at, vertical:verticals(id, name, slug)';

function formatDate(publishDate) {
  const d = publishDate ? new Date(publishDate) : new Date();
  return d.toLocaleDateString('en-US', {
    timeZone: 'UTC', month: 'short', day: 'numeric', year: 'numeric',
  });
}

export async function hydratePick(slug) {
  const pick = getPick(slug);
  if (!pick) return null;

  const supabase = await createClient();

  let vertical = null;
  if (pick.primaryVerticalSlug) {
    const { data: rawV } = await supabase
      .from('verticals')
      .select('*')
      .eq('slug', pick.primaryVerticalSlug)
      .eq('active', true)
      .maybeSingle();
    if (rawV) vertical = mapVertical(rawV);
  }

  const [postsRes, adsRes] = await Promise.all([
    vertical
      ? supabase
          .from('posts')
          .select(POST_SELECT)
          .eq('status', 'published')
          .eq('vertical_id', vertical._id)
          .order('created_at', { ascending: false })
          .limit(4)
      : Promise.resolve({ data: [] }),
    supabase
      .from('ads')
      .select('*')
      .eq('placement', 'in_article')
      .eq('active', true)
      .or(vertical ? `target_vertical_id.is.null,target_vertical_id.eq.${vertical._id}` : 'target_vertical_id.is.null')
      .order('created_at', { ascending: true })
      .limit(2),
  ]);

  const morePosts = (postsRes.data ?? []).map(mapPost);
  const now = new Date();
  const ads = (adsRes.data ?? [])
    .filter(a => (!a.start_date || new Date(a.start_date) <= now) && (!a.end_date || new Date(a.end_date) >= now))
    .map(mapAd);

  return {
    pick,
    vertical,
    morePosts,
    ads: [ads[0] ?? null, ads[1] ?? null],
    formattedDate: formatDate(pick.publishDate),
  };
}

export function getUpcomingSlugs(currentSlug) {
  return getPickSlugs()
    .filter(s => s !== currentSlug)
    .sort();
}

export const BATCH_SIZE = 10;

export async function hydratePicks(slugs) {
  const results = await Promise.all(slugs.map(hydratePick));
  return results.filter(Boolean);
}
