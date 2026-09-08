import { createClient } from '@/lib/supabase/server';

export default async function sitemap() {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
  const supabase = await createClient();

  const routes = [{ url: baseUrl, lastModified: new Date() }];

  const staticPaths = ['about', 'contact', 'press', 'careers', 'advertise', 'terms', 'privacy', 'cookies'];
  for (const path of staticPaths) {
    routes.push({ url: `${baseUrl}/${path}`, lastModified: new Date() });
  }

  const [{ data: verticals }, { data: posts }] = await Promise.all([
    supabase.from('verticals').select('slug, updated_at').eq('active', true),
    supabase
      .from('posts')
      .select('slug, updated_at, created_at, vertical:verticals(slug)')
      .eq('status', 'published')
      .limit(5000),
  ]);

  for (const v of verticals ?? []) {
    routes.push({
      url: `${baseUrl}/${v.slug}`,
      lastModified: v.updated_at ? new Date(v.updated_at) : new Date(),
    });
  }

  for (const p of posts ?? []) {
    const vSlug = p.vertical?.slug || 'vertical';
    const rawDate = p.updated_at || p.created_at;
    let date = rawDate ? new Date(rawDate) : new Date();
    if (isNaN(date.getTime())) date = new Date();
    routes.push({
      url: `${baseUrl}/${vSlug}/${p.slug}`,
      lastModified: date,
    });
  }

  return routes;
}
