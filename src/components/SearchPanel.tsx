import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  Image,
  Keyboard,
  PanResponder,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { geocodeSuggestions } from '@/services/directions';
import { fetchNearby, nearbyToPlace } from '@/services/nearby';
import { addFavorite, getFavorites, removeFavorite } from '@/lib/favorites';
import { getRecents, removeRecent } from '@/lib/recents';

// Pre-expanded panel height — the search occupies roughly the bottom half.
const SCREEN_H = Dimensions.get('window').height;
const PANEL_H = Math.round(SCREEN_H * 0.4);
// Can shrink to zero — past COLLAPSE_AT the whole body hides so only the
// "MAP WRLDS" bar remains (drag the handle back up to reveal it again).
const PANEL_MIN = 0;
const PANEL_MAX = Math.round(SCREEN_H * 0.66);
const COLLAPSE_AT = 56;
import { straightLineM } from '@/utils/geo';
import { formatDistance } from '@/utils/format';
import { theme } from '@/theme';
import type { Place } from '@/types/navigation';
import type { Position } from 'geojson';

const PROFILE_ICON = require('../../assets/icon-profile.png');

interface Props {
  near: Position | null;
  onPick: (place: Place) => void;
  /** When provided, the profile chip is shown on the right end of the bar. */
  onOpenProfile?: () => void;
  /** Tapping a category chip opens the Nearby sheet for that category. */
  onCategory?: (category: string) => void;
  /** Report the bar's height + keyboard state so callers can float buttons above it. */
  onLayoutChange?: (info: { height: number; keyboardOpen: boolean }) => void;
}

// Suggested "keywords" — Search Box canonical categories + a color tint each.
const CHIPS: { cat: string; label: string; tint: string }[] = [
  { cat: 'restaurant', label: 'Food', tint: 'rgba(96,165,250,0.22)' },
  { cat: 'gas_station', label: 'Gas', tint: 'rgba(251,191,36,0.22)' },
  { cat: 'coffee', label: 'Coffee', tint: 'rgba(167,139,250,0.22)' },
  { cat: 'grocery', label: 'Groceries', tint: 'rgba(34,197,94,0.22)' },
  { cat: 'hotel', label: 'Hotels', tint: 'rgba(244,114,182,0.22)' },
  { cat: 'parking', label: 'Parking', tint: 'rgba(56,189,248,0.22)' },
  { cat: 'ev_charging_station', label: 'EV', tint: 'rgba(45,212,191,0.22)' },
  { cat: 'pharmacy', label: 'Pharmacy', tint: 'rgba(248,113,113,0.22)' },
];

/**
 * Bottom search bar (dark version of the reference design): a rounded input with
 * the profile chip on the right end, and a "Suggested" keyword-chip row above it.
 * Lifts above the keyboard while typing.
 */
