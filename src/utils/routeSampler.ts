import type { Feature, LineString, Position } from 'geojson';

/**
 * A precomputed lookup over a route line so we can ask "where am I at distance D
 * along the route?" up to 60×/second without any Turf work on the JS thread.
 *
 * On construction we walk the line once and store the cumulative distance to each
 * vertex. `at(d)` then binary-searches that table (O(log n)) and linearly
 * interpolates inside the bracketing segment. This is what lets the character and
 * camera move continuously (smooth, Apple-Maps-style) instead of teleporting once
 * per GPS fix.
 */
export interface RouteSampler {
  totalM: number;
  at(distM: number): { position: Position; bearing: number };
}

const EARTH_M = 6371000;
const toRad = (d: number) => (d * Math.PI) / 180;
const toDeg = (r: number) => (r * 180) / Math.PI;

function haversine(a: Position, b: Position): number {
  const dLat = toRad(b[1] - a[1]);
  const dLng = toRad(b[0] - a[0]);
  const lat1 = toRad(a[1]);
  const lat2 = toRad(b[1]);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_M * Math.asin(Math.min(1, Math.sqrt(h)));
}

function bearingBetween(a: Position, b: Position): number {
  const lat1 = toRad(a[1]);
  const lat2 = toRad(b[1]);
  const dLng = toRad(b[0] - a[0]);
  const y = Math.sin(dLng) * Math.cos(lat2);
  const x =
    Math.cos(lat1) * Math.sin(lat2) -
    Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLng);
  return (toDeg(Math.atan2(y, x)) + 360) % 360;
}

export function makeRouteSampler(line: Feature<LineString>): RouteSampler {
  const coords = line.geometry.coordinates;
  // Cumulative distance (m) from the start of the line to each vertex.
  const cum: number[] = [0];
  for (let i = 1; i < coords.length; i++) {
    cum.push(cum[i - 1] + haversine(coords[i - 1], coords[i]));
  }
  const totalM = cum[cum.length - 1] ?? 0;

  // Position at distance `d` (clamped), linearly interpolated within a segment.
  function positionAt(d: number): Position {
    if (coords.length < 2) return coords[0] ?? [0, 0];
    const dist = Math.max(0, Math.min(d, totalM));
    // Largest vertex index whose cumulative distance is <= dist.
    let lo = 0;
    let hi = cum.length - 1;
    while (lo < hi) {
      const mid = (lo + hi + 1) >> 1;
      if (cum[mid] <= dist) lo = mid;
      else hi = mid - 1;
    }
    const i = Math.min(lo, coords.length - 2);
    const segLen = (cum[i + 1] - cum[i]) || 1;
    const t = Math.max(0, Math.min(1, (dist - cum[i]) / segLen));
    const a = coords[i];
    const b = coords[i + 1];
    return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
  }

  function at(distM: number): { position: Position; bearing: number } {
    const position = positionAt(distM);
    // Sample a few meters ahead for a stable, route-aligned heading (matches the
    // old bearingAtDistance behavior).
    const aheadD = Math.min(distM + 5, totalM);
    const ahead = positionAt(aheadD);
    const bearing =
      aheadD > distM ? bearingBetween(position, ahead) : bearingBetween(positionAt(distM - 5), position);
    return { position, bearing };
  }

  return { totalM, at };
}
