import { createClient } from '@/lib/supabase/server';

export const revalidate = 3600;

function escapeXml(str) {
  if (str == null) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

export async function GET() {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
  const supabase = await createClient();

  const { data: posts } = await supabase
    .from('posts')
    .select('title, slug, excerpt, banner_image, publish_date, created_at, updated_at, vertical:verticals(name, slug)')
    .eq('status', 'published')
    .order('publish_date', { ascending: false, nullsFirst: false })
    .order('created_at', { ascending: false })
    .limit(50);

  const items = (posts ?? [])
    .map((p) => {
      const vSlug = p.vertical?.slug;
      if (!vSlug || !p.slug) return null;
      const url = `${siteUrl}/${vSlug}/${p.slug}`;
      const pubDate = new Date(p.publish_date || p.created_at || Date.now()).toUTCString();
      const description = p.excerpt || '';
      const category = p.vertical?.name;

      return `    <item>
      <title>${escapeXml(p.title)}</title>
      <link>${escapeXml(url)}</link>
      <guid isPermaLink="true">${escapeXml(url)}</guid>
      <pubDate>${pubDate}</pubDate>
      ${category ? `<category>${escapeXml(category)}</category>` : ''}
      <description><![CDATA[${description}]]></description>${p.banner_image ? `
      <enclosure url="${escapeXml(p.banner_image)}" type="image/jpeg" />` : ''}
    </item>`;
    })
    .filter(Boolean)
    .join('\n');

  const lastBuildDate = new Date().toUTCString();

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>WalletPickle</title>
    <link>${siteUrl}</link>
    <description>The latest personal finance, money, and sports stories from WalletPickle.</description>
    <language>en-us</language>
    <lastBuildDate>${lastBuildDate}</lastBuildDate>
    <atom:link href="${siteUrl}/rss.xml" rel="self" type="application/rss+xml" />
${items}
  </channel>
</rss>`;

  return new Response(xml, {
    headers: {
      'Content-Type': 'application/rss+xml; charset=utf-8',
      'Cache-Control': 'public, max-age=3600, s-maxage=3600, stale-while-revalidate=86400',
    },
  });
}
