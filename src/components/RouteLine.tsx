import React from 'react';
import Mapbox from '@rnmapbox/maps';
import type { Feature, LineString } from 'geojson';

interface Props {
  line: Feature<LineString>;
  /** Hex color from settings. */
  color: string;
}

/**
 * Solid navigation route line (with a dark casing for contrast). Replaces the
 * pellet "dots" during navigation. Color is user-selectable in Settings.
 */
export default function RouteLine({ line, color }: Props) {
  return (
    <Mapbox.ShapeSource id="nav-route" shape={line}>
      {/* White outer casing — makes the route pop on the light map. */}
      <Mapbox.LineLayer
        id="nav-route-casing"
        style={{
          lineColor: '#ffffff',
          lineWidth: 17,
          lineCap: 'round',
          lineJoin: 'round',
        }}
      />
      {/* Glossy colored core. */}
      <Mapbox.LineLayer
        id="nav-route-line"
        style={{
          lineColor: color,
          lineWidth: 11,
          lineCap: 'round',
          lineJoin: 'round',
          lineEmissiveStrength: 1,
        }}
      />
      {/* Subtle top-light sheen for the 3D candy look. */}
      <Mapbox.LineLayer
        id="nav-route-sheen"
        style={{
          lineColor: 'rgba(255,255,255,0.35)',
          lineWidth: 3,
          lineCap: 'round',
          lineJoin: 'round',
          lineEmissiveStrength: 1,
        }}
      />
    </Mapbox.ShapeSource>
  );
}
