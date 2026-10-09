create extension if not exists pgcrypto;

create table if not exists public.portfolios (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users (id) on delete cascade,
  full_name text not null default '',
  profile_picture_url text not null default '',
  email text not null default '',
  phone text not null default '',
  address text not null default '',
  about text not null default '',
  education jsonb not null default '[]'::jsonb,
  skills jsonb not null default '[]'::jsonb,
  projects jsonb not null default '[]'::jsonb,
  experience jsonb not null default '[]'::jsonb,
  social_links jsonb not null default '[]'::jsonb,
  template text not null default 'simple' check (template in ('simple', 'modern', 'creative')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

revoke all on table public.portfolios from anon;
grant select on table public.portfolios to anon, authenticated;
grant insert, update, delete on table public.portfolios to authenticated;

alter table public.portfolios enable row level security;

drop policy if exists "Users can read their own portfolio" on public.portfolios;
create policy "Users can read their own portfolio"
  on public.portfolios for select to authenticated using ((select auth.uid()) = user_id);

drop policy if exists "Users can create their own portfolio" on public.portfolios;
create policy "Users can create their own portfolio"
  on public.portfolios for insert to authenticated with check ((select auth.uid()) = user_id);

drop policy if exists "Users can update their own portfolio" on public.portfolios;
create policy "Users can update their own portfolio"
  on public.portfolios for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

drop policy if exists "Users can delete their own portfolio" on public.portfolios;
create policy "Users can delete their own portfolio"
  on public.portfolios for delete to authenticated using ((select auth.uid()) = user_id);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('profile-photos', 'profile-photos', true, 5242880, array['image/jpeg', 'image/png', 'image/webp', 'image/gif'])
on conflict (id) do update set public = true, file_size_limit = 5242880,
  allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

drop policy if exists "Profile photos are publicly viewable" on storage.objects;
create policy "Profile photos are publicly viewable"
  on storage.objects for select using (bucket_id = 'profile-photos');

drop policy if exists "Users can upload their own profile photos" on storage.objects;
create policy "Users can upload their own profile photos"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'profile-photos' and (storage.foldername(name))[1] = (select auth.uid())::text);

drop policy if exists "Users can update their own profile photos" on storage.objects;
create policy "Users can update their own profile photos"
  on storage.objects for update to authenticated
  using (bucket_id = 'profile-photos' and (storage.foldername(name))[1] = (select auth.uid())::text)
  with check (bucket_id = 'profile-photos' and (storage.foldername(name))[1] = (select auth.uid())::text);

drop policy if exists "Users can delete their own profile photos" on storage.objects;
create policy "Users can delete their own profile photos"
  on storage.objects for delete to authenticated
  using (bucket_id = 'profile-photos' and (storage.foldername(name))[1] = (select auth.uid())::text);
