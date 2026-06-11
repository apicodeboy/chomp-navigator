# Tickets — in-app virtual currency

**Tickets have no real-world monetary value. They cannot be cashed out, withdrawn,
sold, transferred, or exchanged for money or prizes.** This statement is enforced
in copy ([src/lib/ticketsCopy.ts](src/lib/ticketsCopy.ts)) and shown in the store.

Tickets are **earned for free** (distance milestones), can be **bought** with real
money (Stripe), and are **spent** on character skins.

## Stack it was built on

This repo is **Expo / React Native + TypeScript** with **no prior backend or auth**.
Tickets need a server-authoritative balance, so this feature **adds Supabase**
(Postgres + Auth + Edge Functions) — the only new backend. Auth is **anonymous**
(`signInAnonymously`) so there's a stable `user_id` without a login wall.

| Concern | Where it lives |
|---|---|
| Balances, ledger, inventory, catalog | Postgres tables ([supabase/migrations](supabase/migrations/)) |
| Read-own enforcement | Row Level Security (select-own only) |
| Credit / spend / earn | `SECURITY DEFINER` RPCs (`_credit`, `spend_on_item`, `report_distance`) |
| Buy with money | Stripe Checkout + webhook ([supabase/functions](supabase/functions/)) |
| Client | [src/lib/supabase.ts](src/lib/supabase.ts), [src/store/useTickets.ts](src/store/useTickets.ts), [src/components/TicketBalance.tsx](src/components/TicketBalance.tsx) |

## Security invariants (and how they're met)

- **Server is the only source of truth.** Clients can only `SELECT` their own
  rows (RLS); there are **no** insert/update/delete policies, so no client can
  write a balance.
- **Credits are idempotent** by `(user_id, source_id)` — the ledger's unique key.
  Distance milestones use `source_id = 'milestone:<n>'`; Stripe uses the session id.
- **Debits are atomic + insufficient-funds-guarded.** `spend_on_item` locks the
  balance row `FOR UPDATE`, checks funds, debits in one transaction; concurrent
  spends can't double-spend or go negative (`balance >= 0` constraint + guard).
- **Prices are validated server-side** against `ticket_catalog`; a client-sent
  price is never trusted. `price 0` = free (records the item, skips the debit).
- **Money flow uses service credentials only.** The Stripe webhook credits via the
  service-role key in an Edge Function — never from client code.
- **Degrades gracefully.** With no `SUPABASE_URL`/`SUPABASE_ANON_KEY`, the client
  reports Tickets disabled (balance shows `—`, buys are blocked) instead of crashing.

## Earn / buy / spend

- **Earn (free):** on arrival, the app adds the trip distance to a lifetime total
  and calls `report_distance(total_meters)`. The server credits **50 Tickets per
  ~50 mi** milestone, idempotently. (Distance is client-asserted but monotonic +
  idempotent; real anti-cheat would verify trips server-side.)
- **Buy (Stripe):** store → bundle → `create-checkout` Edge Function makes a
  Checkout session (bundle price + ticket count are server-side) → user pays →
  `stripe-webhook` credits via `_credit` (idempotent by session id).
- **Spend:** store "Buy" → `spend_on_item(item_id)` → atomic debit + records the
  item to `owned_items`. Equipping a skin is a local preference.

## Setup

```bash
# 1. Supabase project → run the migration
supabase link --project-ref <your-ref>
supabase db push                       # applies supabase/migrations/*

# 2. App env (.env) — anon key is public/safe
SUPABASE_URL=https://<ref>.supabase.co
SUPABASE_ANON_KEY=<anon key>

# 3. Edge function secrets (server-only — never in the app build)
supabase secrets set \
  STRIPE_SECRET_KEY=sk_live_... \
  STRIPE_WEBHOOK_SECRET=whsec_... \
  SUPABASE_SERVICE_ROLE_KEY=<service role key> \
  SUPABASE_URL=https://<ref>.supabase.co \
  SUPABASE_ANON_KEY=<anon key>
supabase functions deploy create-checkout
supabase functions deploy stripe-webhook   # set this URL as your Stripe webhook endpoint
```

Without Supabase configured, the RN store still runs with Tickets disabled, and
the **web demo** (`web-gl-demo/`) uses a clearly-labeled **local** Ticket balance
(localStorage) — not the secure system, just to show the UX.

## Files

- `supabase/migrations/20260611000000_tickets.sql` — tables, RLS, RPCs, catalog seed
- `supabase/functions/create-checkout/index.ts`, `supabase/functions/stripe-webhook/index.ts`
- `src/lib/supabase.ts`, `src/lib/ticketsCopy.ts`
- `src/store/useTickets.ts`, `src/components/TicketBalance.tsx`
- Changed: `src/components/StoreScreen.tsx` (Tickets store), `src/components/MapScreen.tsx`
  (balance + distance reporting), `src/store/skins.ts` (ticket prices + 2 new skins),
  `App.tsx` (provider), `app.config.ts` / `.env.example` (env)
