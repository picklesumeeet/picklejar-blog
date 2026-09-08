// Newsletter-send Edge Function.
// Invoked from the admin dashboard (Send Newsletter button on a post).
// - Verifies the caller is a signed-in admin or editor via their JWT
// - Loads the target post + all subscribers via the service-role client
// - Blasts email through Resend, with a per-recipient unsubscribe URL
//
// Deploy:   supabase functions deploy newsletter-send
// Secrets:  supabase secrets set RESEND_API_KEY=... RESEND_FROM_EMAIL=... PUBLIC_SITE_URL=...

// deno-lint-ignore-file no-explicit-any
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL          = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_ANON_KEY     = Deno.env.get('SUPABASE_ANON_KEY')!;
const SERVICE_ROLE_KEY      = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const RESEND_API_KEY        = Deno.env.get('RESEND_API_KEY')!;
const RESEND_FROM_EMAIL     = Deno.env.get('RESEND_FROM_EMAIL') ?? 'onboarding@resend.dev';
const PUBLIC_SITE_URL       = Deno.env.get('PUBLIC_SITE_URL') ?? 'https://walletpickle.com';

const RESEND_BATCH_SIZE = 100;   // Resend caps batch endpoint at 100 messages

const cors = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, 'Content-Type': 'application/json' },
  });
}

function renderEmail(post: any, unsubscribeUrl: string, articleUrl: string) {
  const banner = post.banner_image
    ? `<img src="${post.banner_image}" alt="" style="width:100%;max-width:600px;height:auto;display:block;margin-bottom:24px;border-radius:6px;"/>`
    : '';
  return `
<!doctype html>
<html><body style="margin:0;padding:24px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#f7f5ef;color:#1a1a1a;">
  <table role="presentation" cellspacing="0" cellpadding="0" width="100%" style="max-width:600px;margin:0 auto;background:#fff;padding:32px;border-radius:8px;">
    <tr><td>
      ${banner}
      <h1 style="font-family:Georgia,serif;font-size:28px;line-height:1.25;margin:0 0 16px 0;color:#111;">${escapeHtml(post.title)}</h1>
      ${post.excerpt ? `<p style="font-size:16px;line-height:1.5;color:#4a4a4a;margin:0 0 24px 0;">${escapeHtml(post.excerpt)}</p>` : ''}
      <a href="${articleUrl}" style="display:inline-block;background:#2f6b3f;color:#fff;padding:12px 24px;text-decoration:none;border-radius:4px;font-weight:600;">Read the story →</a>
      <hr style="margin:32px 0;border:none;border-top:1px solid #eee;"/>
      <p style="font-size:12px;color:#999;margin:0;">
        You're receiving this because you subscribed to WalletPickle.
        <a href="${unsubscribeUrl}" style="color:#999;">Unsubscribe</a>.
      </p>
    </td></tr>
  </table>
</body></html>`.trim();
}

function escapeHtml(s: string) {
  return String(s).replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]!));
}

async function sendBatch(messages: any[]) {
  const res = await fetch('https://api.resend.com/emails/batch', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(messages),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Resend batch failed (${res.status}): ${body}`);
  }
  return res.json();
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: cors });
  if (req.method !== 'POST')    return json({ error: 'Method not allowed' }, 405);

  try {
    // 1. Auth: bearer JWT of a signed-in admin/editor.
    const authHeader = req.headers.get('Authorization') ?? '';
    if (!authHeader.startsWith('Bearer ')) return json({ error: 'Unauthorized' }, 401);

    const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: authErr } = await userClient.auth.getUser();
    if (authErr || !user) return json({ error: 'Unauthorized' }, 401);

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
      auth: { persistSession: false },
    });

    const { data: profile } = await admin
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .maybeSingle();
    if (!profile || (profile.role !== 'admin' && profile.role !== 'editor')) {
      return json({ error: 'Forbidden' }, 403);
    }

    // 2. Parse body: { post_id }
    const { post_id } = await req.json();
    if (!post_id) return json({ error: 'post_id required' }, 400);

    // 3. Load the post + vertical (for the article URL).
    const { data: post, error: postErr } = await admin
      .from('posts')
      .select('id, title, slug, excerpt, banner_image, status, vertical:verticals(slug)')
      .eq('id', post_id)
      .maybeSingle();
    if (postErr) throw postErr;
    if (!post) return json({ error: 'Post not found' }, 404);
    if (post.status !== 'published') return json({ error: 'Post is not published' }, 400);

    const verticalSlug = (post.vertical as any)?.slug ?? 'article';
    const articleUrl   = `${PUBLIC_SITE_URL}/${verticalSlug}/${post.slug}`;

    // 4. Load all subscribers.
    const { data: subscribers, error: subErr } = await admin
      .from('subscribers')
      .select('email, unsubscribe_token');
    if (subErr) throw subErr;
    if (!subscribers || subscribers.length === 0) {
      return json({ sent: 0, message: 'No subscribers.' });
    }

    // 5. Build per-recipient messages and send in batches.
    const subject = post.title;
    const messages = subscribers.map((s) => ({
      from: RESEND_FROM_EMAIL,
      to:   [s.email],
      subject,
      html: renderEmail(
        post,
        `${PUBLIC_SITE_URL}/unsubscribe/${s.unsubscribe_token ?? ''}`,
        articleUrl,
      ),
    }));

    let sent = 0;
    const errors: string[] = [];
    for (let i = 0; i < messages.length; i += RESEND_BATCH_SIZE) {
      const chunk = messages.slice(i, i + RESEND_BATCH_SIZE);
      try {
        await sendBatch(chunk);
        sent += chunk.length;
      } catch (err) {
        errors.push((err as Error).message);
      }
    }

    return json({ sent, total: messages.length, errors });
  } catch (err) {
    console.error('newsletter-send:', err);
    return json({ error: (err as Error).message ?? 'Internal error' }, 500);
  }
});
