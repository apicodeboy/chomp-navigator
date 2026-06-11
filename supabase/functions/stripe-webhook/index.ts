// Supabase Edge Function (Deno): Stripe webhook. On a completed checkout it
// credits the purchased Tickets via the idempotent server-side path, using the
// SERVICE ROLE key (never client credentials). Idempotent by the Stripe session
// id, so Stripe's retries can never double-credit.
import Stripe from 'https://esm.sh/stripe@16?target=deno';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, { apiVersion: '2024-06-20' });
const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET')!;

Deno.serve(async (req) => {
  const sig = req.headers.get('stripe-signature');
  const body = await req.text();

  let event: Stripe.Event;
  try {
    // Async variant required in Deno (WebCrypto).
    event = await stripe.webhooks.constructEventAsync(body, sig!, webhookSecret);
  } catch (e) {
    return new Response(`Webhook signature error: ${(e as Error).message}`, { status: 400 });
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session;
    const userId = session.metadata?.user_id;
    const tickets = parseInt(session.metadata?.tickets ?? '0', 10);

    if (userId && tickets > 0) {
      // Privileged service-role client (bypasses RLS) — only ever runs server-side.
      const admin = createClient(
        Deno.env.get('SUPABASE_URL')!,
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      );
      // _credit is idempotent by (user_id, source_id); source = Stripe session id.
      const { error } = await admin.rpc('_credit', {
        p_user: userId,
        p_delta: tickets,
        p_reason: 'purchase',
        p_source: session.id,
      });
      if (error) return new Response(`Credit error: ${error.message}`, { status: 500 });
    }
  }

  return new Response('ok', { status: 200 });
});
