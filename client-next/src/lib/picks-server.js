import 'server-only';

import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { mapPost, mapAd, mapPick } from '@/lib/supabase/mappers';

const POST_SELECT = 'id, title, slug, excerpt, banner_image, publish_date, status, editors_pick, created_at, updated_at, vertical:verticals(id, name, slug)';
const PICK_SELECT = 'id, title, slug, excerpt, author, hero_image, disclosure, read_time, primary_vertical_id, intro, items, status, publish_date, created_at, updated_at, vertical:verticals!primary_vertical_id(id, name, slug, active)';

function formatDate(publishDate) {
  const d = publishDate ? new Date(publishDate) : new Date();
  return d.toLocaleDateString('en-US', {
    timeZone: 'UTC', month: 'short', day: 'numeric', year: 'numeric',
  });
}

// Card list for the /picks index page — published only, newest first.
export async function getPublishedPicks() {
  const supabase = await createClient();
  const { data } = await supabase
    .from('picks')
    .select('id, title, slug, excerpt, hero_image, publish_date, created_at, vertical:verticals!primary_vertical_id(id, name, slug)')
    .eq('status', 'published')
    .order('publish_date', { ascending: false, nullsFirst: false })
    .order('created_at', { ascending: false });
  return (data ?? []).map(mapPick);
}

// Uses the service-role client so it works from `generateStaticParams`
// (which runs at build time without a cookie/auth context).
export async function getPickSlugs() {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from('picks')
    .select('slug')
    .eq('status', 'published')
    .order('created_at', { ascending: false });
  return (data ?? []).map(row => row.slug);
}

export async function hydratePick(slug) {
  const supabase = await createClient();

  const { data: rawPick } = await supabase
    .from('picks')
    .select(PICK_SELECT)
    .eq('slug', slug)
    .eq('status', 'published')
    .maybeSingle();

  if (!rawPick) return null;

  const pick = mapPick(rawPick);
  const vertical = pick.vertical && pick.vertical.active ? pick.vertical : null;

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

export async function getUpcomingSlugs(currentSlug) {
  const slugs = await getPickSlugs();
  return slugs.filter(s => s !== currentSlug).sort();
}

export const BATCH_SIZE = 10;

export async function hydratePicks(slugs) {
  const results = await Promise.all(slugs.map(hydratePick));
  return results.filter(Boolean);
}