export default function SearchPanel({ near, onPick, onOpenProfile, onCategory, onLayoutChange }: Props) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Place[]>([]);
  const [loading, setLoading] = useState(false);
  const [showSuggest, setShowSuggest] = useState(true);
  const [kb, setKb] = useState(0);
  const [starred, setStarred] = useState<Set<string>>(new Set());
  const [recents, setRecents] = useState<Place[]>([]);
  const [recommend, setRecommend] = useState<Place[]>([]);
  const [cardHeight, setCardHeight] = useState(PANEL_H + 120);
  // Draggable body height — pull the handle up/down to resize the panel.
  const [panelH, setPanelH] = useState(PANEL_H);
  const panelHRef = useRef(PANEL_H);
  const dragStart = useRef(PANEL_H);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const drag = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_e, g) => Math.abs(g.dy) > 4,
      onPanResponderGrant: () => {
        dragStart.current = panelHRef.current;
      },
      onPanResponderMove: (_e, g) => {
        // Drag up (dy < 0) grows the panel; down shrinks it.
        const next = Math.max(PANEL_MIN, Math.min(PANEL_MAX, dragStart.current - g.dy));
        panelHRef.current = next;
        setPanelH(next);
      },
    }),
  ).current;

  // Lift the bar above the keyboard.
  useEffect(() => {
    const s = Keyboard.addListener('keyboardWillShow', (e) => setKb(e.endCoordinates.height));
    const h = Keyboard.addListener('keyboardWillHide', () => setKb(0));
    return () => {
      s.remove();
      h.remove();
    };
  }, []);

  // Load which places are already starred, and the recent places.
  useEffect(() => {
    getFavorites().then((f) => setStarred(new Set(f.map((x) => x.id))));
    getRecents().then((r) => setRecents(r.slice(0, 10)));
  }, []);

  // Always pull area recommendations so the list can be topped up to full.
  // Fetch ONCE (the `near` coord updates ~1Hz, so guard against refetching).
  const fetchedRecommend = useRef(false);
  useEffect(() => {
    if (!near || fetchedRecommend.current) return;
    fetchedRecommend.current = true;
    fetchNearby(near, ['restaurant', 'coffee', 'grocery'], 20)
      .then((n) => setRecommend(n.map(nearbyToPlace)))
      .catch(() => {
        fetchedRecommend.current = false; // allow a retry
      });
  }, [near]);

  async function eraseRecent(id: string) {
    setRecents((await removeRecent(id)).slice(0, 10));
  }

  // Report size + keyboard state up so the floating buttons can sit above the bar.
  useEffect(() => {
    onLayoutChange?.({ height: cardHeight, keyboardOpen: kb > 0 });
  }, [cardHeight, kb, onLayoutChange]);

  async function toggleStar(p: Place) {
    if (starred.has(p.id)) {
      await removeFavorite(p.id);
      setStarred((prev) => {
        const next = new Set(prev);
        next.delete(p.id);
        return next;
      });
    } else {
      await addFavorite(p);
      setStarred((prev) => new Set(prev).add(p.id));
    }
  }

  // Debounced autocomplete.
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

  function pick(p: Place) {
    Keyboard.dismiss();
    setQuery('');
    setResults([]);
    onPick(p);
  }

  // Dragged the handle below the threshold: collapse to just the search bar.
  const collapsed = panelH < COLLAPSE_AT;
  const showResults = results.length > 0 && !collapsed;
  const showChips = !showResults && showSuggest && !collapsed;
  function distLabel(p: Place): string {
    return near ? formatDistance(straightLineM(near, p.coord), 'mi') : '';
  }
  // Recents first, then recommendations to top the list up to 10 (deduped).
  const recentIds = new Set(recents.map((r) => r.id));
  const places = [...recents, ...recommend.filter((r) => !recentIds.has(r.id))].slice(0, 10);
  const placesHead = recents.length > 0 ? 'Recent' : 'Recommended nearby';

  return (
    <View style={[styles.wrap, { bottom: 16 + kb }]}>
      <View style={styles.card} onLayout={(e) => setCardHeight(e.nativeEvent.layout.height)}>
        {/* Drag this handle up/down to resize the panel. */}
        <View {...drag.panHandlers} style={styles.handleHit}>
          <View style={styles.handle} />
        </View>

        {/* Results (when typing or after a category search) */}
        {showResults && (
          <ScrollView style={{ height: panelH }} keyboardShouldPersistTaps="handled">
            {results.map((r) => (
              <View key={r.id} style={styles.resRow}>
                <TouchableOpacity style={styles.resMain} activeOpacity={0.7} onPress={() => pick(r)}>
                  <Text style={styles.resName}>{r.name}</Text>
                  <Text style={styles.resAddr}>
                    {distLabel(r) ? `${distLabel(r)} · ${r.address}` : r.address}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => toggleStar(r)} hitSlop={10} style={styles.starBtn}>
                  <Text style={[styles.star, starred.has(r.id) && styles.starOn]}>
                    {starred.has(r.id) ? '★' : '☆'}
                  </Text>
                </TouchableOpacity>
              </View>
            ))}
          </ScrollView>
        )}

        {/* Suggested keyword chips (when there are no results) */}
        {showChips && (
          <View style={styles.suggest}>
            <View style={styles.suggestHead}>
              <Text style={styles.suggestLabel}>
                Suggested: tap a category to search nearby
              </Text>
              <TouchableOpacity onPress={() => setShowSuggest(false)} hitSlop={10}>
                <Text style={styles.x}>✕</Text>
              </TouchableOpacity>
            </View>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={styles.chips}
            >
              {CHIPS.map((c) => (
                <TouchableOpacity
                  key={c.cat}
                  style={[styles.chip, { backgroundColor: c.tint }]}
                  onPress={() => onCategory?.(c.cat)}
                >
                  <Text style={styles.chipText}>{c.label}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {/* Recents (or area recommendations) — bubble-card list, full height
                so the search panel is pre-stretched toward the middle. */}
            <Text style={styles.recentHead}>{placesHead}</Text>
            <ScrollView style={{ height: panelH }} keyboardShouldPersistTaps="handled">
              {places.length > 0 ? (
                <View style={styles.recentCard}>
                  {places.map((r, i) => {
                    const isRecent = recentIds.has(r.id);
                    return (
                      <View
                        key={r.id}
                        style={[styles.recentRow, i < places.length - 1 && styles.recentDivider]}
                      >
                        <TouchableOpacity style={styles.recentTap} activeOpacity={0.6} onPress={() => pick(r)}>
                          <Text style={styles.recentIcon}>{isRecent ? '🕘' : '📍'}</Text>
                          <View style={styles.recentMain}>
                            <Text style={styles.recentName}>{r.name}</Text>
                            <Text style={styles.recentAddr}>
                              {distLabel(r) ? `${distLabel(r)} · ${r.address}` : r.address}
                            </Text>
                          </View>
                        </TouchableOpacity>
                        {isRecent && (
                          <TouchableOpacity onPress={() => eraseRecent(r.id)} hitSlop={10} style={styles.eraseBtn}>
                            <Text style={styles.eraseX}>✕</Text>
                          </TouchableOpacity>
                        )}
                      </View>
                    );
                  })}
                </View>
              ) : (
                <View style={styles.placesEmpty}>
                  <Text style={styles.placesEmptyText}>
                    {near ? 'Finding places near you…' : 'Search for a place to get started'}
                  </Text>
                </View>
              )}
            </ScrollView>
          </View>
        )}

        {(showResults || showChips) && <View style={styles.hr} />}

        {/* Input bar: search lens on the left, profile on the right end */}
        <View style={styles.inputBar}>
          <Ionicons name="search" size={20} color="rgba(255,255,255,0.6)" style={styles.lens} />
          <TextInput
            style={styles.input}
            placeholder="MAP WRLDS"
            placeholderTextColor="rgba(255,255,255,0.45)"
            value={query}
            onChangeText={setQuery}
            onFocus={() => setShowSuggest(true)}
            autoCorrect={false}
            returnKeyType="search"
          />
          {loading && <ActivityIndicator color="rgba(255,255,255,0.6)" />}
          {onOpenProfile && (
            <>
              <View style={styles.vdivider} />
              <TouchableOpacity onPress={onOpenProfile} style={styles.profileBtn} hitSlop={6}>
                <Image source={PROFILE_ICON} style={styles.profileImg} resizeMode="contain" />
              </TouchableOpacity>
            </>
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', left: 12, right: 12 },
  card: {
    backgroundColor: 'rgba(16,16,20,0.97)',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  results: { maxHeight: 240 },
  resRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 11,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(255,255,255,0.08)',
  },
  resMain: { flex: 1, paddingRight: 10 },
  resName: { color: '#ffffff', fontSize: 16, fontWeight: '600' },
  resAddr: { color: 'rgba(255,255,255,0.55)', fontSize: 13, marginTop: 2 },
  starBtn: { padding: 4 },
  star: { fontSize: 22, color: 'rgba(255,255,255,0.4)' },
  starOn: { color: theme.colors.accent },

  suggest: { paddingTop: 6 },
  suggestHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
    marginBottom: 8,
  },
  suggestLabel: { flex: 1, color: 'rgba(255,255,255,0.5)', fontSize: 12.5 },
  x: { color: 'rgba(255,255,255,0.5)', fontSize: 14, paddingLeft: 10 },
  chips: { paddingHorizontal: 6, gap: 8, paddingBottom: 4 },
  chip: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: theme.radius.pill,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    justifyContent: 'center',
  },
  // lineHeight prevents ascenders/descenders from being clipped in the pill.
  chipText: { color: '#ffffff', fontSize: 14, lineHeight: 19, fontWeight: '600', includeFontPadding: false },
  placesEmpty: { paddingVertical: 30, alignItems: 'center' },
  placesEmptyText: { color: 'rgba(255,255,255,0.5)', fontSize: 14 },

  recentHead: { color: 'rgba(255,255,255,0.5)', fontSize: 12.5, fontWeight: '700', paddingHorizontal: 8, marginTop: 12, marginBottom: 6 },
  recentScroll: { maxHeight: 230 },
  recentCard: { backgroundColor: '#ffffff', borderRadius: 18, marginHorizontal: 4, overflow: 'hidden' },
  recentRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 14 },
  recentTap: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12 },
  recentDivider: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: 'rgba(0,0,0,0.08)' },
  eraseBtn: { paddingLeft: 12, paddingVertical: 4 },
  eraseX: { color: '#bdbdbd', fontSize: 16, fontWeight: '700' },
  recentIcon: { fontSize: 16 },
  recentMain: { flex: 1 },
  // No numberOfLines — names/addresses show in full.
  recentName: { color: '#1a1a1a', fontSize: 16, fontWeight: '700', letterSpacing: -0.3 },
  recentAddr: { color: '#8a8a8e', fontSize: 13, marginTop: 1 },

  hr: { height: 1, backgroundColor: 'rgba(255,255,255,0.09)', marginVertical: 6, marginHorizontal: 4 },

  handleHit: { alignItems: 'center', paddingTop: 8, paddingBottom: 6 },
  handle: { width: 44, height: 5, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.35)' },
  inputBar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 4, gap: 6 },
  lens: { marginRight: 2 },
  input: { flex: 1, color: '#ffffff', fontSize: 17, paddingVertical: 10, letterSpacing: -0.3 },
  mag: { fontSize: 16, color: 'rgba(255,255,255,0.6)', paddingHorizontal: 6 },
  vdivider: { width: 1, height: 26, backgroundColor: 'rgba(255,255,255,0.18)', marginHorizontal: 8 },
  profileBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  profileImg: { width: 34, height: 34 },
});
