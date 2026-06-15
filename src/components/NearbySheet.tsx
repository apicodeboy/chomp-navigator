import React from 'react';
import {
  ActivityIndicator,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { RADIUS_MILES, type NearbyPlace } from '@/services/nearby';
import { theme } from '@/theme';

const CAT_META: Record<string, { label: string; icon: string }> = {
  gas_station: { label: 'Gas', icon: '⛽' },
  restaurant: { label: 'Food', icon: '🍔' },
  coffee: { label: 'Coffee', icon: '☕' },
  grocery: { label: 'Groceries', icon: '🛒' },
  hotel: { label: 'Hotels', icon: '🏨' },
  parking: { label: 'Parking', icon: '🅿️' },
  ev_charging_station: { label: 'EV', icon: '🔌' },
  pharmacy: { label: 'Pharmacy', icon: '💊' },
};

// Filter row mirrors the search-bar chips; tapping one re-fetches that category.
const FILTERS: { key: string; label: string }[] = Object.entries(CAT_META).map(
  ([key, m]) => ({ key, label: m.label }),
);

interface Props {
  visible: boolean;
  loading: boolean;
  results: NearbyPlace[];
  filter: string;
  onFilter: (f: string) => void;
  onClose: () => void;
  onPick: (n: NearbyPlace) => void;
}

export default function NearbySheet({ visible, loading, results, filter, onFilter, onClose, onPick }: Props) {
  const title = CAT_META[filter]?.label ?? 'Nearby';

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.backdrop}>
        {/* Tap above the sheet to dismiss. */}
        <TouchableOpacity style={styles.dismissArea} activeOpacity={1} onPress={onClose} />
        <View style={styles.sheet}>
          <View style={styles.grabber} />
          <View style={styles.header}>
            <Text style={styles.title}>{title} Nearby</Text>
            <TouchableOpacity onPress={onClose}>
              <Text style={styles.close}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.filtersScroll}
            contentContainerStyle={styles.filters}
          >
            {FILTERS.map((f) => {
              const active = filter === f.key;
              return (
                <TouchableOpacity
                  key={f.key}
                  style={[styles.filter, active && styles.filterOn]}
                  onPress={() => onFilter(f.key)}
                >
                  <Text style={[styles.filterText, active && styles.filterTextOn]}>{f.label}</Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {loading ? (
            <View style={styles.center}>
              <ActivityIndicator color={theme.colors.accent} />
              <Text style={styles.muted}>Finding places within {RADIUS_MILES} miles…</Text>
            </View>
          ) : results.length === 0 ? (
            <View style={styles.center}>
              <Text style={styles.muted}>No places found within {RADIUS_MILES} miles.</Text>
            </View>
          ) : (
            <ScrollView contentContainerStyle={styles.list}>
              <View style={styles.card}>
                {results.map((n, i) => (
                  <TouchableOpacity
                    key={n.id}
                    activeOpacity={0.6}
                    style={[styles.row, i < results.length - 1 && styles.rowDivider]}
                    onPress={() => onPick(n)}
                  >
                    <View style={styles.iconWrap}>
                      <Text style={styles.icon}>{CAT_META[n.category]?.icon ?? '📍'}</Text>
                    </View>
                    <View style={styles.rowMain}>
                      {/* No numberOfLines — full text always shows. */}
                      <Text style={styles.name}>{n.name}</Text>
                      <Text style={styles.addr}>
                        {CAT_META[n.category]?.label ?? n.category}
                        {n.address ? ` · ${n.address}` : ''}
                      </Text>
                    </View>
                    <Text style={styles.dist}>{n.distanceMiles} mi</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.4)' },
  dismissArea: { flex: 1 },
  // Comes up to ~half the screen automatically.
  sheet: {
    height: '56%',
    backgroundColor: '#faf3ea', // soft cream (reference theme)
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingBottom: 8,
  },
  grabber: { alignSelf: 'center', width: 40, height: 5, borderRadius: 3, backgroundColor: 'rgba(0,0,0,0.18)', marginTop: 10 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 12, paddingBottom: 6 },
  title: { ...theme.type.title, color: '#222' },
  close: { color: '#888', fontSize: 22, paddingHorizontal: 4 },
  // flexGrow:0 + fixed height stop the horizontal row from expanding to fill the
  // sheet (which was stretching the pills into tall ovals).
  filtersScroll: { flexGrow: 0, height: 54 },
  filters: { paddingHorizontal: 16, gap: 8, alignItems: 'center' },
  filter: {
    height: 38,
    paddingHorizontal: 18,
    borderRadius: theme.radius.pill,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.06)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterOn: { backgroundColor: theme.colors.accent, borderColor: theme.colors.accent },
  filterText: { color: '#444', fontWeight: '700', fontSize: 13, lineHeight: 17 },
  filterTextOn: { color: theme.colors.onAccent },
  center: { padding: 40, alignItems: 'center', gap: 12 },
  muted: { color: '#8a7f72', fontSize: 14, textAlign: 'center' },
  list: { padding: 16 },
  // Rounded white "bubble" card holding the rows (reference grouped-list theme).
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 24,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
  },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, paddingHorizontal: 16 },
  rowDivider: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: 'rgba(0,0,0,0.08)' },
  iconWrap: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#f4ede2', alignItems: 'center', justifyContent: 'center' },
  icon: { fontSize: 22 },
  rowMain: { flex: 1, paddingHorizontal: 12 },
  name: { color: '#1a1a1a', fontSize: 17, fontWeight: '700', letterSpacing: -0.3 },
  addr: { color: '#8a8a8e', fontSize: 14, marginTop: 2 },
  dist: { color: theme.colors.accentStrong, fontSize: 14, fontWeight: '800' },
});
