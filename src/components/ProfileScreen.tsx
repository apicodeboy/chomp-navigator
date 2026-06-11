import React from 'react';
import { Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { ChomperSprite } from './ChomperMarker';
import { useSkinStore } from '@/store/useSkinStore';
import { useTickets } from '@/store/useTickets';
import { SKINS } from '@/store/skins';
import { MILESTONE_METERS, TICKETS_DISCLAIMER, TICKETS_PER_MILESTONE } from '@/lib/ticketsCopy';
import { theme } from '@/theme';

const METERS_PER_MILE = 1609.34;

/**
 * Profile + rewards: shows what the user has bought (owned characters), miles
 * traveled (server progress), Ticket balance, and progress toward the next free
 * distance-milestone reward.
 */
export default function ProfileScreen({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const { selectedId } = useSkinStore();
  const { balance, progressMeters, owns, enabled } = useTickets();

  // free skins are owned by default; plus anything bought (server owned set)
  const ownedSkins = SKINS.filter((s) => s.ticketPrice === 0 || owns(s.id));
  const miles = progressMeters / METERS_PER_MILE;
  const stepMi = MILESTONE_METERS / METERS_PER_MILE;
  const into = miles % stepMi;
  const pct = Math.min(100, (into / stepMi) * 100);
  const remain = stepMi - into;
  const milestones = Math.floor(progressMeters / MILESTONE_METERS);
  const equipped = SKINS.find((s) => s.id === selectedId) ?? SKINS[0];

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <View style={styles.header}>
            <Text style={styles.title}>Your Profile</Text>
            <TouchableOpacity onPress={onClose}>
              <Text style={styles.close}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={styles.scroll}>
            <View style={styles.heroRow}>
              <ChomperSprite skin={equipped} size={72} />
              <View style={styles.stats}>
                <Stat value={miles.toFixed(1)} label="miles driven" />
                <Stat value={`${ownedSkins.length}`} label="characters" />
                <Stat value={enabled && balance !== null ? `🎟 ${balance}` : '🎟 —'} label="tickets" />
              </View>
            </View>

            <Text style={styles.section}>Rewards</Text>
            <View style={styles.reward}>
              <Text style={styles.rewardTitle}>Next reward: 🎟 {TICKETS_PER_MILESTONE} free</Text>
              <View style={styles.bar}>
                <View style={[styles.fill, { width: `${pct}%` }]} />
              </View>
              <Text style={styles.rewardSub}>
                Drive {remain.toFixed(1)} more mi to earn 🎟 {TICKETS_PER_MILESTONE}. Earned so far:
                {' '}🎟 {milestones * TICKETS_PER_MILESTONE} across {milestones} milestone
                {milestones === 1 ? '' : 's'}.
              </Text>
            </View>

            <Text style={styles.section}>Your Characters ({ownedSkins.length})</Text>
            <View style={styles.grid}>
              {ownedSkins.map((s) => (
                <View key={s.id} style={styles.tile}>
                  <ChomperSprite skin={s} size={56} />
                  <Text style={styles.name}>{s.name}</Text>
                  {selectedId === s.id && <Text style={styles.equipped}>Equipped</Text>}
                </View>
              ))}
            </View>

            <Text style={styles.disclaimer}>{TICKETS_DISCLAIMER}</Text>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
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
  heroRow: { flexDirection: 'row', alignItems: 'center', gap: 18, paddingVertical: 8 },
  stats: { flex: 1, flexDirection: 'row', justifyContent: 'space-around' },
  stat: { alignItems: 'center' },
  statValue: { color: theme.colors.textPrimary, fontSize: 20, fontWeight: '800' },
  statLabel: { color: theme.colors.textSecondary, fontSize: 12, marginTop: 2 },
  section: { color: theme.colors.textPrimary, fontSize: 18, fontWeight: '800', marginTop: 22, marginBottom: 10 },
  reward: { backgroundColor: theme.colors.cardElevated, borderRadius: theme.radius.md, padding: 16 },
  rewardTitle: { color: theme.colors.textPrimary, fontWeight: '800', fontSize: 15 },
  bar: { height: 12, backgroundColor: theme.colors.border, borderRadius: 8, overflow: 'hidden', marginVertical: 10 },
  fill: { height: '100%', backgroundColor: theme.colors.accent },
  rewardSub: { color: theme.colors.textSecondary, fontSize: 13 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  tile: {
    width: '30%',
    backgroundColor: theme.colors.cardElevated,
    borderRadius: theme.radius.md,
    padding: 12,
    alignItems: 'center',
    gap: 6,
  },
  name: { color: theme.colors.textPrimary, fontSize: 13, fontWeight: '700' },
  equipped: { color: theme.colors.accentStrong, fontSize: 11, fontWeight: '700' },
  disclaimer: { color: theme.colors.textMuted, fontSize: 11, lineHeight: 16, textAlign: 'center', marginTop: 20, paddingHorizontal: 8 },
});
