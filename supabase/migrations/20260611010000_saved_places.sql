-- =============================================================================
-- saved_places — a user's saved/favorite destinations for the maps app.
-- Each row belongs to exactly one authenticated user (RLS + auth.uid()).
-- This is plain user-owned CRUD data, so direct insert/update/delete via RLS is
-- appropriate (unlike the Tickets tables, which guard a balance via RPCs).
-- =============================================================================

create extension if not exists pgcrypto;

create table if not exists public.saved_places (
  id         uuid primary key default gen_random_uuid(),
  -- defaults to the caller so the client never has to send user_id
  user_id    uuid not null references auth.users(id) on delete cascade default auth.uid(),
  name       text not null,
  address    text,
  lng        double precision not null,
  lat        double precision not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists saved_places_user_idx on public.saved_places (user_id, created_at desc);

-- keep updated_at fresh on every update
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end; $$;

drop trigger if exists saved_places_touch on public.saved_places;
create trigger saved_places_touch before update on public.saved_places
  for each row execute function public.touch_updated_at();

-- ----------------------------------------------------------------------------
-- Row Level Security: a user can only see and modify their OWN rows.
-- ----------------------------------------------------------------------------
alter table public.saved_places enable row level security;

create policy "saved_places select own" on public.saved_places
  for select using (auth.uid() = user_id);

create policy "saved_places insert own" on public.saved_places
  for insert with check (auth.uid() = user_id);

create policy "saved_places update own" on public.saved_places
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "saved_places delete own" on public.saved_places
  for delete using (auth.uid() = user_id);
