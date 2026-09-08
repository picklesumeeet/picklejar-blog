-- WalletPickle initial schema
-- Ports the 10 Mongo models to Postgres, with Supabase Auth as the identity provider.

------------------------------------------------------------
-- Extensions
------------------------------------------------------------
create extension if not exists pgcrypto;   -- gen_random_uuid()
create extension if not exists citext;     -- case-insensitive email columns

------------------------------------------------------------
-- Enums
------------------------------------------------------------
create type user_role       as enum ('admin', 'editor');
create type post_status     as enum ('draft', 'published');
create type ad_type         as enum ('sponsored', 'banner');
create type ad_placement    as enum ('homepage', 'sidebar', 'in_article', 'top_banner', 'section_divider');

------------------------------------------------------------
-- Helper functions
------------------------------------------------------------

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

------------------------------------------------------------
-- profiles (extends auth.users)
------------------------------------------------------------
create table public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  name        text not null,
  role        user_role not null default 'editor',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- Role check helpers used by RLS policies. SECURITY DEFINER so the policy
-- itself can read profiles even when the caller can't. Defined after
-- profiles so the SQL body validates.
create or replace function public.is_admin()
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

create or replace function public.is_admin_or_editor()
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role in ('admin', 'editor')
  );
$$;

-- Auto-create a profile row when a new Supabase auth user is created.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, name, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    coalesce((new.raw_user_meta_data->>'role')::user_role, 'editor')
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

