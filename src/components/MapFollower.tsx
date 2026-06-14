import React, { useEffect, useMemo, useRef, useState } from 'react';
import Mapbox from '@rnmapbox/maps';
import { NAV } from '@/config/mapbox';
import { routeBounds } from '@/utils/geo';
import { makeRouteSampler } from '@/utils/routeSampler';
import ChomperMarker, { type ChomperSkin } from './ChomperMarker';
import type { NavProgress, NavRoute, UserFix } from '@/types/navigation';
import type { Position } from 'geojson';

interface Props {
  cameraRef: React.RefObject<React.ElementRef<typeof Mapbox.Camera>>;
  isNav: boolean;
  isPreview: boolean;
  route: NavRoute | null;
  fix: UserFix | null;
  progress: NavProgress | null;
  skin: ChomperSkin;
  /** When false (user panned away), the character keeps moving but the camera
   * stays put until they tap Re-center. */
  following: boolean;
  /** When set (a place is selected but not yet routing), the camera hovers over
   * this coordinate instead of following the user — Apple-Maps place preview. */
  focusCoord?: Position | null;
}

// How aggressively the displayed position chases the GPS-derived estimate.
// Smaller = snappier, larger = smoother/laggier. ~140ms reads as fluid.
const FOLLOW_TAU_MS = 140;
// Commit a camera + marker update at most this often (~45fps). Continuous enough
// to look native without re-rendering 60×/sec.
const COMMIT_MS = 22;
// Never dead-reckon more than this far past the last fix (s) — avoids overshoot
// if GPS stalls.
const MAX_EXTRAP_S = 2;
// Animated catch-up duration when the user taps Re-center.
const RECENTER_MS = 450;

/**
 * Owns the camera and the navigating character. While navigating it runs a
 * requestAnimationFrame loop that:
 *   1. dead-reckons the distance-along-route from the last GPS fix using speed,
 *   2. critically eases the *displayed* distance toward that estimate,
 *   3. drives BOTH the camera (imperatively) and the character marker from the
 *      same value each tick, so they stay locked and glide at ~45fps.
 *
 * Keeping this in its own component means those high-frequency updates re-render
 * only the camera + marker — not the MapView or the pellet layers.
 */
export default function MapFollower({
  cameraRef,
  isNav,
  isPreview,
  route,
  fix,
  progress,
  skin,
  following,
  focusCoord,
}: Props) {
  const sampler = useMemo(() => (route ? makeRouteSampler(route.line) : null), [route]);

  const [marker, setMarker] = useState<{ position: Position; bearing: number } | null>(null);

  // Latest measured sample from GPS (distance along + speed + capture time).
  const measured = useRef({ dist: 0, speed: 0, at: 0 });
  // The continuously-eased distance we actually render at.
  const displayDist = useRef<number | null>(null);
  const rafRef = useRef<number | null>(null);
  const lastCommit = useRef(0);
  const lastFrame = useRef(0);
  // Follow state is read inside the rAF loop via a ref so toggling it doesn't
  // restart the loop. `wasFollowing` lets us detect the false→true (Re-center)
  // edge to play one animated catch-up; `resumeUntil` holds the camera off
  // instant-driving until that animation finishes.
  const followingRef = useRef(following);
  const wasFollowing = useRef(true);
  const resumeUntil = useRef(0);
  useEffect(() => {
    followingRef.current = following;
  }, [following]);

  // Capture each new GPS-derived progress sample.
  useEffect(() => {
    if (!progress) return;
    const dist = progress.distAlong;
    const speed = Math.max(0, fix?.speed ?? 0);
    measured.current = { dist, speed, at: Date.now() };
    // Snap on the first sample or after a big jump (e.g. a reroute) so we don't
    // animate across a discontinuity.
    if (displayDist.current == null || Math.abs(dist - displayDist.current) > 60) {
      displayDist.current = dist;
    }
  }, [progress, fix]);

  // A new route invalidates the eased position.
  useEffect(() => {
    displayDist.current = null;
    setMarker(null);
  }, [sampler]);

  // The smoothing loop — only while navigating.
  useEffect(() => {
    if (!isNav || !sampler) {
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
      lastFrame.current = 0;
      return;
    }

    const tick = () => {
      const now = Date.now();
      const dtMs = lastFrame.current ? Math.min(100, now - lastFrame.current) : 16;
      lastFrame.current = now;

      const m = measured.current;
      const since = Math.min(MAX_EXTRAP_S, (now - m.at) / 1000);
      const estimate = Math.max(0, Math.min(sampler.totalM, m.dist + m.speed * since));

      if (displayDist.current == null) displayDist.current = estimate;
      // Frame-rate-independent exponential ease toward the estimate.
      const k = 1 - Math.exp(-dtMs / FOLLOW_TAU_MS);
      displayDist.current += (estimate - displayDist.current) * k;

      if (now - lastCommit.current >= COMMIT_MS) {
        lastCommit.current = now;
        const s = sampler.at(displayDist.current);
        setMarker(s); // the character always keeps moving along the route

        if (followingRef.current) {
          const target = {
            centerCoordinate: s.position,
            heading: s.bearing,
            pitch: NAV.FOLLOW_PITCH,
            zoomLevel: NAV.FOLLOW_ZOOM,
          };
          if (!wasFollowing.current) {
            // Just tapped Re-center: animate a smooth catch-up from wherever the
            // user panned to, then hand back to instant per-frame driving.
            resumeUntil.current = now + RECENTER_MS;
            cameraRef.current?.setCamera({ ...target, animationDuration: RECENTER_MS });
          } else if (now >= resumeUntil.current) {
            cameraRef.current?.setCamera({ ...target, animationDuration: 0 });
          }
          // else: inside the catch-up window — let the animation play out.
        }
        wasFollowing.current = followingRef.current;
      }
      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
      lastFrame.current = 0;
    };
  }, [isNav, sampler, cameraRef]);

  // Camera props for the non-navigating phases (the loop drives nav imperatively).
  const cameraProps =
    isPreview && route
      ? {
          bounds: {
            ...routeBounds(route.line),
            paddingTop: 120,
            paddingBottom: 260,
            paddingLeft: 60,
            paddingRight: 60,
          },
          animationDuration: 600,
        }
      : !isNav && focusCoord
        ? {
            // Hover over the selected place (place-preview step).
            centerCoordinate: focusCoord,
            zoomLevel: 15,
            animationDuration: 600,
          }
        : !isNav
          ? { followUserLocation: true, followZoomLevel: NAV.FOLLOW_ZOOM }
          : {};

  return (
    <>
      <Mapbox.Camera ref={cameraRef} {...cameraProps} />
      {isNav && marker && (
        <ChomperMarker coordinate={marker.position} rotationDeg={0} skin={skin} />
      )}
    </>
  );
}
