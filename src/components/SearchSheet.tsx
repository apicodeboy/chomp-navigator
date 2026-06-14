import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import BottomSheet, {
  BottomSheetScrollView,
  BottomSheetTextInput,
} from '@gorhom/bottom-sheet';
import { geocodeSuggestions } from '@/services/directions';
import { getRecents, addRecent } from '@/lib/recents';
import { getFavorites, type Favorite } from '@/lib/favorites';
import { theme } from '@/theme';
import type { Place } from '@/types/navigation';
import type { Position } from 'geojson';

interface Props {
  near: Position | null;
  onPick: (p: Place) => void;
}

// Category quick-search tiles (Apple-Maps "Find Nearby" grid). The `term` is fed
// to the geocoder as a keyword search biased to the user's location.
const CATEGORIES: { term: string; label: string; icon: string }[] = [
  { term: 'restaurant', label: 'Food', icon: '🍔' },
  { term: 'gas station', label: 'Gas', icon: '⛽' },
  { term: 'grocery store', label: 'Groceries', icon: '🛒' },
  { term: 'coffee', label: 'Coffee', icon: '☕' },
  { term: 'hotel', label: 'Hotels', icon: '🏨' },
  { term: 'parking', label: 'Parking', icon: '🅿️' },
  { term: 'ev charging station', label: 'EV', icon: '🔌' },
  { term: 'pharmacy', label: 'Pharmacy', icon: '💊' },
];

/**
 * Apple-Maps-style bottom search sheet with three detents (peek → medium → full).
 * Peek shows the search field + Favorites; expanded shows the category grid and
 * Recents; typing shows live autocomplete results.
 */
export default function SearchSheet({ near, onPick }: Props) {
  const ref = useRef<BottomSheet>(null);
  const snapPoints = useMemo(() => ['14%', '45%', '92%'], []);

  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Place[]>([]);
  const [loading, setLoading] = useState(false);
  const [recents, setRecents] = useState<Place[]>([]);
  const [favs, setFavs] = useState<Favorite[]>([]);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    getRecents().then(setRecents);
    getFavorites().then(setFavs);
  }, []);

  // Debounced autocomplete (250ms) to keep API cost down.
  useEffect(() => {
    if (timer.current) clearTimeout(timer.current);
    if (query.trim().length < 3) {
      setResults([]);
      return;
    }
    setLoading(true);
    timer.current = setTimeout(async () => {
      try {
        setResults(await geocodeSuggestions(query, near ?? undefined));
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 250);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [query, near]);

  const pick = useCallback(
    (p: Place) => {
      void addRecent(p);
      onPick(p);
    },
    [onPick],
  );

  async function runCategory(term: string) {
    setQuery('');
    setLoading(true);
    ref.current?.snapToIndex(2);
    try {
      setResults(await geocodeSuggestions(term, near ?? undefined, 8));
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <BottomSheet
      ref={ref}
      index={0}
      snapPoints={snapPoints}
      enableDynamicSizing={false}
      backgroundStyle={styles.bg}
      handleIndicatorStyle={styles.handle}
    >
      <BottomSheetScrollView
        stickyHeaderIndices={[0]}
        contentContainerStyle={styles.body}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.header}>
          <View style={styles.searchRow}>
            <Text style={styles.searchIcon}>🔍</Text>
            <BottomSheetTextInput
              style={styles.input}
              placeholder="Search Maps"
              placeholderTextColor={theme.colors.textSecondary}
              value={query}
              onChangeText={setQuery}
              onFocus={() => ref.current?.snapToIndex(2)}
              autoCorrect={false}
              returnKeyType="search"
            />
            {loading && <ActivityIndicator color={theme.colors.textSecondary} />}
          </View>
        </View>

        <View style={styles.content}>
        {results.length > 0 ? (
          results.map((r) => (
            <TouchableOpacity key={r.id} style={styles.resRow} onPress={() => pick(r)}>
              <Text style={styles.resName} numberOfLines={1}>{r.name}</Text>
              <Text style={styles.resAddr} numberOfLines={1}>{r.address}</Text>
            </TouchableOpacity>
          ))
        ) : (
          <>
            {favs.length > 0 && (
              <>
                <Text style={styles.section}>Favorites</Text>
                <View style={styles.favRow}>
                  {favs.slice(0, 6).map((f) => (
                    <TouchableOpacity
                      key={f.id}
                      style={styles.favChip}
                      onPress={() => pick({ id: f.id, name: f.name, address: f.address, coord: f.coord })}
                    >
                      <Text style={styles.favIcon}>⭐</Text>
                      <Text style={styles.favName} numberOfLines={1}>{f.name}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </>
            )}

            <Text style={styles.section}>Find Nearby</Text>
            <View style={styles.grid}>
              {CATEGORIES.map((c) => (
                <TouchableOpacity key={c.term} style={styles.cat} onPress={() => runCategory(c.term)}>
                  <View style={styles.catCircle}>
                    <Text style={styles.catIcon}>{c.icon}</Text>
                  </View>
                  <Text style={styles.catLabel}>{c.label}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {recents.length > 0 && (
              <>
                <Text style={styles.section}>Recents</Text>
                {recents.map((r) => (
                  <TouchableOpacity key={r.id} style={styles.resRow} onPress={() => pick(r)}>
                    <Text style={styles.resName} numberOfLines={1}>🕘  {r.name}</Text>
                    <Text style={styles.resAddr} numberOfLines={1}>{r.address}</Text>
                  </TouchableOpacity>
                ))}
              </>
            )}
          </>
        )}
        </View>
      </BottomSheetScrollView>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  bg: { backgroundColor: theme.colors.panel },
  handle: { backgroundColor: theme.colors.border, width: 40 },
  // Sticky search header — solid background so scrolling content passes under it.
  header: {
    backgroundColor: theme.colors.panel,
    paddingHorizontal: 16,
    paddingTop: 4,
    paddingBottom: 10,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    backgroundColor: theme.colors.cardElevated,
    borderRadius: theme.radius.md,
  },
  searchIcon: { fontSize: 16, color: theme.colors.textSecondary },
  input: { flex: 1, color: theme.colors.textPrimary, paddingVertical: 12, fontSize: 16 },
  body: { paddingBottom: 40 },
  content: { paddingHorizontal: 16 },
  section: {
    color: theme.colors.textPrimary,
    fontSize: 18,
    fontWeight: '800',
    marginTop: 18,
    marginBottom: 10,
  },
  favRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  favChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: theme.colors.cardElevated,
    borderRadius: theme.radius.pill,
    paddingVertical: 8,
    paddingHorizontal: 12,
    maxWidth: 160,
  },
  favIcon: { fontSize: 13 },
  favName: { color: theme.colors.textPrimary, fontSize: 13, fontWeight: '600' },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  cat: { width: '25%', alignItems: 'center', marginBottom: 16 },
  catCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: theme.colors.cardElevated,
    alignItems: 'center',
    justifyContent: 'center',
  },
  catIcon: { fontSize: 26 },
  catLabel: { color: theme.colors.textSecondary, fontSize: 12, marginTop: 6 },
  resRow: {
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: theme.colors.border,
  },
  resName: { color: theme.colors.textPrimary, fontSize: 16, fontWeight: '600' },
  resAddr: { color: theme.colors.textSecondary, fontSize: 13, marginTop: 2 },
});
