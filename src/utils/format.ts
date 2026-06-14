export type Units = 'mi' | 'km';

const MILE_M = 1609.34;
const FOOT_M = 0.3048;

/** Distance string in the user's chosen units. */
export function formatDistance(meters: number, units: Units): string {
  if (units === 'mi') {
    // Under ~0.1 mi, feet read better than a fractional mile.
    if (meters < 0.1 * MILE_M) {
      const ft = meters / FOOT_M;
      return `${Math.round(ft / 10) * 10} ft`;
    }
    return `${(meters / MILE_M).toFixed(1)} mi`;
  }
  if (meters < 1000) return `${Math.round(meters / 10) * 10} m`;
  return `${(meters / 1000).toFixed(1)} km`;
}

/** Human duration from seconds, e.g. "12 min" or "1h 5m". */
export function formatDuration(sec: number): string {
  const mins = Math.max(1, Math.round(sec / 60));
  return mins >= 60 ? `${Math.floor(mins / 60)}h ${mins % 60}m` : `${mins} min`;
}
