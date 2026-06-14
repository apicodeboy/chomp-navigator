import React from 'react';
import { StyleSheet, View } from 'react-native';
import Mapbox from '@rnmapbox/maps';
import { featureCollection } from '@turf/turf';
import { endpoints } from '@/utils/geo';
import { theme } from '@/theme';
import type { NavRoute } from '@/types/navigation';

interface Props {
  /** All route alternatives. */
  routes: NavRoute[];
  /** Index of the highlighted (selected) route. */
  selectedIndex: number;
}

/**
 * The route preview (before navigation starts): alternative routes drawn dimmed
 * underneath, the selected route highlighted on top, plus origin (green) and
 * destination (yellow) markers. Once navigating, this is replaced by the pellet
 * line in RouteLayers.
 */
export default function PreviewLayer({ routes, selectedIndex }: Props) {
  const selected = routes[selectedIndex];
  if (!selected) return null;

  const alternatives = routes.filter((_, i) => i !== selectedIndex);
  const { origin, destination } = endpoints(selected.line);

  return (
    <>
      {/* Dimmed alternatives underneath. */}
      {alternatives.length > 0 && (
        <Mapbox.ShapeSource
          id="preview-alts"
          shape={featureCollection(alternatives.map((r) => r.line))}
        >
          <Mapbox.LineLayer
            id="preview-alts-line"
            style={{
              lineColor: theme.colors.textSecondary,
              lineWidth: 5,
              lineOpacity: 0.6,
              lineCap: 'round',
              lineJoin: 'round',
            }}
          />
        </Mapbox.ShapeSource>
      )}

      {/* Selected route on top: casing for contrast, then the accent line. */}
      <Mapbox.ShapeSource id="preview-route" shape={selected.line}>
        <Mapbox.LineLayer
          id="preview-casing"
          style={{
            lineColor: theme.colors.characterOutline,
            lineWidth: 9,
            lineCap: 'round',
            lineJoin: 'round',
          }}
        />
        <Mapbox.LineLayer
          id="preview-line"
          style={{
            lineColor: theme.colors.accent,
            lineWidth: 5,
            lineCap: 'round',
            lineJoin: 'round',
          }}
        />
      </Mapbox.ShapeSource>

      <Mapbox.PointAnnotation id="origin" coordinate={origin}>
        <Dot color={theme.colors.success} />
      </Mapbox.PointAnnotation>
      <Mapbox.PointAnnotation id="destination" coordinate={destination}>
        <Dot color={theme.colors.accent} ring />
      </Mapbox.PointAnnotation>
    </>
  );
}

function Dot({ color, ring }: { color: string; ring?: boolean }) {
  return (
    <View style={[styles.dot, { backgroundColor: color }, ring && styles.ring]} />
  );
}

const styles = StyleSheet.create({
  dot: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 3,
    borderColor: 'white',
  },
  ring: { width: 22, height: 22, borderRadius: 11 },
});
