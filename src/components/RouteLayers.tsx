import React, { useMemo } from 'react';
import Mapbox from '@rnmapbox/maps';
import { featureCollection } from '@turf/turf';
import { theme } from '@/theme';
import type { Pellet } from '@/types/navigation';

interface Props {
  /** All pellets for the whole route (pre-computed once in useNavigation). */
  pellets: Pellet[];
  /** Character's current distance-along-route, meters. */
  distAlong: number;
  /** How far ahead of the character the first visible pellet sits, meters. */
  leadM: number;
}

/**
 * Renders the route as a row of discrete pellets and "eats" the ones behind
 * the character.
 *
 * THE EATING TRICK (this is the heart of the app):
 *  - Every pellet already knows its own `distAlong` (meters from the route start),
 *    baked in when the route loaded. That array NEVER changes while driving.
 *  - We hand the whole pellet set to a single ShapeSource ONCE.
 *  - A CircleLayer `filter` then asks the GPU to draw only pellets whose
 *    distAlong is GREATER than the character's current distAlong (+ a small lead).
 *  - As the character advances, `distAlong` grows, the filter threshold rises, and
 *    pellets it has passed simply stop being drawn — they "vanish" as if eaten.
 *
 * Why a filter instead of slicing the array in JS every frame?
 *  - The filter runs natively on the GPU, so there's zero per-frame JS geometry work
 *    and no React re-render of thousands of features. We only pass a new number.
 */
export default function RouteLayers({ pellets, distAlong, leadM }: Props) {
  // Build the FeatureCollection once; it's stable for the life of the route.
  const collection = useMemo(() => featureCollection(pellets), [pellets]);

  // The single number that drives the "eating": only draw pellets ahead of here.
  const minVisible = distAlong + leadM;

  return (
    <Mapbox.ShapeSource id="pellets" shape={collection}>
      <Mapbox.CircleLayer
        id="pellet-dots"
        // ⬇️ THE EAT FILTER: keep only pellets the character hasn't reached yet.
        filter={['>', ['get', 'distAlong'], minVisible]}
        style={{
          circleRadius: 6,
          circleColor: theme.colors.accent, // orange pellets to match the theme
          circleStrokeWidth: 1.5,
          circleStrokeColor: theme.colors.characterOutline,
          circlePitchAlignment: 'map', // pellets lie flat on the ground as you tilt
          circleEmissiveStrength: 1,
        }}
      />
    </Mapbox.ShapeSource>
  );
}
