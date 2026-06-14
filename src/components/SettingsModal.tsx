import React from 'react';
import { Modal, ScrollView, StyleSheet, Switch, Text, TouchableOpacity, View } from 'react-native';
import { useSettings } from '@/store/useSettings';
import { useMapStyle } from '@/store/useMapStyle';
import { theme } from '@/theme';

interface Props {
  visible: boolean;
  onClose: () => void;
}

const LINE_COLORS = ['#ffc400', '#3b82f6', '#22c55e', '#ef4444', '#a855f7', '#06b6d4', '#f97316', '#ffffff'];

export default function SettingsModal({ visible, onClose }: Props) {
  const { voiceOn, setVoiceOn, units, setUnits, lineColor, setLineColor } = useSettings();
  const { styles: mapStyles, selectedId, select } = useMapStyle();

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <View style={styles.header}>
            <Text style={styles.title}>Settings</Text>
            <TouchableOpacity onPress={onClose}>
              <Text style={styles.close}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={styles.scroll}>
            <View style={styles.row}>
              <Text style={styles.rowLabel}>Voice guidance</Text>
              <Switch
                value={voiceOn}
                onValueChange={setVoiceOn}
                trackColor={{ true: theme.colors.accent, false: theme.colors.border }}
              />
            </View>

            <Text style={styles.section}>Units</Text>
            <View style={styles.segment}>
              {(['mi', 'km'] as const).map((u) => {
                const active = units === u;
                return (
                  <TouchableOpacity
                    key={u}
                    style={[styles.segBtn, active && styles.segBtnActive]}
                    onPress={() => setUnits(u)}
                  >
                    <Text style={[styles.segText, active && styles.segTextActive]}>
                      {u === 'mi' ? 'Miles' : 'Kilometers'}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <Text style={styles.section}>Route Line Color</Text>
            <View style={styles.swatchRow}>
              {LINE_COLORS.map((c) => {
                const active = lineColor.toLowerCase() === c.toLowerCase();
                return (
                  <TouchableOpacity
                    key={c}
                    style={[styles.swatch, { backgroundColor: c }, active && styles.swatchActive]}
                    onPress={() => setLineColor(c)}
                  />
                );
              })}
            </View>

            <Text style={styles.section}>Map Style</Text>
            <View style={styles.chips}>
              {mapStyles.map((m) => {
                const active = selectedId === m.id;
                return (
                  <TouchableOpacity
                    key={m.id}
                    style={[styles.chip, active && styles.chipActive]}
                    onPress={() => select(m.id)}
                  >
                    <Text style={[styles.chipText, active && styles.chipTextActive]}>{m.name}</Text>
                  </TouchableOpacity>
                );
              })}
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
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: theme.colors.cardElevated,
    borderRadius: theme.radius.md,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  rowLabel: { color: theme.colors.textPrimary, fontSize: 16, fontWeight: '600' },
  section: { color: theme.colors.textPrimary, fontSize: 18, fontWeight: '800', marginTop: 22, marginBottom: 10 },
  swatchRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  swatch: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: theme.colors.border,
  },
  swatchActive: { borderWidth: 3, borderColor: theme.colors.textPrimary },
  segment: { flexDirection: 'row', backgroundColor: theme.colors.cardElevated, borderRadius: theme.radius.md, padding: 4, gap: 4 },
  segBtn: { flex: 1, paddingVertical: 12, borderRadius: theme.radius.sm, alignItems: 'center' },
  segBtnActive: { backgroundColor: theme.colors.accent },
  segText: { color: theme.colors.textSecondary, fontWeight: '700', fontSize: 14 },
  segTextActive: { color: theme.colors.onAccent },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    paddingVertical: 9,
    paddingHorizontal: 14,
    borderRadius: theme.radius.pill,
    backgroundColor: theme.colors.cardElevated,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  chipActive: { backgroundColor: theme.colors.accent, borderColor: theme.colors.accent },
  chipText: { color: theme.colors.textPrimary, fontWeight: '700', fontSize: 13 },
  chipTextActive: { color: theme.colors.onAccent },
});
