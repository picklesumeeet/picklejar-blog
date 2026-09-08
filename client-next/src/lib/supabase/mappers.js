// Adapter functions that convert Supabase row shapes (snake_case, `id`) to the
// legacy MERN response shape (camelCase, `_id`) that the existing frontend
// components consume. Temporary — remove once components are normalized.

const AD_PLACEMENT_TO_LEGACY = {
  in_article: 'in-article',
  top_banner: 'top-banner',
  section_divider: 'section-divider',
};

export function mapVertical(v) {
  if (!v) return null;
  return {
    _id: v.id,
    name: v.name,
    slug: v.slug,
    active: v.active,
    featured: v.featured,
    featuredOrder: v.featured_order,
    createdAt: v.created_at,
    updatedAt: v.updated_at,
  };
}

export function mapAd(a) {
  if (!a) return null;
  return {
    _id: a.id,
    name: a.name,
    type: a.type,
    image: a.image,
    ctaText: a.cta_text,
    ctaUrl: a.cta_url,
    targetVertical: a.target_vertical_id,
    placement: AD_PLACEMENT_TO_LEGACY[a.placement] || a.placement,
    active: a.active,
    startDate: a.start_date,
    endDate: a.end_date,
    createdAt: a.created_at,
    updatedAt: a.updated_at,
  };
}

export function mapPetition(p) {
  if (!p) return null;
  return {
    _id: p.id,
    title: p.title,
    category: p.category,
    signatureCount: p.signature_count,
    goalCount: p.goal_count,
    active: p.active,
    createdAt: p.created_at,
    updatedAt: p.updated_at,
  };
}

// Posts can come from Supabase with joined `vertical:verticals(*)`, joined
// `author:profiles(*)`, and joined `ad_slot_1:ads(*)` / `ad_slot_2:ads(*)`.
// Any of those may be absent depending on the select() used.
export function mapPost(p) {
  if (!p) return null;
  return {
    _id: p.id,
    title: p.title,
    slug: p.slug,
    excerpt: p.excerpt,
    bannerImage: p.banner_image,
    body: p.body,
    author: p.author ? { _id: p.author.id, name: p.author.name } : null,
    vertical: p.vertical ? mapVertical(p.vertical) : null,
    status: p.status,
    publishDate: p.publish_date,
    readTime: p.read_time,
    editorsPick: p.editors_pick,
    isDummySeed: p.is_dummy_seed,
    adSlot1: p.ad_slot_1 ? mapAd(p.ad_slot_1) : null,
    adSlot2: p.ad_slot_2 ? mapAd(p.ad_slot_2) : null,
    createdAt: p.created_at,
    updatedAt: p.updated_at,
  };
}
