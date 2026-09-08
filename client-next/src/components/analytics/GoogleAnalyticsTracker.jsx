'use client';

import { usePathname, useSearchParams } from 'next/navigation';
import { useEffect } from 'react';

// Fires a GA4 page_view event on every route change. Needed because Next.js
// client-side navigation (via next/link) doesn't reload the page, so the
// default gtag('config', ...) call only fires once — on the initial load.
export default function GoogleAnalyticsTracker({ gaId }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (!gaId || typeof window === 'undefined' || typeof window.gtag !== 'function') {
      return;
    }
    const query = searchParams?.toString();
    const page_path = query ? `${pathname}?${query}` : pathname;

    window.gtag('event', 'page_view', {
      page_path,
      page_location: window.location.href,
      page_title: document.title,
      send_to: gaId,
    });
  }, [pathname, searchParams, gaId]);

  return null;
}
