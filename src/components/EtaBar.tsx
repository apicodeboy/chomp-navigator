import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { formatDistance, type Units } from '@/utils/format';
import { theme } from '@/theme';

interface Props {
  distRemainingM: number;
  /** Remaining travel time in seconds (from Mapbox's traffic-aware duration). */
  remainingSec: number;
  units: Units;
  onStop: () => void;
}

function fmtEta(remainingSec: number): string {
  const mins = Math.max(1, Math.round(remainingSec / 60));
  const eta = new Date(Date.now() + mins * 60_000);
  const hh = eta.getHours().toString().padStart(2, '0');
  const mm = eta.getMinutes().toString().padStart(2, '0');
  const label = mins >= 60 ? `${Math.floor(mins / 60)}h ${mins % 60}m` : `${mins} min`;
  return `${label} · ${hh}:${mm}`;
}

/** Bottom bar: traffic-aware ETA, distance remaining, and a stop button. */
export default function EtaBar({ distRemainingM, remainingSec, units, onStop }: Props) {
  return (
    <View style={styles.wrap}>
      <View>
        <Text style={styles.eta}>{fmtEta(remainingSec)}</Text>
        <Text style={styles.sub}>{formatDistance(distRemainingM, units)} remaining</Text>
      </View>
      <TouchableOpacity onPress={onStop} hitSlop={10}>
        <Text style={styles.stop}>✕ End</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    left: 12,
    right: 12,
    bottom: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: theme.colors.overlay,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: 16,
    borderRadius: theme.radius.md,
  },
  eta: { color: theme.colors.textPrimary, fontSize: 20, fontWeight: '800' },
  sub: { color: theme.colors.textSecondary, fontSize: 13, marginTop: 2 },
  stop: {
    color: theme.colors.danger,
    fontSize: 16,
    fontWeight: '700',
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
});
