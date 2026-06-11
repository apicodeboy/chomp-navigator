import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { ChomperSprite } from './ChomperMarker';
import TicketBalance from './TicketBalance';
import { useSkinStore } from '@/store/useSkinStore';
import { useTickets } from '@/store/useTickets';
import { SKINS, type SkinListing } from '@/store/skins';
import { TICKETS_DISCLAIMER } from '@/lib/ticketsCopy';
import { theme } from '@/theme';

interface Props {
  visible: boolean;
  onClose: () => void;
}

const BUNDLES: { id: 'small' | 'medium' | 'large'; tickets: number; price: string }[] = [
  { id: 'small', tickets: 200, price: '$1.99' },
  { id: 'medium', tickets: 600, price: '$4.99' },
  { id: 'large', tickets: 1500, price: '$9.99' },
];

/** A character tile: animated preview + buy(Tickets)/equip button. */
function SkinTile({ skin }: { skin: SkinListing }) {
  const { selectedId, equip } = useSkinStore();
  const { owns, spend, enabled } = useTickets();
  const [busy, setBusy] = useState(false);

  const free = skin.ticketPrice === 0;
  const owned = free || owns(skin.id);
  const equipped = selectedId === skin.id;

  async function onPress() {
    if (equipped) return;
    if (owned) {
      equip(skin.id);
      return;
    }
    if (!enabled) {
      Alert.alert('Tickets unavailable', 'Connect the Tickets backend to buy this character.');
      return;
    }
    setBusy(true);
    try {
      const res = await spend(skin.id); // price re-validated server-side
      if (res.ok) {
        equip(skin.id);
      } else if (res.error === 'insufficient_funds') {
        Alert.alert('Not enough Tickets', `You need 🎟 ${skin.ticketPrice}. Earn more by driving, or buy a bundle.`);
      } else {
        Alert.alert('Purchase failed', res.error ?? 'Try again.');
      }
    } finally {
      setBusy(false);
    }
  }

  const label = equipped ? 'Equipped' : owned ? 'Equip' : free ? 'Free' : `🎟 ${skin.ticketPrice}`;

  return (
    <View style={[styles.tile, equipped && styles.tileEquipped]}>
      <View style={styles.preview}>
        <ChomperSprite skin={skin} size={64} />
      </View>
      <Text style={styles.name}>{skin.name}</Text>
      <TouchableOpacity
        style={[styles.btn, equipped ? styles.btnEquipped : owned ? styles.btnEquip : styles.btnBuy]}
        onPress={onPress}
        disabled={busy || equipped}
      >
        {busy ? (
          <ActivityIndicator color={theme.colors.onAccent} />
        ) : (
          <Text style={[styles.btnText, equipped && styles.btnTextEquipped]}>{label}</Text>
        )}
      </TouchableOpacity>
    </View>
  );
}

export default function StoreScreen({ visible, onClose }: Props) {
  const { buyBundle, enabled } = useTickets();

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <View style={styles.header}>
            <Text style={styles.title}>Character Store</Text>
            <View style={styles.headRight}>
              <TicketBalance />
              <TouchableOpacity onPress={onClose}>
                <Text style={styles.close}>✕</Text>
              </TouchableOpacity>
            </View>
          </View>

          <ScrollView contentContainerStyle={styles.scroll}>
            <View style={styles.grid}>
              {SKINS.map((s) => (
                <SkinTile key={s.id} skin={s} />
              ))}
            </View>

            <Text style={styles.section}>Get Tickets</Text>
            <Text style={styles.earnHint}>
              Earn 🎟 50 free for every ~50 mi you navigate — or top up:
            </Text>
            <View style={styles.bundles}>
              {BUNDLES.map((b) => (
                <TouchableOpacity
                  key={b.id}
                  style={[styles.bundle, !enabled && styles.bundleOff]}
                  onPress={() => enabled && buyBundle(b.id)}
                  disabled={!enabled}
                >
                  <Text style={styles.bundleTix}>🎟 {b.tickets}</Text>
                  <Text style={styles.bundlePrice}>{b.price}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {!enabled && (
              <Text style={styles.devNote}>
                Tickets backend not configured — set SUPABASE_URL / SUPABASE_ANON_KEY (see TICKETS.md).
              </Text>
            )}
            <Text style={styles.disclaimer}>{TICKETS_DISCLAIMER}</Text>
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
  headRight: { flexDirection: 'row', alignItems: 'center', gap: 14 },
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
  btnBuy: { backgroundColor: theme.colors.accent },
  btnEquip: { backgroundColor: theme.colors.accentStrong },
  btnEquipped: { backgroundColor: theme.colors.card, borderWidth: 1, borderColor: theme.colors.border },
  btnText: { color: theme.colors.onAccent, fontWeight: '800', fontSize: 14 },
  btnTextEquipped: { color: theme.colors.textSecondary },
  section: { color: theme.colors.textPrimary, fontSize: 18, fontWeight: '800', marginTop: 24 },
  earnHint: { color: theme.colors.textSecondary, fontSize: 13, marginTop: 4, marginBottom: 12 },
  bundles: { flexDirection: 'row', gap: 10 },
  bundle: {
    flex: 1,
    backgroundColor: theme.colors.cardElevated,
    borderRadius: theme.radius.md,
    paddingVertical: 16,
    alignItems: 'center',
    gap: 4,
  },
  bundleOff: { opacity: 0.5 },
  bundleTix: { color: theme.colors.textPrimary, fontWeight: '800', fontSize: 16 },
  bundlePrice: { color: theme.colors.accentStrong, fontWeight: '700', fontSize: 13 },
  devNote: { color: theme.colors.textMuted, fontSize: 11, textAlign: 'center', marginTop: 16 },
  disclaimer: { color: theme.colors.textMuted, fontSize: 11, lineHeight: 16, textAlign: 'center', marginTop: 16, paddingHorizontal: 8 },
});
