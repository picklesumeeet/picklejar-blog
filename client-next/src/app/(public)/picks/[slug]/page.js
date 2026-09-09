import { notFound } from 'next/navigation';
import { headers } from 'next/headers';

import PicksStream from '@/components/pages/PicksStream';
import { getPickSlugs } from '@/lib/picks';
import { hydratePick, hydratePicks, getUpcomingSlugs, BATCH_SIZE } from '@/lib/picks-server';

export function generateStaticParams() {
  return getPickSlugs().map(slug => ({ slug }));
}

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const data = await hydratePick(slug);
  if (!data) return { title: 'Not Found | WalletPickle' };

  const { pick, vertical } = data;
  const canonicalPath = `/picks/${pick.slug}`;

  return {
    title: `${pick.title} - WalletPickle`,
    description: pick.excerpt,
    alternates: { canonical: canonicalPath },
    openGraph: {
      title: `${pick.title} - WalletPickle`,
      description: pick.excerpt,
      url: canonicalPath,
      images: [{ url: pick.heroImage || '/og-image.png', width: 1200, height: 630, alt: pick.title }],
      type: 'article',
      section: vertical?.name,
    },
    twitter: {
      card: 'summary_large_image',
      title: `${pick.title} - WalletPickle`,
      description: pick.excerpt,
      images: [pick.heroImage || '/og-image.png'],
    },
  };
}

export default async function PickPage({ params }) {
  const { slug } = await params;

  const upcomingSlugs = getUpcomingSlugs(slug);
  const initialSlugs = [slug, ...upcomingSlugs.slice(0, BATCH_SIZE - 1)];
  const remainingSlugs = upcomingSlugs.slice(BATCH_SIZE - 1);

  const initialSections = await hydratePicks(initialSlugs);
  if (initialSections.length === 0 || initialSections[0].pick.slug !== slug) notFound();

  const first = initialSections[0];
  const nonce = (await headers()).get('x-nonce') || undefined;
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
  const pageUrl = `${siteUrl}/picks/${first.pick.slug}`;

  const itemListLd = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: first.pick.title,
    url: pageUrl,
    itemListElement: first.pick.items.map((item, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: item.title,
    })),
  };

  const breadcrumbCrumbs = [
    { '@type': 'ListItem', position: 1, name: 'Home', item: siteUrl },
    { '@type': 'ListItem', position: 2, name: 'Picks', item: `${siteUrl}/picks` },
  ];
  if (first.vertical) {
    breadcrumbCrumbs.push({ '@type': 'ListItem', position: 3, name: first.vertical.name, item: `${siteUrl}/${first.vertical.slug}` });
  }
  breadcrumbCrumbs.push({
    '@type': 'ListItem',
    position: breadcrumbCrumbs.length + 1,
    name: first.pick.title,
    item: pageUrl,
  });

  const breadcrumbLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: breadcrumbCrumbs,
  };

  return (
    <>
      <script
        type="application/ld+json"
        nonce={nonce}
        dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListLd) }}
      />
      <script
        type="application/ld+json"
        nonce={nonce}
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }}
      />
      <PicksStream
        initialSections={initialSections}
        remainingSlugs={remainingSlugs}
        batchSize={BATCH_SIZE}
      />
    </>
  );
}
