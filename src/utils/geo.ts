import {
  along,
  bbox,
  bearing,
  featureCollection,
  length,
  lineString,
  nearestPointOnLine,
  point,
} from '@turf/turf';
import type { Feature, LineString, Position } from 'geojson';
import type { Pellet } from '@/types/navigation';

const KM = { units: 'kilometers' } as const;
const M = { units: 'meters' } as const;

/** Total length of a line, in meters. */
export function lineLengthM(line: Feature<LineString>): number {
  return length(line, KM) * 1000;
}

/**
 * Snap a raw GPS point onto the route line.
 * Returns the snapped coord, how far along the route it is (meters),
 * and how far OFF the route the raw point was (meters) — used for reroute detection.
 */
export function snapToRoute(
  line: Feature<LineString>,
  coord: Position,
): { snapped: Position; distAlongM: number; offByM: number } {
  const snap = nearestPointOnLine(line, point(coord), M);
  return {
    snapped: snap.geometry.coordinates,
    // turf returns `location` (distance along the line) in the requested units (meters here).
    distAlongM: snap.properties.location ?? 0,
    offByM: snap.properties.dist ?? 0,
  };
}

/**
 * Bearing of the route a few meters AHEAD of a given distance-along.
 * We sample slightly ahead so the character faces where it's going, not where it is.
 */
export function bearingAtDistance(
  line: Feature<LineString>,
  distAlongM: number,
  totalM: number,
): number {
  const aheadM = Math.min(distAlongM + 5, totalM);
  const here = along(line, distAlongM / 1000, KM);
  const ahead = along(line, aheadM / 1000, KM);
  return bearing(here, ahead);
}

/**
 * Pre-compute ALL pellets for the whole route, once per route.
 * Each pellet is a point with `distAlong` (meters from route start) baked in.
 *
 * The "eating" trick: we generate pellets for the ENTIRE route up front, but at render
 * time we only DRAW the ones whose distAlong is greater than the character's current
 * distAlong (plus a small lead). Pellets the character has passed are simply filtered
 * out — so they "vanish" behind it. No geometry mutation, just a cheap numeric filter.
 */
export function buildPellets(
  line: Feature<LineString>,
  spacingM: number,
): Pellet[] {
  const totalM = lineLengthM(line);
  const pellets: Pellet[] = [];
  for (let d = 0; d <= totalM; d += spacingM) {
    const p = along(line, d / 1000, KM);
    pellets.push(point(p.geometry.coordinates, { distAlong: d }) as Pellet);
  }
  return pellets;
}

/** Build a LineString feature from a raw coordinate array. */
export function toLine(coords: Position[]): Feature<LineString> {
  return lineString(coords);
}

/** Straight-line ("as the crow flies") distance between two points, in meters. */
export function straightLineM(a: Position, b: Position): number {
  return length(lineString([a, b]), KM) * 1000;
}

/**
 * Bounding box of a line as { ne, sw } corners for fitting the route preview
 * into the camera (Mapbox Camera `bounds`).
 */
export function routeBounds(line: Feature<LineString>): {
  ne: Position;
  sw: Position;
} {
  const [minX, minY, maxX, maxY] = bbox(line);
  return { ne: [maxX, maxY], sw: [minX, minY] };
}

/**
 * Combined bounding box over several lines — used to frame ALL route
 * alternatives in the preview camera so every option is visible at once.
 */
export function routesBounds(lines: Feature<LineString>[]): {
  ne: Position;
  sw: Position;
} {
  const [minX, minY, maxX, maxY] = bbox(featureCollection(lines));
  return { ne: [maxX, maxY], sw: [minX, minY] };
}

/** Point at the halfway distance along a line (a good ETA-bubble anchor). */
export function midpoint(line: Feature<LineString>): Position {
  const half = lineLengthM(line) / 2;
  return along(line, half / 1000, KM).geometry.coordinates;
}

/** First and last coordinates of a line (origin/destination markers). */
export function endpoints(line: Feature<LineString>): {
  origin: Position;
  destination: Position;
} {
  const c = line.geometry.coordinates;
  return { origin: c[0], destination: c[c.length - 1] };
}
