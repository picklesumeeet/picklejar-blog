"use client";

import { useState } from 'react';
import Image from 'next/image';
import { createClient } from '@/lib/supabase/client';

const DUPLICATE_EMAIL_PG_CODE = '23505';

async function subscribeEmail(email) {
  const supabase = createClient();
  const unsubscribe_token = (globalThis.crypto?.randomUUID?.() ?? Math.random().toString(36).slice(2)).replace(/-/g, '');
  const { error } = await supabase.from('subscribers').insert({ email, unsubscribe_token });
  if (error && error.code !== DUPLICATE_EMAIL_PG_CODE) throw error;
}

export default function TopNewsletterBanner({ variant = 'banner' }) {
  const isInline = variant === 'inline';
  const outerClasses = isInline
    ? 'w-full my-12 flex justify-center px-4'
    : 'w-full bg-[var(--bg-2)] flex justify-center px-4 py-6 border-b border-[var(--line)]';

  const [email, setEmail] = useState('');
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email) return;
    try {
      setLoading(true);
      setStatus('');
      await subscribeEmail(email);
      setStatus('success');
      setEmail('');
    } catch (err) {
      setStatus(err.message || 'Subscription failed');
    }
    finally {
      setLoading(false);
    }
  };

  return (
    <div className={outerClasses}>
      <div className="w-full max-w-[960px] bg-white border border-[var(--line)] rounded-lg shadow-sm overflow-hidden">
        <div className="md:grid md:grid-cols-5 flex flex-col items-stretch">
          <div className="md:col-span-3 flex items-center gap-4 px-6 py-5 md:py-6 md:border-r md:border-[var(--line)] bg-[var(--bg-2)]/40 min-w-0">
            <div className="bg-white rounded-full p-1.5 ring-1 ring-[var(--line)] shrink-0">
              <Image
                src="/logo_round.png"
                alt="WalletPickle"
                width={64}
                height={64}
                className="w-14 h-14 md:w-16 md:h-16 object-contain"
              />
            </div>
            <div className="leading-tight">
              <div className="font-[var(--font-heading)] font-black text-[var(--ink)] text-3xl md:text-4xl tracking-tight">
                Join WalletPickle!
              </div>
              <div className="font-[var(--font-ui)] text-[var(--green-dark)] text-sm md:text-base font-semibold uppercase tracking-wider mt-1.5">
                Sign up for our free newsletter
              </div>
              <div className="font-[var(--font-ui)] text-[var(--gray)] text-sm md:text-base mt-2 leading-snug">
                Money tips &amp; side-hustle guides, straight to your inbox.
              </div>
            </div>
          </div>

          <div className="md:col-span-2 flex items-center px-6 py-5 md:py-6 font-[var(--font-ui)] min-w-0">
            {status === 'success' ? (
              <div className="w-full text-center md:text-left text-[var(--green-dark)] font-bold text-base">
                Thanks for subscribing! Check your inbox soon.
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="w-full flex flex-col gap-2.5">
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Your email address"
                  aria-label="Email address"
                  className="w-full bg-[var(--bg-2)]/60 border border-[var(--line)] text-[var(--ink)] placeholder:text-[var(--gray-2)] px-4 py-3 text-base rounded-md focus:outline-none focus:border-[var(--green)] focus:bg-white transition-colors"
                />
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-[var(--green)] hover:bg-[var(--green-dark)] text-white font-bold text-base px-6 py-3 rounded-md transition-colors disabled:opacity-70 shadow-sm"
                >
                  {loading ? 'Submitting…' : 'Subscribe Now'}
                </button>
              </form>
            )}
          </div>
        </div>
        {status && status !== 'success' && (
          <div className="px-6 pb-3 text-red-600 text-xs text-center md:text-left">{status}</div>
        )}
      </div>
    </div>
  );
}