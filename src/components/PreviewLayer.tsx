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
  /** Selected-route line color (from Settings). */
  color: string;
}

/**
 * The route preview (before navigation starts): alternative routes drawn dimmed
 * underneath, the selected route highlighted on top, plus origin (green) and
 * destination (yellow) markers. Once navigating, this is replaced by the pellet
 * line in RouteLayers.
 */
export default function PreviewLayer({ routes, selectedIndex, color }: Props) {
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

      {/* Selected route: white casing → glossy colored core → sheen. */}
      <Mapbox.ShapeSource id="preview-route" shape={selected.line}>
        <Mapbox.LineLayer
          id="preview-casing"
          style={{ lineColor: '#ffffff', lineWidth: 16, lineCap: 'round', lineJoin: 'round' }}
        />
        <Mapbox.LineLayer
          id="preview-line"
          style={{ lineColor: color, lineWidth: 10, lineCap: 'round', lineJoin: 'round', lineEmissiveStrength: 1 }}
        />
        <Mapbox.LineLayer
          id="preview-sheen"
          style={{ lineColor: 'rgba(255,255,255,0.35)', lineWidth: 3, lineCap: 'round', lineJoin: 'round' }}
        />
      </Mapbox.ShapeSource>

      <Mapbox.PointAnnotation id="origin" coordinate={origin}>
        <View style={styles.origin} />
      </Mapbox.PointAnnotation>
      <Mapbox.PointAnnotation id="destination" coordinate={destination}>
        {/* Glossy 3D destination orb. */}
        <View style={[styles.orb, { backgroundColor: color }]}>
          <View style={styles.orbHighlight} />
        </View>
      </Mapbox.PointAnnotation>
    </>
  );
}

const styles = StyleSheet.create({
  origin: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#ffffff',
    borderWidth: 4,
    borderColor: '#1d72ff',
  },
  orb: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 3,
    borderColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'flex-start',
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },
  orbHighlight: {
    width: 12,
    height: 6,
    borderRadius: 6,
    marginTop: 3,
    backgroundColor: 'rgba(255,255,255,0.6)',
  },
});