------------------------------------------------------------
-- verticals
------------------------------------------------------------
create table public.verticals (
  id              uuid primary key default gen_random_uuid(),
  name            text not null,
  slug            text not null unique,
  active          boolean not null default true,
  featured        boolean not null default false,
  featured_order  integer not null default 1,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create trigger verticals_set_updated_at
  before update on public.verticals
  for each row execute function public.set_updated_at();

------------------------------------------------------------
-- ads
------------------------------------------------------------
create table public.ads (
  id                  uuid primary key default gen_random_uuid(),
  name                text not null,
  type                ad_type not null,
  image               text,
  cta_text            text,
  cta_url             text,
  target_vertical_id  uuid references public.verticals(id) on delete set null,
  placement           ad_placement not null,
  active              boolean not null default true,
  start_date          timestamptz,
  end_date            timestamptz,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

create index ads_active_placement_idx on public.ads(active, placement);
create index ads_end_date_idx on public.ads(end_date) where end_date is not null;

create trigger ads_set_updated_at
  before update on public.ads
  for each row execute function public.set_updated_at();

------------------------------------------------------------
-- posts
------------------------------------------------------------
create table public.posts (
  id             uuid primary key default gen_random_uuid(),
  title          text not null,
  slug           text not null unique,
  vertical_id    uuid not null references public.verticals(id) on delete restrict,
  excerpt        text,
  banner_image   text,
  body           jsonb not null default '{}'::jsonb,   -- Editor.js blocks
  author_id      uuid references public.profiles(id) on delete set null,
  status         post_status not null default 'draft',
  publish_date   timestamptz,
  read_time      integer,
  editors_pick   boolean not null default false,
  is_dummy_seed  boolean not null default false,
  ad_slot_1_id   uuid references public.ads(id) on delete set null,
  ad_slot_2_id   uuid references public.ads(id) on delete set null,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

-- Mirrors the two Mongo compound indexes.
create index posts_status_vertical_created_idx on public.posts(status, vertical_id, created_at desc);
create index posts_status_publish_idx on public.posts(status, publish_date desc);
create index posts_editors_pick_idx on public.posts(editors_pick) where editors_pick;

create trigger posts_set_updated_at
  before update on public.posts
  for each row execute function public.set_updated_at();

------------------------------------------------------------
-- subscribers
------------------------------------------------------------
create table public.subscribers (
  id                  uuid primary key default gen_random_uuid(),
  email               citext not null unique,
  unsubscribe_token   text unique,
  subscribed_at       timestamptz not null default now(),
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

create trigger subscribers_set_updated_at
  before update on public.subscribers
  for each row execute function public.set_updated_at();

------------------------------------------------------------
-- petitions
------------------------------------------------------------
create table public.petitions (
  id               uuid primary key default gen_random_uuid(),
  title            text not null,
  category         text not null,
  signature_count  integer not null default 0,
  goal_count       integer not null,
  active           boolean not null default true,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create trigger petitions_set_updated_at
  before update on public.petitions
  for each row execute function public.set_updated_at();

------------------------------------------------------------
-- petition_signatures
------------------------------------------------------------
create table public.petition_signatures (
  id           uuid primary key default gen_random_uuid(),
  petition_id  uuid not null references public.petitions(id) on delete cascade,
  email        citext not null,
  created_at   timestamptz not null default now(),
  unique (petition_id, email)
);

------------------------------------------------------------
-- post_views (analytics — high insert volume)
------------------------------------------------------------
create table public.post_views (
  id          bigserial primary key,
  post_id     uuid not null references public.posts(id) on delete cascade,
  timestamp   timestamptz not null default now(),
  ip_hash     text,
  is_seeded   boolean not null default false
);

create index post_views_post_time_idx on public.post_views(post_id, timestamp desc);
create index post_views_time_idx on public.post_views(timestamp);   -- for trending window scan
create index post_views_post_ip_idx on public.post_views(post_id, ip_hash) where ip_hash is not null;

------------------------------------------------------------
-- trending_snapshots
------------------------------------------------------------
create table public.trending_snapshots (
  id           uuid primary key default gen_random_uuid(),
  post_ids     uuid[] not null,
  computed_at  timestamptz not null default now()
);

create index trending_snapshots_computed_idx on public.trending_snapshots(computed_at desc);

------------------------------------------------------------
-- ticker_snapshots
------------------------------------------------------------
create table public.ticker_snapshots (
  id          uuid primary key default gen_random_uuid(),
  data        jsonb not null,
  fetched_at  timestamptz not null default now()
);

create index ticker_snapshots_fetched_idx on public.ticker_snapshots(fetched_at desc);

------------------------------------------------------------
-- Row Level Security
--
-- Strategy: enable RLS on every public table. Public (anon) role gets read
-- access to *published/active* content only. Admin/editor role (verified via
-- profiles.role) gets read+write on everything. Service role bypasses RLS
-- automatically and is what Edge Functions + Next.js server code will use
-- for privileged operations (cron writes, admin dashboard, newsletter send).
------------------------------------------------------------

alter table public.profiles              enable row level security;
alter table public.verticals             enable row level security;
alter table public.ads                   enable row level security;
alter table public.posts                 enable row level security;
alter table public.subscribers           enable row level security;
alter table public.petitions             enable row level security;
alter table public.petition_signatures   enable row level security;
alter table public.post_views            enable row level security;
alter table public.trending_snapshots    enable row level security;
alter table public.ticker_snapshots      enable row level security;

-- profiles: users read their own row; admins read all; admins update role.
create policy "profiles_self_read"
  on public.profiles for select
  using (id = auth.uid() or public.is_admin());

create policy "profiles_admin_write"
  on public.profiles for all
  using (public.is_admin())
  with check (public.is_admin());

-- verticals: public reads active ones; admin writes.
create policy "verticals_public_read"
  on public.verticals for select
  using (active or public.is_admin_or_editor());

create policy "verticals_admin_write"
  on public.verticals for all
  using (public.is_admin())
  with check (public.is_admin());

-- posts: public reads published; admin/editor read+write everything.
create policy "posts_public_read"
  on public.posts for select
  using (status = 'published' or public.is_admin_or_editor());

create policy "posts_staff_write"
  on public.posts for all
  using (public.is_admin_or_editor())
  with check (public.is_admin_or_editor());

-- ads: public reads active + within date window; admin writes.
create policy "ads_public_read"
  on public.ads for select
  using (
    (active
      and (start_date is null or start_date <= now())
      and (end_date   is null or end_date   >= now()))
    or public.is_admin()
  );

create policy "ads_admin_write"
  on public.ads for all
  using (public.is_admin())
  with check (public.is_admin());

-- subscribers: anyone can subscribe (INSERT); admin can read/delete.
create policy "subscribers_public_insert"
  on public.subscribers for insert
  with check (true);

create policy "subscribers_admin_read"
  on public.subscribers for select
  using (public.is_admin());

create policy "subscribers_admin_delete"
  on public.subscribers for delete
  using (public.is_admin());

-- petitions: public reads active; admin writes.
create policy "petitions_public_read"
  on public.petitions for select
  using (active or public.is_admin());

create policy "petitions_admin_write"
  on public.petitions for all
  using (public.is_admin())
  with check (public.is_admin());

-- petition_signatures: anyone can sign (INSERT); admin can read.
create policy "petition_signatures_public_insert"
  on public.petition_signatures for insert
  with check (true);

create policy "petition_signatures_admin_read"
  on public.petition_signatures for select
  using (public.is_admin());

-- post_views: anyone can insert a view; admin reads for analytics.
-- Trending recompute reads via service_role (bypasses RLS).
create policy "post_views_public_insert"
  on public.post_views for insert
  with check (true);

create policy "post_views_admin_read"
  on public.post_views for select
  using (public.is_admin());

-- trending_snapshots & ticker_snapshots: public read, service_role writes.
create policy "trending_snapshots_public_read"
  on public.trending_snapshots for select
  using (true);

create policy "ticker_snapshots_public_read"
  on public.ticker_snapshots for select
  using (true);
