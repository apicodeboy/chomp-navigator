-- =============================================================================
-- Tickets — in-app virtual currency for Chomp Navigator.
--
-- Tickets have NO real-world monetary value. They can be EARNED for free
-- (distance milestones) and BOUGHT with real money (Stripe), and SPENT on in-app
-- items (character skins). Tickets cannot be cashed out, withdrawn, sold,
-- transferred, or exchanged for money or prizes.
--
-- Security model:
--   * The server (this database) is the single source of truth for balances.
--   * Clients may only READ their own rows (RLS). They may NOT write balances,
--     ledger, items, or progress directly.
--   * All mutations happen in SECURITY DEFINER functions that derive the user
--     from auth.uid() (client paths) or run under the service role (Stripe).
--   * Credits are idempotent by (user_id, source_id) via the ledger unique key.
--   * Debits are atomic and guarded against insufficient funds.
-- =============================================================================

create extension if not exists pgcrypto;

-- Server-side price catalog — the ONLY source of truth for item prices (Tickets).
create table if not exists public.ticket_catalog (
  item_id text primary key,
  kind    text    not null default 'skin',
  price   integer not null check (price >= 0),
  active  boolean not null default true
);

-- Per-user balance.
create table if not exists public.ticket_balances (
  user_id    uuid primary key references auth.users(id) on delete cascade,
  balance    integer not null default 0 check (balance >= 0),
  updated_at timestamptz not null default now()
);

-- Append-only ledger. (user_id, source_id) makes every credit idempotent.
create table if not exists public.ticket_ledger (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid    not null references auth.users(id) on delete cascade,
  delta      integer not null,
  reason     text    not null,
  source_id  text    not null,
  created_at timestamptz not null default now(),
  unique (user_id, source_id)
);

-- Owned items (inventory).
create table if not exists public.owned_items (
  user_id     uuid not null references auth.users(id) on delete cascade,
  item_id     text not null,
  acquired_at timestamptz not null default now(),
  primary key (user_id, item_id)
);

