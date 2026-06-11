import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTickets } from '@/store/useTickets';
import { theme } from '@/theme';

/**
 * Small reusable balance pill (🎟 N). Reads the SERVER balance via useTickets.
 * Shows nothing if the Tickets backend isn't configured.
 */
export default function TicketBalance({ onPress }: { onPress?: () => void }) {
  const { balance, enabled, loading } = useTickets();
  if (!enabled) return null;

  return (
    <View style={styles.pill} onTouchEnd={onPress}>
      <Text style={styles.icon}>🎟</Text>
      <Text style={styles.count}>{loading || balance === null ? '—' : balance}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: theme.colors.overlay,
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: theme.radius.pill,
  },
  icon: { fontSize: 15 },
  count: { color: theme.colors.textPrimary, fontWeight: '800', fontSize: 15 },
});
