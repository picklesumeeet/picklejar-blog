"use client";

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { createClient } from '@/lib/supabase/client';
import { mapAd } from '@/lib/supabase/mappers';
import { optimizeCloudinaryUrl } from '../../utils/optimizeCloudinaryUrl';

export default function TopAdBanner() {
  const [ad, setAd] = useState(null);

  useEffect(() => {
    const supabase = createClient();
    let cancelled = false;
    (async () => {
      const { data, error } = await supabase
        .from('ads')
        .select('*')
        .eq('placement', 'top_banner')
        .eq('active', true)
        .order('created_at', { ascending: false })
        .limit(1);
      if (cancelled) return;
      if (error) {
        console.error('Failed to load top banner ad:', error);
        return;
      }
      // Date-window filter in JS — Supabase's `.or()` chaining is awkward for
      // "column-is-null OR column-<comparison>" pairs across two columns.
      const now = new Date();
      const winner = (data || []).find(a =>
        (!a.start_date || new Date(a.start_date) <= now) &&
        (!a.end_date   || new Date(a.end_date)   >= now)
      );
      if (winner) setAd(mapAd(winner));
    })();
    return () => { cancelled = true; };
  }, []);

  return (
    <div className="w-full bg-[var(--bg-2)] flex justify-center py-4 border-b border-[var(--line)]">
      <div className="w-full max-w-[970px] h-[150px]">
        {ad ? (
          <a href={ad.ctaUrl || '#'} target="_blank" rel="noreferrer" className="block w-full h-full">
            {ad.image ? (
              <Image src={optimizeCloudinaryUrl(ad.image, { width: 970, crop: 'fill' })} alt={ad.ctaText || 'Advertisement'} width={970} height={150} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full bg-[#82c6b4] flex items-center justify-center text-white font-bold text-lg">
                {ad.ctaText || 'Advertisement'}
              </div>
            )}
          </a>
        ) : (
          <div className="w-full h-full border-2 border-dashed border-[var(--gray-2)] flex items-center justify-center text-[var(--gray-2)] bg-[var(--bg)]">
            <span className="font-bold text-sm tracking-widest uppercase">AD SPACE — 970×150</span>
          </div>
        )}
      </div>
    </div>
  );
}
