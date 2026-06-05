import React from 'react';
import { StyleSheet, View } from 'react-native';
import Mapbox from '@rnmapbox/maps';
import { endpoints } from '@/utils/geo';
import { theme } from '@/theme';
import type { Feature, LineString } from 'geojson';

interface Props {
  line: Feature<LineString>;
}

/**
 * The full route drawn for the PREVIEW phase (before navigation starts):
 * a solid route line plus origin (green) and destination (red) markers.
 * Once navigating, this is replaced by the pellet line in RouteLayers.
 */
export default function PreviewLayer({ line }: Props) {
  const { origin, destination } = endpoints(line);
  return (
    <>
      <Mapbox.ShapeSource id="preview-route" shape={line}>
        {/* Casing underneath for contrast, then the colored route on top. */}
        <Mapbox.LineLayer
          id="preview-casing"
          style={{
            lineColor: '#3a2f63',
            lineWidth: 9,
            lineCap: 'round',
            lineJoin: 'round',
          }}
        />
        <Mapbox.LineLayer
          id="preview-line"
          style={{
            lineColor: theme.colors.accentStrong,
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
