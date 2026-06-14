import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { NAV } from '@/config/mapbox';
import { fetchRoutes } from '@/services/directions';
import {
  bearingAtDistance,
  buildPellets,
  lineLengthM,
  snapToRoute,
} from '@/utils/geo';
import type {
  NavProgress,
  NavRoute,
  Pellet,
  RouteStep,
  UserFix,
} from '@/types/navigation';
import type { Position } from 'geojson';

export type NavStatus =
  | 'idle'
  | 'loading'
  | 'preview'
  | 'navigating'
  | 'arrived'
  | 'error';

/**
 * The navigation engine. Given a destination and the live GPS fix, it:
 *  1. fetches a route (with Mapbox voice + banner instructions),
 *  2. pre-computes every pellet (with its distance-along-route),
 *  3. assigns each step a start/end distance-along-route,
 *  4. on each GPS fix, snaps the user to the route, finds the current step, and
 *     recomputes progress,
 *  5. reroutes automatically when the user drifts off-route.
 *
 * Banner + voice both read from `currentStep` (the step's own Mapbox instructions).
 *
 * Flow: choosing a `destination` loads the route and enters 'preview' (route shown,
 * not tracking). Flipping `started` true begins live 'navigating'.
 */
export function useNavigation(
  destination: Position | null,
  fix: UserFix | null,
  started: boolean,
) {
  const [routes, setRoutes] = useState<NavRoute[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [pellets, setPellets] = useState<Pellet[]>([]);
  const [progress, setProgress] = useState<NavProgress | null>(null);
  const [status, setStatus] = useState<NavStatus>('idle');
  const [error, setError] = useState<string | null>(null);

  // The active route is the selected alternative.
  const route = routes[selectedIndex] ?? null;

  // Steps with cumulative start/end distance-along-route filled in (for the active route).
  const steps = useRef<RouteStep[]>([]);
  const offRouteCount = useRef(0);
  const rerouting = useRef(false);

  const totalM = useMemo(() => (route ? lineLengthM(route.line) : 0), [route]);

  // Whenever the active route changes (load or alternative switch), recompute its
  // per-step distances and pellets.
  useEffect(() => {
    if (!route) {
      steps.current = [];
      setPellets([]);
      return;
    }
    let cum = 0;
    steps.current = route.steps.map((s) => {
      const start = cum;
      cum += s.distance;
      return { ...s, startDistAlong: start, endDistAlong: cum };
    });
    setPellets(buildPellets(route.line, NAV.PELLET_SPACING_M));
  }, [route]);

  /** Load route alternatives from `origin` to `dest`. */
  const loadRoutes = useCallback(async (origin: Position, dest: Position) => {
    const rs = await fetchRoutes(origin, dest);
    setRoutes(rs);
    setSelectedIndex(0);
    return rs;
  }, []);

  /** Pick one of the alternatives (only meaningful during the preview step). */
  const selectRoute = useCallback((index: number) => {
    setSelectedIndex(index);
  }, []);

  // Initial route fetch when a destination is chosen (uses the current fix as origin).
  useEffect(() => {
    if (!destination || !fix) return;
    let cancelled = false;
    setStatus('loading');
    setError(null);
    loadRoutes(fix.coord, destination)
      .then(() => {
        if (!cancelled) setStatus('preview'); // show route options; wait for Start
      })
      .catch((e: unknown) => {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : 'route failed');
        setStatus('error');
      });
    return () => {
      cancelled = true;
    };
    // Only re-run when the destination changes, not every fix.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [destination, loadRoutes]);

  // Begin live tracking when the user taps Start (route already loaded in preview).
  useEffect(() => {
    if (started && status === 'preview') setStatus('navigating');
  }, [started, status]);

  // Recompute progress on every GPS fix while navigating.
  useEffect(() => {
    if (!route || !fix || status !== 'navigating') return;

    const { snapped, distAlongM, offByM } = snapToRoute(route.line, fix.coord);
    const distRemaining = Math.max(totalM - distAlongM, 0);

    // --- Off-route detection (debounced) ---
    if (offByM > NAV.OFFROUTE_THRESHOLD_M) {
      offRouteCount.current += 1;
      if (
        offRouteCount.current >= NAV.OFFROUTE_SAMPLES &&
        destination &&
        !rerouting.current
      ) {
        rerouting.current = true;
        offRouteCount.current = 0;
        loadRoutes(fix.coord, destination) // reroute from the REAL gps point
          .catch((e: unknown) =>
            setError(e instanceof Error ? e.message : 'reroute failed'),
          )
          .finally(() => {
            rerouting.current = false;
          });
        return;
      }
    } else {
      offRouteCount.current = 0;
    }

    // --- Current step: the step whose [start, end) span contains us. ---
    const list = steps.current;
    let idx = list.findIndex(
      (s) => distAlongM >= s.startDistAlong && distAlongM < s.endDistAlong,
    );
    if (idx === -1) idx = list.length - 1; // past the last maneuver
    const currentStep = list[idx] ?? null;
    const distToManeuver = currentStep
      ? Math.max(currentStep.endDistAlong - distAlongM, 0)
      : distRemaining;

    const bearing =
      distAlongM < totalM
        ? bearingAtDistance(route.line, distAlongM, totalM)
        : fix.heading ?? 0;

    setProgress({
      snapped,
      distAlong: distAlongM,
      distRemaining,
      bearing,
      offRouteBy: offByM,
      stepIndex: idx,
      currentStep,
      distToManeuver,
    });

    if (distRemaining < 15) setStatus('arrived');
  }, [fix, route, status, totalM, destination, loadRoutes]);

  const reset = useCallback(() => {
    setRoutes([]);
    setSelectedIndex(0);
    setPellets([]);
    setProgress(null);
    setStatus('idle');
    setError(null);
    steps.current = [];
    offRouteCount.current = 0;
  }, []);

  return { route, routes, selectedIndex, selectRoute, pellets, progress, status, error, reset };
}
