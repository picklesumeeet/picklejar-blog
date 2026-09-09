"use client";

import { useCallback, useEffect, useRef, useState } from 'react';
import PickPageClient from './PickPageClient';

function UpNextDivider({ title }) {
  return (
    <div className="max-w-6xl mx-auto px-6 my-16">
      <div className="flex items-center gap-4 justify-center">
        <div className="flex-1 h-px bg-[var(--line)]" />
        <div className="text-center">
          <div className="text-xs font-bold tracking-widest text-[var(--gray-2)] uppercase font-sans mb-2">
            Up Next
          </div>
          <div className="text-lg md:text-xl font-serif italic text-[var(--ink)] max-w-xl">
            {title}
          </div>
        </div>
        <div className="flex-1 h-px bg-[var(--line)]" />
      </div>
    </div>
  );
}

export default function PicksStream({ initialSections, remainingSlugs, batchSize = 10 }) {
  const [sections, setSections] = useState(initialSections);
  const [queue, setQueue] = useState(remainingSlugs);
  const [loading, setLoading] = useState(false);
  const sectionRefs = useRef([]);

  const loadMore = useCallback(async () => {
    if (loading || queue.length === 0) return;
    const nextBatch = queue.slice(0, batchSize);
    setLoading(true);
    try {
      const res = await fetch(`/api/picks?slugs=${nextBatch.join(',')}`);
      if (!res.ok) throw new Error(`Failed to load batch`);
      const { sections: incoming } = await res.json();
      setSections(prev => [...prev, ...incoming]);
      setQueue(prev => prev.slice(nextBatch.length));
    } catch (err) {
      console.error('PicksStream loadMore:', err);
    } finally {
      setLoading(false);
    }
  }, [loading, queue, batchSize]);

  // URL + document.title swap when a section's title band is centered
  useEffect(() => {
    const els = sectionRefs.current.filter(Boolean);
    if (els.length === 0) return;

    const io = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        const { slug, title } = entry.target.dataset;
        if (!slug) return;
        if (window.location.pathname === `/picks/${slug}`) return;
        window.history.replaceState({}, '', `/picks/${slug}`);
        document.title = `${title} - WalletPickle`;
      });
    }, { rootMargin: '-40% 0px -55% 0px', threshold: 0 });

    els.forEach(el => io.observe(el));
    return () => io.disconnect();
  }, [sections]);

  const hasMore = queue.length > 0;

  return (
    <>
      {sections.map((data, i) => (
        <div key={data.pick.slug}>
          <div
            ref={el => { sectionRefs.current[i] = el; }}
            data-slug={data.pick.slug}
            data-title={data.pick.title}
          >
            <PickPageClient
              vertical={data.vertical}
              pick={data.pick}
              morePosts={data.morePosts}
              ads={data.ads}
              formattedDate={data.formattedDate}
            />
          </div>
          {i < sections.length - 1 && (
            <UpNextDivider title={sections[i + 1].pick.title} />
          )}
        </div>
      ))}

      <div className="max-w-6xl mx-auto px-6 py-16 border-t border-[var(--line)] mt-8 text-center">
        {hasMore ? (
          <button
            type="button"
            onClick={loadMore}
            disabled={loading}
            className="inline-block bg-[var(--green)] text-white px-8 py-4 rounded-full text-sm font-bold tracking-widest uppercase font-sans hover:bg-[var(--green-dark)] transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {loading ? 'Loading…' : 'Read More Articles'}
          </button>
        ) : (
          <p className="text-sm font-sans uppercase tracking-widest text-[var(--gray-2)]">
            You&rsquo;ve reached the end.
          </p>
        )}
      </div>
    </>
  );
}
