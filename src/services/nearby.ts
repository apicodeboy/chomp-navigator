import Constants from 'expo-constants';
import { categorySearch } from '@/services/directions';
import { straightLineM } from '@/utils/geo';
import type { Place } from '@/types/navigation';
import type { Position } from 'geojson';

const MILE_M = 1609.34;

/**
 * "Nearby" feature — finds gas / food / EV / hotels near the user via our own
 * server-side proxy (the Supabase `nearby` Edge Function), so the Search token is
 * never shipped in the app. Change the default radius here in ONE place.
 */
export const RADIUS_MILES = 20;

/** Categories the Nearby feature searches (Mapbox Search Box canonical ids). */
export const NEARBY_CATEGORIES = ['gas_station', 'restaurant', 'ev_charging_station', 'hotel'] as const;
export type NearbyCategory = (typeof NEARBY_CATEGORIES)[number];

export interface NearbyPlace {
  id: string;
  name: string;
  category: string;
  coordinates: { lat: number; lng: number };
  address: string;
  distanceMiles: number;
}

const extra = Constants.expoConfig?.extra as
  | { nearbyApiUrl?: string; supabaseAnonKey?: string }
  | undefined;

// The proxy endpoint + public anon key (publishable — safe in the client). Both
// are overridable via app.config `extra` (from .env) and fall back to this
// project's values.
const PROXY_URL =
  extra?.nearbyApiUrl && extra.nearbyApiUrl.length > 0
    ? extra.nearbyApiUrl
    : 'https://sckpsqygxfujbzfkbyej.supabase.co/functions/v1/nearby';
const ANON =
  extra?.supabaseAnonKey && extra.supabaseAnonKey.length > 0
    ? extra.supabaseAnonKey
    : 'sb_publishable_Q5NAY9CV9pNHIziTPJh1eQ_Emw5Yn7R';

/**
 * Fetch nearby places from the proxy. `coord` is [lng, lat] (the app's convention).
 */
export async function fetchNearby(
  coord: Position,
  categories: readonly string[] = NEARBY_CATEGORIES,
  radius: number = RADIUS_MILES,
): Promise<NearbyPlace[]> {
  const [lng, lat] = coord;
  // Preferred path: the server-side proxy (keeps the Search token off-device).
  try {
    const url =
      `${PROXY_URL}?lat=${lat}&lng=${lng}&radius=${radius}` +
      `&categories=${encodeURIComponent(categories.join(','))}`;
    const res = await fetch(url, { headers: { apikey: ANON, Authorization: `Bearer ${ANON}` } });
    if (res.ok) {
      const data = (await res.json()) as { results?: NearbyPlace[] };
      if (Array.isArray(data.results)) return data.results;
    }
  } catch {
    // proxy unreachable — fall through
  }
  // Fallback (until the proxy is deployed): same shape, computed on-device.
  return fallbackNearby(coord, categories, radius);
}

async function fallbackNearby(
  coord: Position,
  categories: readonly string[],
  radius: number,
): Promise<NearbyPlace[]> {
  const perCategory = await Promise.all(
    categories.map(async (cat) => {
      const places = await categorySearch(cat, coord, radius);
      return places.map<NearbyPlace>((p) => ({
        id: p.id,
        name: p.name,
        category: cat,
        coordinates: { lat: p.coord[1], lng: p.coord[0] },
        address: p.address,
        distanceMiles: Math.round((straightLineM(coord, p.coord) / MILE_M) * 10) / 10,
      }));
    }),
  );
  return perCategory.flat().sort((a, b) => a.distanceMiles - b.distanceMiles);
}

/** Adapt a NearbyPlace into the app's Place shape so it flows into the routing UI. */
export function nearbyToPlace(n: NearbyPlace): Place {
  return {
    id: n.id,
    name: n.name,
    address: n.address,
    coord: [n.coordinates.lng, n.coordinates.lat],
  };
}
