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
import { useMapStyle } from '@/store/useMapStyle';
import { useTickets } from '@/store/useTickets';
import { DEFAULT_SKIN_ID, SKINS, type SkinListing } from '@/store/skins';
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
  const { selectedId, equip, signedIn } = useSkinStore();
  const { owns, spend, enabled } = useTickets();
  const [busy, setBusy] = useState(false);

  const free = skin.ticketPrice === 0;
  const isDefault = skin.id === DEFAULT_SKIN_ID;
  const owned = free || owns(skin.id);
  const equipped = selectedId === skin.id;
  // Signed-out users can only use the default character; everything else is locked.
  const locked = !signedIn && !isDefault;

  async function onPress() {
    if (equipped) return;
    if (locked) {
      Alert.alert('Sign in required', 'Sign in to a Map WRLD account to unlock more characters and map styles.');
      return;
    }
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

  const label = locked
    ? '🔒 Locked'
    : equipped
      ? 'Equipped'
      : owned
        ? 'Equip'
        : free
          ? 'Free'
          : `🎟 ${skin.ticketPrice}`;

  return (
    <View style={[styles.tile, equipped && styles.tileEquipped]}>
      <View style={[styles.preview, locked && styles.previewLocked]}>
        <ChomperSprite skin={skin} size={64} />
      </View>
      <Text style={styles.name}>{skin.name}</Text>
      <TouchableOpacity
        style={[
          styles.btn,
          locked ? styles.btnLocked : equipped ? styles.btnEquipped : owned ? styles.btnEquip : styles.btnBuy,
        ]}
        onPress={onPress}
        disabled={busy || equipped}
      >
        {busy ? (
          <ActivityIndicator color={theme.colors.onAccent} />
        ) : (
          <Text style={[styles.btnText, (equipped || locked) && styles.btnTextEquipped]}>{label}</Text>
        )}
      </TouchableOpacity>
    </View>
  );
}

/** Map-style picker tile. Premium styles lock when signed out. */
function MapStyleRow() {
  const { styles: mapStyles, selectedId, select, signedIn } = useMapStyle();
  return (
    <View style={styles.mapRow}>
      {mapStyles.map((m) => {
        const active = selectedId === m.id;
        const locked = !!m.premium && !signedIn;
        return (
          <TouchableOpacity
            key={m.id}
            style={[styles.mapChip, active && styles.mapChipActive, locked && styles.mapChipLocked]}
            onPress={() =>
              locked
                ? Alert.alert('Sign in required', 'Sign in to a Map WRLD account to unlock more map styles.')
                : select(m.id)
            }
          >
            <Text style={[styles.mapChipText, active && styles.mapChipTextActive]}>
              {locked ? `🔒 ${m.name}` : m.name}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

export default function StoreScreen({ visible, onClose }: Props) {
  const { buyBundle, enabled } = useTickets();
  const { signedIn } = useSkinStore();

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
            {!signedIn && (
              <View style={styles.signInBanner}>
                <Text style={styles.signInText}>
                  🔒 Sign in to unlock more characters and map styles. Signed-out users use the default
                  character and map.
                </Text>
              </View>
            )}

            <Text style={styles.section}>Map Style</Text>
            <MapStyleRow />

            <Text style={styles.section}>Characters</Text>
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
  previewLocked: { opacity: 0.4 },
  name: { color: theme.colors.textPrimary, fontSize: 16, fontWeight: '700', marginVertical: 8 },
  btn: { paddingVertical: 8, paddingHorizontal: 18, borderRadius: theme.radius.sm, minWidth: 100, alignItems: 'center' },
  btnBuy: { backgroundColor: theme.colors.accent },
  btnEquip: { backgroundColor: theme.colors.accentStrong },
  btnEquipped: { backgroundColor: theme.colors.card, borderWidth: 1, borderColor: theme.colors.border },
  btnLocked: { backgroundColor: theme.colors.card, borderWidth: 1, borderColor: theme.colors.border },
  btnText: { color: theme.colors.onAccent, fontWeight: '800', fontSize: 14 },
  btnTextEquipped: { color: theme.colors.textSecondary },

  signInBanner: {
    backgroundColor: theme.colors.cardElevated,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.md,
    padding: 14,
    marginTop: 4,
    marginBottom: 4,
  },
  signInText: { color: theme.colors.textSecondary, fontSize: 13, lineHeight: 18 },

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
  mapChipLocked: { opacity: 0.55 },
  mapChipText: { color: theme.colors.textPrimary, fontWeight: '700', fontSize: 13 },
  mapChipTextActive: { color: theme.colors.onAccent },
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
