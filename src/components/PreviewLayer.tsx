import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Mapbox from '@rnmapbox/maps';
import { featureCollection } from '@turf/turf';
import { endpoints, midpoint } from '@/utils/geo';
import { formatDistance, formatDuration } from '@/utils/format';
import type { Units } from '@/utils/format';
import { theme } from '@/theme';
import type { NavRoute } from '@/types/navigation';

interface Props {
  /** All route alternatives. */
  routes: NavRoute[];
  /** Index of the highlighted (selected) route. */
  selectedIndex: number;
  /** Selected-route line color (from Settings). */
  color: string;
  /** Distance units for the ETA bubbles. */
  units: Units;
  /** Tap a bubble (or its route) to make it the selected route. */
  onSelectRoute: (index: number) => void;
}

/**
 * The route preview (before navigation starts): every alternative drawn on the
 * map at once — dimmed underneath, the selected route highlighted on top — with
 * a tappable ETA bubble pointing at each line, plus origin/destination markers.
 */
export default function PreviewLayer({ routes, selectedIndex, color, units, onSelectRoute }: Props) {
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
              lineWidth: 6,
              lineOpacity: 0.55,
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

      {/* ETA bubbles — one per route, anchored on its line with a downward
          pointer. Selected is gold; alternatives are white. Tappable. */}
      {routes.map((r, i) => {
        const active = i === selectedIndex;
        return (
          <Mapbox.MarkerView
            key={`eta-${i}`}
            id={`eta-${i}`}
            coordinate={midpoint(r.line)}
            anchor={{ x: 0.5, y: 1 }}
            allowOverlap
          >
            <TouchableOpacity activeOpacity={0.85} onPress={() => onSelectRoute(i)}>
              <View style={[styles.bubble, active ? styles.bubbleActive : styles.bubbleAlt]}>
                <Text style={[styles.bubbleTime, active && styles.bubbleTextActive]}>
                  {formatDuration(r.duration)}
                </Text>
                <Text style={[styles.bubbleDist, active && styles.bubbleSubActive]}>
                  {i === 0 ? 'Fastest' : `Alt ${i}`} · {formatDistance(r.distance, units)}
                </Text>
              </View>
              {/* Pointer tail touching the route line. */}
              <View style={[styles.tail, active ? styles.tailActive : styles.tailAlt]} />
            </TouchableOpacity>
          </Mapbox.MarkerView>
        );
      })}

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
  bubble: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 14,
    alignItems: 'center',
    minWidth: 78,
    shadowColor: '#000',
    shadowOpacity: 0.28,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    elevation: 5,
  },
  bubbleActive: { backgroundColor: '#ffc400', borderWidth: 1, borderColor: '#ffe08a' },
  bubbleAlt: { backgroundColor: '#ffffff', borderWidth: 1, borderColor: 'rgba(0,0,0,0.08)' },
  bubbleTime: { color: '#222', fontSize: 15, fontWeight: '900', letterSpacing: -0.3 },
  bubbleDist: { color: '#666', fontSize: 11, fontWeight: '700', marginTop: 1 },
  bubbleTextActive: { color: '#1c1c1e' },
  bubbleSubActive: { color: '#5a4500' },
  // Triangle pointer under the bubble (tip points down at the line).
  tail: {
    alignSelf: 'center',
    width: 0,
    height: 0,
    borderLeftWidth: 7,
    borderRightWidth: 7,
    borderTopWidth: 9,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    marginTop: -1,
  },
  tailActive: { borderTopColor: '#ffc400' },
  tailAlt: { borderTopColor: '#ffffff' },
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
