// Supabase Edge Function (Deno): server-side proxy for the Mapbox Search Box
// category API. Keeps the SEARCH token off the client.
//
// Setup:
//   supabase secrets set MAPBOX_TOKEN=pk.your_search_only_token
//   supabase functions deploy nearby --no-verify-jwt
// (`--no-verify-jwt` makes it callable from the app without a user session; the
//  Supabase API gateway still requires the public anon key in the `apikey` header.)
//
// NOTE on token restriction: create a SEPARATE Mapbox public token used only here
// and URL/referrer-restrict it in the Mapbox dashboard. The map-tile token that
// @rnmapbox/maps needs must still live in the app (native SDKs require it) — that
// one should be app/bundle-restricted separately.
//
// Contract:
//   GET /nearby?lat={lat}&lng={lng}&radius={miles}&categories=gas_station,restaurant
//   -> { results: NearbyPlace[], error?: string }
//   NearbyPlace = { id, name, category, coordinates:{lat,lng}, address, distanceMiles }

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, content-type, apikey',
};

const SEARCHBOX = 'https://api.mapbox.com/search/searchbox/v1/category';
const DEFAULT_RADIUS = 20;
const MAX_RADIUS = 100;

interface NearbyPlace {
  id: string;
  name: string;
  category: string;
  coordinates: { lat: number; lng: number };
  address: string;
  distanceMiles: number;
}

/** Great-circle distance in miles. Used to clip the bbox square to a true circle. */
function haversineMiles(aLat: number, aLng: number, bLat: number, bLng: number): number {
  const R = 3958.8; // earth radius, miles
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(bLat - aLat);
  const dLng = toRad(bLng - aLng);
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(aLat)) * Math.cos(toRad(bLat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(s)));
}

const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n));

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, 'Content-Type': 'application/json' },
  });
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (req.method !== 'GET') return json({ results: [], error: 'Method not allowed' }, 405);

  const token = Deno.env.get('MAPBOX_TOKEN');
  if (!token) return json({ results: [], error: 'Server not configured (MAPBOX_TOKEN missing)' }, 500);

  const u = new URL(req.url);
  const lat = Number(u.searchParams.get('lat'));
  const lng = Number(u.searchParams.get('lng'));
  const radius = clamp(Number(u.searchParams.get('radius')) || DEFAULT_RADIUS, 0.1, MAX_RADIUS);
  const categories = (u.searchParams.get('categories') ?? 'gas_station,restaurant')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 6);

  // --- input validation ---
  if (!Number.isFinite(lat) || lat < -90 || lat > 90) return json({ results: [], error: 'Invalid lat' }, 400);
  if (!Number.isFinite(lng) || lng < -180 || lng > 180) return json({ results: [], error: 'Invalid lng' }, 400);
  if (categories.length === 0) return json({ results: [], error: 'No categories' }, 400);

  // --- bbox from radius (latDelta/lngDelta), then haversine to a true circle ---
  const latDelta = radius / 69;
  const lngDelta = radius / (69 * Math.cos((lat * Math.PI) / 180) || 1);
  const bbox = [lng - lngDelta, lat - latDelta, lng + lngDelta, lat + latDelta].join(',');

  try {
    const perCategory = await Promise.all(
      categories.map(async (cat): Promise<NearbyPlace[]> => {
        const url =
          `${SEARCHBOX}/${encodeURIComponent(cat)}` +
          `?proximity=${lng},${lat}&limit=10&language=en&bbox=${encodeURIComponent(bbox)}` +
          `&access_token=${token}`;
        const res = await fetch(url);
        if (!res.ok) return [];
        const data = await res.json();
        return (data.features ?? [])
          .map((f: any): NearbyPlace | null => {
            const c = f?.geometry?.coordinates;
            if (!Array.isArray(c)) return null;
            const [clng, clat] = c as [number, number];
            return {
              id: f?.properties?.mapbox_id ?? crypto.randomUUID(),
              name: f?.properties?.name ?? 'Place',
              category: cat,
              coordinates: { lat: clat, lng: clng },
              address:
                f?.properties?.full_address ??
                f?.properties?.address ??
                f?.properties?.place_formatted ??
                '',
              distanceMiles: Math.round(haversineMiles(lat, lng, clat, clng) * 10) / 10,
            };
          })
          .filter((x: NearbyPlace | null): x is NearbyPlace => x !== null);
      }),
    );

    const results = perCategory
      .flat()
      .filter((r) => r.distanceMiles <= radius)
      .sort((a, b) => a.distanceMiles - b.distanceMiles);

    return json({ results });
  } catch (e) {
    return json({ results: [], error: (e as Error).message }, 502);
  }
});
