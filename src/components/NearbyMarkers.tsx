import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Mapbox from '@rnmapbox/maps';
import { theme } from '@/theme';
import type { NearbyPlace } from '@/services/nearby';

const ICON: Record<string, string> = {
  gas_station: '⛽',
  restaurant: '🍔',
  ev_charging_station: '🔌',
  hotel: '🏨',
};

interface Props {
  results: NearbyPlace[];
  filter: string;
  onTap: (n: NearbyPlace) => void;
}

/**
 * Nearby result pins on the EXISTING map (no new map instance). Distinct emoji
 * per category; tapping a pin routes through the same flow as the list.
 */
export default function NearbyMarkers({ results, filter, onTap }: Props) {
  const shown = filter === 'all' ? results : results.filter((r) => r.category === filter);
  return (
    <>
      {shown.map((n) => (
        <Mapbox.PointAnnotation
          key={`nearby-${n.id}`}
          id={`nearby-${n.id}`}
          coordinate={[n.coordinates.lng, n.coordinates.lat]}
          onSelected={() => onTap(n)}
        >
          <View style={styles.pin}>
            <Text style={styles.icon}>{ICON[n.category] ?? '📍'}</Text>
          </View>
        </Mapbox.PointAnnotation>
      ))}
    </>
  );
}

const styles = StyleSheet.create({
  pin: {
    backgroundColor: '#ffffff',
    borderRadius: 18,
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderWidth: 2,
    borderColor: theme.colors.accent,
  },
  icon: { fontSize: 18 },
});
