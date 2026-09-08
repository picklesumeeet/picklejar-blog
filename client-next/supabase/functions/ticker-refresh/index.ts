// Ticker-refresh Edge Function.
// Fetches live quotes for a few index ETFs from Alpha Vantage and writes a
// new row into `ticker_snapshots`. The public Ticker component reads the
// latest snapshot on mount.
//
// Called by pg_cron daily at 6am UTC (see the pg_cron migration).
// Auth: expects `Authorization: Bearer ${CRON_SECRET}` header — the cron
// migration inserts this exact value.
//
// Deploy:  supabase functions deploy ticker-refresh --no-verify-jwt
// Secrets: supabase secrets set ALPHA_VANTAGE_API_KEY=... CRON_SECRET=...

// deno-lint-ignore-file no-explicit-any
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL           = Deno.env.get('SUPABASE_URL')!;
const SERVICE_ROLE_KEY       = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const ALPHA_VANTAGE_API_KEY  = Deno.env.get('ALPHA_VANTAGE_API_KEY') ?? '';
const CRON_SECRET            = Deno.env.get('CRON_SECRET') ?? '';

const SYMBOLS = ['SPY', 'QQQ', 'DIA'];
const STATIC_ENTRIES = [
  { symbol: 'MARKET UPDATES',  change: 'LIVE',  up: true, isStatic: true },
  { symbol: 'LATEST STORIES',  change: 'NEW',   up: true, isStatic: true },
  { symbol: 'EXPERT ANALYSIS', change: 'DAILY', up: true, isStatic: true },
];

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

async function fetchQuote(symbol: string) {
  const url = `https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=${symbol}&apikey=${ALPHA_VANTAGE_API_KEY}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Alpha Vantage ${symbol} → ${res.status}`);
  const body = await res.json();
  const q = body['Global Quote'] ?? {};
  const changePct = q['10. change percent'] ?? '0%';
  // "1.23%" or "-0.45%" — determine up/down and format.
  const numeric = parseFloat(changePct.replace('%', '').trim()) || 0;
  return {
    symbol,
    change: numeric >= 0 ? `+${numeric.toFixed(2)}%` : `${numeric.toFixed(2)}%`,
    up: numeric >= 0,
    isStatic: false,
  };
}

Deno.serve(async (req) => {
  // Cron auth: pg_cron passes the shared CRON_SECRET as the bearer token.
  // If CRON_SECRET is not configured, refuse — better safe than open.
  const auth = req.headers.get('Authorization') ?? '';
  if (!CRON_SECRET || auth !== `Bearer ${CRON_SECRET}`) {
    return json({ error: 'Unauthorized' }, 401);
  }
  if (!ALPHA_VANTAGE_API_KEY) {
    return json({ error: 'ALPHA_VANTAGE_API_KEY not configured' }, 500);
  }

  try {
    // Fetch quotes sequentially — Alpha Vantage free tier throttles at 5/min.
    const quotes: any[] = [];
    for (const symbol of SYMBOLS) {
      try {
        quotes.push(await fetchQuote(symbol));
      } catch (err) {
        console.warn('quote failed', symbol, err);
      }
    }

    if (quotes.length === 0) {
      return json({ error: 'All quotes failed' }, 502);
    }

    // Interleave static labels between quotes for the marquee look.
    const data: any[] = [];
    quotes.forEach((q, i) => {
      data.push(q);
      const s = STATIC_ENTRIES[i % STATIC_ENTRIES.length];
      if (s) data.push(s);
    });

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
      auth: { persistSession: false },
    });
    const { data: inserted, error } = await admin
      .from('ticker_snapshots')
      .insert({ data })
      .select('id, fetched_at')
      .single();
    if (error) throw error;

    return json({ inserted_id: inserted.id, fetched_at: inserted.fetched_at, quotes: data.length });
  } catch (err) {
    console.error('ticker-refresh:', err);
    return json({ error: (err as Error).message ?? 'Internal error' }, 500);
  }
});
