import Mapbox from '@rnmapbox/maps';
import Constants from 'expo-constants';

/**
 * Pull the PUBLIC token from app.config.ts → extra (which read it from .env).
 * If this is empty, the map will render blank — check your .env.
 */
export const MAPBOX_PUBLIC_TOKEN: string =
  (Constants.expoConfig?.extra as { mapboxPublicToken?: string } | undefined)
    ?.mapboxPublicToken ?? '';

if (!MAPBOX_PUBLIC_TOKEN) {
  // eslint-disable-next-line no-console
  console.warn(
    '[mapbox] MAPBOX_PUBLIC_TOKEN is empty. Add it to .env and rebuild (expo prebuild).',
  );
}

Mapbox.setAccessToken(MAPBOX_PUBLIC_TOKEN);

/** Tunable constants for the navigation + pellet-eating behavior. */
export const NAV = {
  /** Distance between pellets along the route, in meters. Lower = denser dots. */
  PELLET_SPACING_M: 25,
  /**
   * How far ahead of the character (in meters) the first visible pellet sits.
   * Keeps pellets from rendering *under* the chomper, so it looks like it ate them.
   */
  PELLET_LEAD_M: 12,
  /** Off-route threshold (meters). If snapped distance exceeds this, we reroute. */
  OFFROUTE_THRESHOLD_M: 40,
  /** Consecutive off-route samples required before triggering a reroute (debounce). */
  OFFROUTE_SAMPLES: 4,
  /** Camera zoom while navigating. */
  FOLLOW_ZOOM: 17,
  /** Camera pitch (tilt) for a chase-cam feel. 0 = top-down. */
  FOLLOW_PITCH: 55,
  /** Default map style — dark to match the yellow ride-app theme. */
  STYLE_URL: 'mapbox://styles/mapbox/dark-v11',
} as const;

/**
 * Selectable map styles. The first entry is the default and is always available
 * (including to signed-out users). The rest are premium and unlock only with a
 * real account — see `useMapStyle`.
 */
export interface MapStyleOption {
  id: string;
  name: string;
  url: string;
  /** Free/default styles are undefined; premium ones are gated on a real account. */
  premium?: boolean;
}

export const MAP_STYLES: MapStyleOption[] = [
  { id: 'default', name: 'Classic Dark', url: 'mapbox://styles/mapbox/dark-v11' },
  { id: 'light', name: 'Daylight', url: 'mapbox://styles/mapbox/light-v11', premium: true },
  { id: 'streets', name: 'Streets', url: 'mapbox://styles/mapbox/streets-v12', premium: true },
  { id: 'satellite', name: 'Satellite', url: 'mapbox://styles/mapbox/satellite-streets-v12', premium: true },
  { id: 'navigation', name: 'Night Nav', url: 'mapbox://styles/mapbox/navigation-night-v1', premium: true },
];

export const DEFAULT_MAP_STYLE_ID = MAP_STYLES[0].id;

export function getMapStyle(id: string): MapStyleOption {
  return MAP_STYLES.find((s) => s.id === id) ?? MAP_STYLES[0];
}
