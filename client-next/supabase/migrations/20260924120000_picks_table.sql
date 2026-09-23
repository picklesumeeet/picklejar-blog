-- Moves the picks (listicle) system from filesystem JSON into Supabase so
-- editors can author them from /admin/picks. Mirrors the RLS pattern used
-- for public.posts: published rows are publicly readable; staff can write.

create table public.picks (
  id                     uuid primary key default gen_random_uuid(),
  title                  text not null,
  slug                   text not null unique,
  excerpt                text,
  author                 text,
  hero_image             text,
  disclosure             text,
  read_time              integer,
  primary_vertical_id    uuid references public.verticals(id) on delete set null,
  intro                  jsonb not null default '[]'::jsonb,   -- array of paragraph strings
  items                  jsonb not null default '[]'::jsonb,   -- array of { title, image, paragraphs[], proTip? }
  status                 post_status not null default 'draft',
  publish_date           timestamptz,
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now()
);

create index picks_status_publish_idx on public.picks(status, publish_date desc);
create index picks_status_vertical_created_idx on public.picks(status, primary_vertical_id, created_at desc);

create trigger picks_set_updated_at
  before update on public.picks
  for each row execute function public.set_updated_at();

alter table public.picks enable row level security;

create policy "picks_public_read"
  on public.picks for select
  using (status = 'published' or public.is_admin_or_editor());

create policy "picks_staff_write"
  on public.picks for all
  using (public.is_admin_or_editor())
  with check (public.is_admin_or_editor());