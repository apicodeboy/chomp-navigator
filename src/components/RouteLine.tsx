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
      <Mapbox.LineLayer
        id="nav-route-casing"
        style={{
          lineColor: 'rgba(0,0,0,0.55)',
          lineWidth: 11,
          lineCap: 'round',
          lineJoin: 'round',
        }}
      />
      <Mapbox.LineLayer
        id="nav-route-line"
        style={{
          lineColor: color,
          lineWidth: 7,
          lineCap: 'round',
          lineJoin: 'round',
          lineEmissiveStrength: 1,
        }}
      />
    </Mapbox.ShapeSource>
  );
}
