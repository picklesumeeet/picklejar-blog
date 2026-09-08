'use server';

// Server Actions for admin user management. These run on the server and use
// the service-role Supabase client to bypass RLS and call the auth admin API
// (createUser / deleteUser / updateUserById), which the anon browser client
// cannot do. Every action re-verifies the caller is an admin.

import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

async function assertAdmin() {
  const supabase = await createClient();
  const { data: { user }, error: authErr } = await supabase.auth.getUser();
  if (authErr || !user) throw new Error('Unauthorized');

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle();

  if (profile?.role !== 'admin') throw new Error('Admin only');
  return { currentUserId: user.id };
}

export async function listUsersAction() {
  await assertAdmin();
  const admin = createAdminClient();

  const { data: authList, error } = await admin.auth.admin.listUsers({ perPage: 200 });
  if (error) throw new Error(error.message);

  const ids = authList.users.map(u => u.id);
  const { data: profiles } = ids.length
    ? await admin.from('profiles').select('id, name, role, created_at').in('id', ids)
    : { data: [] };
  const profileById = new Map((profiles ?? []).map(p => [p.id, p]));

  return authList.users
    .map(u => {
      const p = profileById.get(u.id);
      return {
        _id: u.id,
        email: u.email,
        name: p?.name ?? u.email,
        role: p?.role ?? 'editor',
        createdAt: p?.created_at ?? u.created_at,
      };
    })
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}

export async function createUserAction({ email, name, password, role }) {
  await assertAdmin();
  if (!email?.trim() || !name?.trim() || !password) {
    throw new Error('Email, name, and password are required');
  }
  if (!['admin', 'editor'].includes(role)) throw new Error('Invalid role');

  const admin = createAdminClient();
  // The `handle_new_user` trigger will pick up name/role from user_metadata
  // and insert the matching profiles row atomically.
  const { data, error } = await admin.auth.admin.createUser({
    email: email.trim(),
    password,
    email_confirm: true,
    user_metadata: { name: name.trim(), role },
  });
  if (error) throw new Error(error.message);
  return { id: data.user.id };
}

export async function updateUserAction({ id, name, email, role }) {
  const { currentUserId } = await assertAdmin();
  if (!id) throw new Error('Missing id');

  const admin = createAdminClient();

  // Don't let admins downgrade their own role via this form (matches UI gate).
  if (id === currentUserId) {
    const { data: existing } = await admin.from('profiles').select('role').eq('id', id).maybeSingle();
    role = existing?.role ?? role;
  }

  if (email) {
    const { error: authErr } = await admin.auth.admin.updateUserById(id, { email });
    if (authErr) throw new Error(authErr.message);
  }

  const { error: profErr } = await admin
    .from('profiles')
    .update({ name: name?.trim(), role })
    .eq('id', id);
  if (profErr) throw new Error(profErr.message);

  return { id };
}

export async function deleteUserAction({ id }) {
  const { currentUserId } = await assertAdmin();
  if (!id) throw new Error('Missing id');
  if (id === currentUserId) throw new Error("You cannot delete your own account.");

  const admin = createAdminClient();
  // profiles.id → auth.users(id) is ON DELETE CASCADE, so the profile row
  // vanishes with the auth user. posts.author_id is ON DELETE SET NULL, so
  // any articles they authored survive but lose the byline link.
  const { error } = await admin.auth.admin.deleteUser(id);
  if (error) throw new Error(error.message);
  return { id };
}

export async function changeUserPasswordAction({ id, password }) {
  const { currentUserId } = await assertAdmin();
  if (!id) throw new Error('Missing id');
  if (id === currentUserId) throw new Error("Change your own password via account settings");
  if (!password || password.length < 8) throw new Error('Password must be at least 8 characters');

  const admin = createAdminClient();
  const { error } = await admin.auth.admin.updateUserById(id, { password });
  if (error) throw new Error(error.message);
  return { id };
}
