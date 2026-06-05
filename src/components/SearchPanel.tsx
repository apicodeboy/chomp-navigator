import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { geocodeSuggestions } from '@/services/directions';
import { theme } from '@/theme';
import type { Place } from '@/types/navigation';
import type { Position } from 'geojson';

interface Props {
  /** User location to bias suggestions toward. */
  near: Position | null;
  /** Called when a suggestion is chosen. */
  onPick: (place: Place) => void;
}

/**
 * "Where to?" search with debounced live suggestions from the Geocoding v6 API.
 * Typing fires a geocode (300ms debounce); tapping a row picks the destination.
 */
export default function SearchPanel({ near, onPick }: Props) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Place[]>([]);
  const [loading, setLoading] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (timer.current) clearTimeout(timer.current);
    if (query.trim().length < 3) {
      setResults([]);
      return;
    }
    setLoading(true);
    // Debounce so we don't geocode on every keystroke.
    timer.current = setTimeout(async () => {
      try {
        setResults(await geocodeSuggestions(query, near ?? undefined));
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 300);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [query, near]);

  return (
    <View style={styles.wrap}>
      <View style={styles.inputRow}>
        <Text style={styles.icon}>🔍</Text>
        <TextInput
          style={styles.input}
          placeholder="Where to?"
          placeholderTextColor={theme.colors.textSecondary}
          value={query}
          onChangeText={setQuery}
          autoCorrect={false}
        />
        {loading && <ActivityIndicator color={theme.colors.textSecondary} />}
      </View>

      {results.length > 0 && (
        <FlatList
          style={styles.list}
          data={results}
          keyExtractor={(p) => p.id}
          keyboardShouldPersistTaps="handled"
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.row}
              onPress={() => {
                setQuery(item.name);
                setResults([]);
                onPick(item);
              }}
            >
              <Text style={styles.name} numberOfLines={1}>
                {item.name}
              </Text>
              <Text style={styles.addr} numberOfLines={1}>
                {item.address}
              </Text>
            </TouchableOpacity>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', top: 56, left: 12, right: 12 },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.card,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.md,
    paddingHorizontal: 14,
    gap: 10,
  },
  icon: { fontSize: 16 },
  input: { flex: 1, color: theme.colors.textPrimary, paddingVertical: 14, fontSize: 16 },
  list: {
    marginTop: 8,
    backgroundColor: theme.colors.card,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.md,
    maxHeight: 280,
  },
  row: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: theme.colors.border,
  },
  name: { color: theme.colors.textPrimary, fontSize: 16, fontWeight: '600' },
  addr: { color: theme.colors.textSecondary, fontSize: 13, marginTop: 2 },
});