-- Monotonic lifetime distance, for milestone earning.
create table if not exists public.user_progress (
  user_id      uuid primary key references auth.users(id) on delete cascade,
  total_meters bigint not null default 0 check (total_meters >= 0),
  updated_at   timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- Row Level Security: READ-OWN only; no direct writes from clients.
-- ----------------------------------------------------------------------------
alter table public.ticket_balances enable row level security;
alter table public.ticket_ledger   enable row level security;
alter table public.owned_items     enable row level security;
alter table public.user_progress   enable row level security;
alter table public.ticket_catalog  enable row level security;

create policy "read own balance"  on public.ticket_balances for select using (auth.uid() = user_id);
create policy "read own ledger"   on public.ticket_ledger   for select using (auth.uid() = user_id);
create policy "read own items"    on public.owned_items     for select using (auth.uid() = user_id);
create policy "read own progress" on public.user_progress   for select using (auth.uid() = user_id);
create policy "read catalog"      on public.ticket_catalog  for select using (active);
-- No INSERT/UPDATE/DELETE policies are defined, so clients cannot write directly.

-- ----------------------------------------------------------------------------
-- Internal credit helper. Idempotent by (user_id, source_id). Positive deltas
-- only. Not exposed to clients — used by report_distance() and the Stripe
-- webhook (service role).
-- ----------------------------------------------------------------------------
create or replace function public._credit(
  p_user uuid, p_delta integer, p_reason text, p_source text
) returns integer
language plpgsql security definer set search_path = public as $$
declare v_balance integer;
begin
  if p_delta <= 0 then raise exception 'credit must be positive'; end if;

  insert into public.ticket_ledger(user_id, delta, reason, source_id)
  values (p_user, p_delta, p_reason, p_source)
  on conflict (user_id, source_id) do nothing;

  if not found then
    -- Already credited for this source_id → no double-credit.
    select coalesce(balance, 0) into v_balance
      from public.ticket_balances where user_id = p_user;
    return coalesce(v_balance, 0);
  end if;

  insert into public.ticket_balances(user_id, balance) values (p_user, p_delta)
  on conflict (user_id) do update
    set balance = public.ticket_balances.balance + p_delta, updated_at = now();

  select balance into v_balance from public.ticket_balances where user_id = p_user;
  return v_balance;
end; $$;

revoke all on function public._credit(uuid, integer, text, text) from public, anon, authenticated;
grant execute on function public._credit(uuid, integer, text, text) to service_role;

-- ----------------------------------------------------------------------------
-- Earn: distance milestones. Client reports its monotonic lifetime distance;
-- the server credits Tickets for each newly crossed milestone, idempotently
-- (source_id = 'milestone:<n>'). Distance is client-asserted but monotonic and
-- idempotent — a real anti-cheat layer would verify trips server-side.
-- ----------------------------------------------------------------------------
create or replace function public.report_distance(p_total_meters bigint)
returns integer
language plpgsql security definer set search_path = public as $$
declare
  v_user uuid := auth.uid();
  v_step constant bigint   := 80467;  -- ~50 miles per milestone
  v_reward constant integer := 50;    -- Tickets per milestone
  v_old bigint; m_old integer; m_new integer; i integer; v_balance integer;
begin
  if v_user is null then raise exception 'not authenticated'; end if;

  insert into public.user_progress(user_id, total_meters) values (v_user, 0)
  on conflict (user_id) do nothing;

  select total_meters into v_old from public.user_progress
    where user_id = v_user for update;

  if p_total_meters <= v_old then
    return coalesce((select balance from public.ticket_balances where user_id = v_user), 0);
  end if;

  update public.user_progress set total_meters = p_total_meters, updated_at = now()
    where user_id = v_user;

  m_old := floor(v_old / v_step);
  m_new := floor(p_total_meters / v_step);
  v_balance := coalesce((select balance from public.ticket_balances where user_id = v_user), 0);

  for i in (m_old + 1)..m_new loop
    v_balance := public._credit(v_user, v_reward, 'distance_milestone', 'milestone:' || i::text);
  end loop;

  return v_balance;
end; $$;

grant execute on function public.report_distance(bigint) to authenticated;

-- ----------------------------------------------------------------------------
-- Spend: atomic debit validated against the server catalog. Rejects on
-- insufficient funds; no negative balances, no double-spend (balance row is
-- locked FOR UPDATE to serialize concurrent spends). price 0 = free (no debit,
-- still records the item). Already-owned is a no-op.
-- ----------------------------------------------------------------------------
create or replace function public.spend_on_item(p_item text)
returns json
language plpgsql security definer set search_path = public as $$
declare
  v_user uuid := auth.uid();
  v_price integer; v_balance integer;
begin
  if v_user is null then raise exception 'not authenticated'; end if;

  -- Serialize this user's spends (lock balance row if it exists).
  perform 1 from public.ticket_balances where user_id = v_user for update;

  if exists (select 1 from public.owned_items where user_id = v_user and item_id = p_item) then
    return json_build_object('ok', true, 'already_owned', true,
      'balance', coalesce((select balance from public.ticket_balances where user_id = v_user), 0));
  end if;

  -- Server-side price — never trust a client-sent price.
  select price into v_price from public.ticket_catalog where item_id = p_item and active;
  if v_price is null then raise exception 'unknown_item'; end if;

  if v_price > 0 then
    select coalesce(balance, 0) into v_balance from public.ticket_balances where user_id = v_user;
    if coalesce(v_balance, 0) < v_price then
      return json_build_object('ok', false, 'error', 'insufficient_funds',
        'balance', coalesce(v_balance, 0));
    end if;
    update public.ticket_balances set balance = balance - v_price, updated_at = now()
      where user_id = v_user;
    insert into public.ticket_ledger(user_id, delta, reason, source_id)
      values (v_user, -v_price, 'spend', 'spend:' || p_item || ':' || gen_random_uuid()::text);
  end if;

  insert into public.owned_items(user_id, item_id) values (v_user, p_item)
    on conflict do nothing;

  return json_build_object('ok', true, 'item', p_item,
    'balance', coalesce((select balance from public.ticket_balances where user_id = v_user), 0));
end; $$;

grant execute on function public.spend_on_item(text) to authenticated;

-- ----------------------------------------------------------------------------
-- Seed catalog (Ticket prices). Free items have price 0.
-- ----------------------------------------------------------------------------
insert into public.ticket_catalog(item_id, kind, price) values
  ('classic', 'skin', 0),
  ('mint',    'skin', 150),
  ('grape',   'skin', 150),
  ('coral',   'skin', 200),
  ('sky',     'skin', 150),
  ('lime',    'skin', 200),
  ('oni',     'skin', 350),
  ('warpaint','skin', 300),
  ('bronze',     'skin', 400),
  ('noir',       'skin', 450),
  ('klavan',     'skin', 600),
  ('rouge',      'skin', 500),
  ('toxicopp',   'skin', 650),
  ('crosshair',  'skin', 600)
on conflict (item_id) do update set price = excluded.price, active = true;
