import React, { useEffect, useState } from 'react';
import { Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { getFavorites, removeFavorite, type Favorite } from '@/lib/favorites';
import type { Place } from '@/types/navigation';
import { theme } from '@/theme';

interface Props {
  visible: boolean;
  onClose: () => void;
  /** Route to a saved place. */
  onPick: (place: Place) => void;
}

export default function FavoritesModal({ visible, onClose, onPick }: Props) {
  const [favs, setFavs] = useState<Favorite[]>([]);

  useEffect(() => {
    if (visible) getFavorites().then(setFavs);
  }, [visible]);

  function pick(f: Favorite) {
    onPick({ id: f.id, name: f.name, address: f.address, coord: f.coord });
    onClose();
  }

  async function del(id: string) {
    setFavs(await removeFavorite(id));
  }

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <View style={styles.header}>
            <Text style={styles.title}>Saved Places</Text>
            <TouchableOpacity onPress={onClose}>
              <Text style={styles.close}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={styles.scroll}>
            {favs.length === 0 && (
              <Text style={styles.empty}>
                No saved places yet. Tap the ★ on a route preview to save it here.
              </Text>
            )}
            {favs.map((f) => (
              <View key={f.id} style={styles.item}>
                <TouchableOpacity style={styles.itemMain} onPress={() => pick(f)}>
                  <Text style={styles.itemName} numberOfLines={1}>⭐ {f.name}</Text>
                  <Text style={styles.itemAddr} numberOfLines={1}>{f.address}</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => del(f.id)} hitSlop={10}>
                  <Text style={styles.del}>Remove</Text>
                </TouchableOpacity>
              </View>
            ))}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.55)' },
  sheet: {
    backgroundColor: theme.colors.panel,
    borderTopLeftRadius: theme.radius.lg,
    borderTopRightRadius: theme.radius.lg,
    paddingBottom: 28,
    maxHeight: '88%',
  },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20 },
  title: { color: theme.colors.textPrimary, fontSize: 22, fontWeight: '800' },
  close: { color: theme.colors.textSecondary, fontSize: 22, paddingHorizontal: 4 },
  scroll: { paddingHorizontal: 16 },
  empty: { color: theme.colors.textSecondary, fontSize: 14, textAlign: 'center', paddingVertical: 24, lineHeight: 20 },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: theme.colors.cardElevated,
    borderRadius: theme.radius.md,
    padding: 16,
    marginBottom: 10,
  },
  itemMain: { flex: 1, paddingRight: 12 },
  itemName: { color: theme.colors.textPrimary, fontSize: 16, fontWeight: '700' },
  itemAddr: { color: theme.colors.textSecondary, fontSize: 13, marginTop: 2 },
  del: { color: theme.colors.danger, fontSize: 14, fontWeight: '700' },
});
