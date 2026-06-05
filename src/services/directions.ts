import { MAPBOX_PUBLIC_TOKEN } from '@/config/mapbox';
import { toLine } from '@/utils/geo';
import type {
  BannerInstruction,
  NavRoute,
  Place,
  RouteStep,
  VoiceInstruction,
} from '@/types/navigation';
import type { Position } from 'geojson';

const DIRECTIONS = 'https://api.mapbox.com/directions/v5/mapbox';
// Current Geocoding API is v6 (the v5 mapbox.places endpoint is legacy).
const GEOCODE = 'https://api.mapbox.com/search/geocode/v6/forward';

/** Minimal shape of the bits of the Directions response we use. */
interface DirectionsResponse {
  code: string;
  routes: Array<{
    distance: number;
    duration: number;
    geometry: { type: 'LineString'; coordinates: Position[] };
    legs: Array<{
      steps: Array<{
        distance: number;
        maneuver: {
          instruction: string;
          type: string;
          modifier?: string;
          location: Position;
        };
        voiceInstructions?: VoiceInstruction[];
        bannerInstructions?: BannerInstruction[];
      }>;
    }>;
  }>;
}

/**
 * Fetch a driving route between two [lng, lat] points.
 *
 * Query params (per docs.mapbox.com Directions API):
 *  - geometries=geojson  → coordinates directly (no polyline decoding)
 *  - overview=full       → full-resolution geometry (accurate pellets/snapping)
 *  - steps=true          → per-step data, and unlocks the two below:
 *  - voice_instructions=true / banner_instructions=true → Mapbox's ready-made
 *      spoken + on-screen guidance, with trigger distances. We consume these
 *      instead of generating our own.
 *  - voice_units=metric  → "200 meters" phrasing (use "imperial" for miles/feet)
 *
 * Profile note: defaults to `driving-traffic` for live traffic-aware durations
 * (ETAs reflect current congestion). Use `driving` to avoid traffic rate limits.
 */
export async function fetchRoute(
  origin: Position,
  destination: Position,
  profile: 'driving' | 'driving-traffic' | 'walking' | 'cycling' = 'driving-traffic',
): Promise<NavRoute> {
  const coords = `${origin[0]},${origin[1]};${destination[0]},${destination[1]}`;
  const url =
    `${DIRECTIONS}/${profile}/${coords}` +
    `?alternatives=false&geometries=geojson&overview=full&steps=true` +
    `&voice_instructions=true&banner_instructions=true&voice_units=metric` +
    `&access_token=${MAPBOX_PUBLIC_TOKEN}`;

  const res = await fetch(url);
  if (!res.ok) throw new Error(`Directions HTTP ${res.status}`);
  const data = (await res.json()) as DirectionsResponse;
  if (data.code !== 'Ok' || !data.routes.length) {
    throw new Error(`Directions error: ${data.code}`);
  }

  const r = data.routes[0];
  // Flatten legs→steps; startDistAlong/endDistAlong are filled later in useNavigation
  // once we know cumulative distances along the whole route.
  const steps: RouteStep[] = r.legs.flatMap((leg) =>
    leg.steps.map((s) => ({
      instruction: s.maneuver.instruction,
      type: s.maneuver.type,
      modifier: s.maneuver.modifier,
      location: s.maneuver.location,
      distance: s.distance,
      voiceInstructions: s.voiceInstructions ?? [],
      bannerInstructions: s.bannerInstructions ?? [],
      startDistAlong: 0,
      endDistAlong: 0,
    })),
  );

  return {
    line: toLine(r.geometry.coordinates),
    distance: r.distance,
    duration: r.duration,
    steps,
  };
}

/** Shape of the Geocoding v6 feature fields we read. */
interface GeocodeFeature {
  id: string;
  geometry: { coordinates: Position };
  properties: {
    name?: string;
    place_formatted?: string;
    full_address?: string;
  };
}

/**
 * Forward-geocode free text to a list of place suggestions using the Geocoding v6
 * API, biased toward the user's location. Returns up to `limit` results ordered by
 * relevance — used to populate the search dropdown.
 */
export async function geocodeSuggestions(
  query: string,
  near?: Position,
  limit = 6,
): Promise<Place[]> {
  if (!query.trim()) return [];
  const proximity = near ? `&proximity=${near[0]},${near[1]}` : '';
  const url =
    `${GEOCODE}?q=${encodeURIComponent(query)}&limit=${limit}${proximity}` +
    `&autocomplete=true&access_token=${MAPBOX_PUBLIC_TOKEN}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Geocoding HTTP ${res.status}`);
  // v6 returns a GeoJSON FeatureCollection; coords are geometry.coordinates [lng,lat].
  const data = (await res.json()) as { features: GeocodeFeature[] };
  return data.features.map((f) => ({
    id: f.id,
    name: f.properties.name ?? f.properties.full_address ?? 'Unknown',
    address:
      f.properties.full_address ?? f.properties.place_formatted ?? '',
    coord: f.geometry.coordinates,
  }));
}
