// Supabase Edge Function (Deno): create a Stripe Checkout session to BUY a Ticket
// bundle. Runs server-side; the bundle catalog (and therefore the price + the
// number of Tickets granted) lives here, never on the client.
//
// Tickets have no cash value and cannot be cashed out — this only sells in-app
// currency, it never pays anything out.
import Stripe from 'https://esm.sh/stripe@16?target=deno';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, { apiVersion: '2024-06-20' });

// Server-side bundle catalog: amount in cents, tickets granted.
const BUNDLES: Record<string, { tickets: number; amount: number; name: string }> = {
  small: { tickets: 200, amount: 199, name: '200 Tickets' },
  medium: { tickets: 600, amount: 499, name: '600 Tickets' },
  large: { tickets: 1500, amount: 999, name: '1,500 Tickets' },
};

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405, headers: cors });
  try {
    // Identify the caller from their JWT (so the credit lands on the right user).
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: req.headers.get('Authorization') ?? '' } } },
    );
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return new Response('Unauthorized', { status: 401, headers: cors });

    const { bundle } = await req.json();
    const b = BUNDLES[bundle];
    if (!b) return new Response('Unknown bundle', { status: 400, headers: cors });

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      line_items: [{
        price_data: { currency: 'usd', unit_amount: b.amount, product_data: { name: b.name } },
        quantity: 1,
      }],
      success_url: (Deno.env.get('CHECKOUT_SUCCESS_URL') ?? 'https://example.com') + '?status=success',
      cancel_url: (Deno.env.get('CHECKOUT_CANCEL_URL') ?? 'https://example.com') + '?status=cancel',
      // Carried through to the webhook so the server knows who/what to credit.
      metadata: { user_id: user.id, tickets: String(b.tickets) },
    });
    return new Response(JSON.stringify({ url: session.url }), {
      headers: { ...cors, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    return new Response(`Error: ${(e as Error).message}`, { status: 500, headers: cors });
  }
});
