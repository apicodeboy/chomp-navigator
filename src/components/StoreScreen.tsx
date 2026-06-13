import React from 'react';
import { Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { ChomperSprite } from './ChomperMarker';
import { useSkinStore } from '@/store/useSkinStore';
import { useMapStyle } from '@/store/useMapStyle';
import { SKINS, type SkinListing } from '@/store/skins';
import { theme } from '@/theme';

interface Props {
  visible: boolean;
  onClose: () => void;
}

/** A character tile: animated preview + equip button. Everything is free. */
function SkinTile({ skin }: { skin: SkinListing }) {
  const { selectedId, equip } = useSkinStore();
  const equipped = selectedId === skin.id;

  return (
    <View style={[styles.tile, equipped && styles.tileEquipped]}>
      <View style={styles.preview}>
        <ChomperSprite skin={skin} size={64} />
      </View>
      <Text style={styles.name}>{skin.name}</Text>
      <TouchableOpacity
        style={[styles.btn, equipped ? styles.btnEquipped : styles.btnEquip]}
        onPress={() => !equipped && equip(skin.id)}
        disabled={equipped}
      >
        <Text style={[styles.btnText, equipped && styles.btnTextEquipped]}>
          {equipped ? 'Equipped' : 'Equip'}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

/** Map-style picker. All styles are free and available to everyone. */
function MapStyleRow() {
  const { styles: mapStyles, selectedId, select } = useMapStyle();
  return (
    <View style={styles.mapRow}>
      {mapStyles.map((m) => {
        const active = selectedId === m.id;
        return (
          <TouchableOpacity
            key={m.id}
            style={[styles.mapChip, active && styles.mapChipActive]}
            onPress={() => select(m.id)}
          >
            <Text style={[styles.mapChipText, active && styles.mapChipTextActive]}>{m.name}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

export default function StoreScreen({ visible, onClose }: Props) {
  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <View style={styles.header}>
            <Text style={styles.title}>Character Store</Text>
            <TouchableOpacity onPress={onClose}>
              <Text style={styles.close}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={styles.scroll}>
            <Text style={styles.section}>Map Style</Text>
            <MapStyleRow />

            <Text style={styles.section}>Characters</Text>
            <View style={styles.grid}>
              {SKINS.map((s) => (
                <SkinTile key={s.id} skin={s} />
              ))}
            </View>
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
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: 12 },
  tile: {
    width: '47%',
    backgroundColor: theme.colors.cardElevated,
    borderRadius: theme.radius.md,
    padding: 16,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  tileEquipped: { borderColor: theme.colors.accent },
  preview: { height: 72, justifyContent: 'center' },
  name: { color: theme.colors.textPrimary, fontSize: 16, fontWeight: '700', marginVertical: 8 },
  btn: { paddingVertical: 8, paddingHorizontal: 18, borderRadius: theme.radius.sm, minWidth: 100, alignItems: 'center' },
  btnEquip: { backgroundColor: theme.colors.accentStrong },
  btnEquipped: { backgroundColor: theme.colors.card, borderWidth: 1, borderColor: theme.colors.border },
  btnText: { color: theme.colors.onAccent, fontWeight: '800', fontSize: 14 },
  btnTextEquipped: { color: theme.colors.textSecondary },

  mapRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10 },
  mapChip: {
    paddingVertical: 9,
    paddingHorizontal: 14,
    borderRadius: theme.radius.pill,
    backgroundColor: theme.colors.cardElevated,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  mapChipActive: { backgroundColor: theme.colors.accent, borderColor: theme.colors.accent },
  mapChipText: { color: theme.colors.textPrimary, fontWeight: '700', fontSize: 13 },
  mapChipTextActive: { color: theme.colors.onAccent },
  section: { color: theme.colors.textPrimary, fontSize: 18, fontWeight: '800', marginTop: 24 },
});
