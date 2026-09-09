import { NextResponse } from 'next/server';
import { hydratePicks, BATCH_SIZE } from '@/lib/picks-server';

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const raw = searchParams.get('slugs') || '';
  const slugs = raw.split(',').map(s => s.trim()).filter(Boolean).slice(0, BATCH_SIZE);
  if (slugs.length === 0) return NextResponse.json({ sections: [] });

  const sections = await hydratePicks(slugs);
  return NextResponse.json({ sections });
}
