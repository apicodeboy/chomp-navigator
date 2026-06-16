import React from 'react';
import Mapbox from '@rnmapbox/maps';
import type { Feature, LineString } from 'geojson';

interface Props {
  line: Feature<LineString>;
  /** Hex color from settings. */
  color: string;
}

// Blend a #rrggbb hex toward white by `t` (0..1) — used to build a brighter
// highlight tint for the gradient sheen without a color library.
function lighten(hex: string, t: number): string {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return hex;
  const n = parseInt(m[1], 16);
  const r = (n >> 16) & 255;
  const g = (n >> 8) & 255;
  const b = n & 255;
  const mix = (c: number) => Math.round(c + (255 - c) * t);
  return `rgb(${mix(r)}, ${mix(g)}, ${mix(b)})`;
}

/**
 * Glossy, high-energy navigation route line. Built from four stacked layers for
 * depth: a soft colored glow halo, a white casing, a gradient-lit core, and a
 * bright top sheen. Color is user-selectable in Settings.
 */
export default function RouteLine({ line, color }: Props) {
  const bright = lighten(color, 0.55);

  return (
    // lineMetrics enables the line-progress gradient on the core.
    <Mapbox.ShapeSource id="nav-route" shape={line} lineMetrics>
      {/* Soft neon glow halo — wide + blurred so the route radiates light. */}
      <Mapbox.LineLayer
        id="nav-route-glow"
        style={{
          lineColor: color,
          lineWidth: 26,
          lineBlur: 14,
          lineOpacity: 0.5,
          lineCap: 'round',
          lineJoin: 'round',
          lineEmissiveStrength: 1,
        }}
      />
      {/* White outer casing — makes the route pop on the light map. */}
      <Mapbox.LineLayer
        id="nav-route-casing"
        style={{
          lineColor: '#ffffff',
          lineWidth: 18,
          lineCap: 'round',
          lineJoin: 'round',
        }}
      />
      {/* Gradient-lit core: brighter at the head, deepening toward the tail for
          a dynamic, dimensional feel. */}
      <Mapbox.LineLayer
        id="nav-route-line"
        style={{
          lineWidth: 12,
          lineCap: 'round',
          lineJoin: 'round',
          lineEmissiveStrength: 1,
          lineGradient: [
            'interpolate',
            ['linear'],
            ['line-progress'],
            0, color,
            0.5, bright,
            1, color,
          ],
        }}
      />
      {/* Bright top-light sheen for the glossy 3D candy look. */}
      <Mapbox.LineLayer
        id="nav-route-sheen"
        style={{
          lineColor: 'rgba(255,255,255,0.55)',
          lineWidth: 3,
          lineCap: 'round',
          lineJoin: 'round',
          lineEmissiveStrength: 1,
        }}
      />
    </Mapbox.ShapeSource>
  );
}
