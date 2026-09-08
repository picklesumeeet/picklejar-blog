"use client";

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';

export default function Ticker() {
  const [tickerData, setTickerData] = useState([]);

  useEffect(() => {
    const supabase = createClient();
    let cancelled = false;
    (async () => {
      const { data, error } = await supabase
        .from('ticker_snapshots')
        .select('data')
        .order('fetched_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (cancelled) return;
      if (error) {
        console.error('Failed to fetch ticker data', error);
        return;
      }
      if (data?.data && Array.isArray(data.data)) {
        setTickerData(data.data);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  return (
    <div className="bg-[#1f2418] text-[#d9d8c9] overflow-hidden whitespace-nowrap border-t border-[#2b3122] font-[var(--font-ui)] text-[12px]">
      <div className="inline-flex py-[9px] animate-ticker hover:[animation-play-state:paused]">

        {/* First Set */}
        <div className="inline-flex gap-[56px] pr-[56px]">
          {tickerData.length === 0 ? (
            <span className="inline-flex items-center gap-2 opacity-90">&#8599; Loading market data...</span>
          ) : (
            tickerData.map((item, i) => (
              <span key={`1-${i}`} className={`inline-flex items-center gap-2 opacity-90 font-bold ${item.isStatic ? 'text-[#f2eee2] tracking-wider' : (item.up ? 'text-[#9fd39a]' : 'text-[#d39a9a]')}`}>
                {!item.isStatic && <span dangerouslySetInnerHTML={{ __html: item.up ? '&#8599;' : '&#8600;' }} />}
                {item.symbol} {item.change && <span className="opacity-75 font-normal">{item.change}</span>}
              </span>
            ))
          )}
        </div>

        {/* Second Set (Duplicate for seamless loop) */}
        <div className="inline-flex gap-[56px] pr-[56px]">
          {tickerData.length === 0 ? (
            <span className="inline-flex items-center gap-2 opacity-90">&#8599; Loading market data...</span>
          ) : (
            tickerData.map((item, i) => (
              <span key={`2-${i}`} className={`inline-flex items-center gap-2 opacity-90 font-bold ${item.isStatic ? 'text-[#f2eee2] tracking-wider' : (item.up ? 'text-[#9fd39a]' : 'text-[#d39a9a]')}`}>
                {!item.isStatic && <span dangerouslySetInnerHTML={{ __html: item.up ? '&#8599;' : '&#8600;' }} />}
                {item.symbol} {item.change && <span className="opacity-75 font-normal">{item.change}</span>}
              </span>
            ))
          )}
        </div>

      </div>
    </div>
  );
}
