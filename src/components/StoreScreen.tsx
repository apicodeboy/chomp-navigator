import React, { useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { ChomperSprite } from './ChomperMarker';
import { useSkinStore } from '@/store/useSkinStore';
import { formatPrice, SKINS, type SkinListing } from '@/store/skins';
import { theme } from '@/theme';

interface Props {
  visible: boolean;
  onClose: () => void;
}

/** A single store tile: animated preview + buy/equip button. */
function SkinTile({ skin }: { skin: SkinListing }) {
  const { selectedId, owns, select, purchase } = useSkinStore();
  const [busy, setBusy] = useState(false);
  const owned = owns(skin.id);
  const equipped = selectedId === skin.id;

  async function onPress() {
    if (equipped) return;
    if (owned) {
      select(skin.id);
      return;
    }
    setBusy(true);
    try {
      await purchase(skin.id); // STUB purchase — see useSkinStore
    } finally {
      setBusy(false);
    }
  }

  return (
    <View style={[styles.tile, equipped && styles.tileEquipped]}>
      <View style={styles.preview}>
        <ChomperSprite skin={skin} size={64} />
      </View>
      <Text style={styles.name}>{skin.name}</Text>
      <TouchableOpacity
        style={[
          styles.btn,
          equipped ? styles.btnEquipped : owned ? styles.btnEquip : styles.btnBuy,
        ]}
        onPress={onPress}
        disabled={busy || equipped}
      >
        {busy ? (
          <ActivityIndicator color="#141414" />
        ) : (
          <Text style={[styles.btnText, equipped && styles.btnTextEquipped]}>
            {equipped ? 'Equipped' : owned ? 'Equip' : formatPrice(skin.priceCents)}
          </Text>
        )}
      </TouchableOpacity>
    </View>
  );
}

/** The character store, shown as a bottom-sheet-style modal. */
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
          <ScrollView contentContainerStyle={styles.grid}>
            {SKINS.map((s) => (
              <SkinTile key={s.id} skin={s} />
            ))}
          </ScrollView>
          <StoreFooter />
        </View>
      </View>
    </Modal>
  );
}

/** Restore-purchases link (required by the App Store) + dev-mode notice. */
function StoreFooter() {
  const { restore, busy, paymentsEnabled } = useSkinStore();
  return (
    <View style={styles.footer}>
      <TouchableOpacity onPress={restore} disabled={busy}>
        <Text style={styles.restore}>Restore purchases</Text>
      </TouchableOpacity>
      {!paymentsEnabled && (
        <Text style={styles.devNote}>
          Dev mode — RevenueCat key not set; purchases granted locally.
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.55)' },
  sheet: {
    backgroundColor: theme.colors.panel,
    borderTopLeftRadius: theme.radius.lg,
    borderTopRightRadius: theme.radius.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingBottom: 36,
    maxHeight: '80%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
  },
  title: { color: theme.colors.textPrimary, fontSize: 22, fontWeight: '800' },
  close: { color: theme.colors.textSecondary, fontSize: 22, paddingHorizontal: 8 },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    gap: 12,
  },
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
  btn: { paddingVertical: 8, paddingHorizontal: 20, borderRadius: theme.radius.sm, minWidth: 96, alignItems: 'center' },
  btnBuy: { backgroundColor: theme.colors.accent },
  btnEquip: { backgroundColor: theme.colors.accentStrong },
  btnEquipped: { backgroundColor: theme.colors.card, borderWidth: 1, borderColor: theme.colors.border },
  btnText: { color: '#141414', fontWeight: '800', fontSize: 14 },
  btnTextEquipped: { color: theme.colors.textSecondary },
  footer: { alignItems: 'center', paddingTop: 18, gap: 6 },
  restore: { color: theme.colors.accent, fontSize: 14, fontWeight: '600' },
  devNote: { color: theme.colors.textMuted, fontSize: 11, textAlign: 'center', paddingHorizontal: 24 },
});
