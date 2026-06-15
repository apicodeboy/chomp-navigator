import React, { useRef, useState } from 'react';
import {
  Animated,
  PanResponder,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { formatDistance, type Units } from '@/utils/format';
import { theme } from '@/theme';

interface Props {
  distRemainingM: number;
  remainingSec: number;
  units: Units;
  onStop: () => void;
  onAddStop: () => void;
  onShareEta: () => void;
  onCharacterSelect: () => void;
}

const ACTIONS_HEIGHT = 92;

function fmtEta(remainingSec: number): string {
  const mins = Math.max(1, Math.round(remainingSec / 60));
  const eta = new Date(Date.now() + mins * 60_000);
  const hh = eta.getHours().toString().padStart(2, '0');
  const mm = eta.getMinutes().toString().padStart(2, '0');
  const label = mins >= 60 ? `${Math.floor(mins / 60)}h ${mins % 60}m` : `${mins} min`;
  return `${label} · ${hh}:${mm}`;
}

/**
 * Bottom navigation panel: ETA + End, with a handle you can slide/tap up to
 * reveal more actions (Add Stop, Share ETA, Character Select). Uses RN's built-in
 * Animated/PanResponder — deliberately no reanimated (it crashes in worklets on
 * device with the bottom-sheet lib).
 */
export default function NavPanel({
  distRemainingM,
  remainingSec,
  units,
  onStop,
  onAddStop,
  onShareEta,
  onCharacterSelect,
}: Props) {
  const [expanded, setExpanded] = useState(false);
  const anim = useRef(new Animated.Value(0)).current;

  const setOpen = (open: boolean) => {
    setExpanded(open);
    Animated.timing(anim, {
      toValue: open ? 1 : 0,
      duration: 220,
      useNativeDriver: false, // animating height
    }).start();
  };

  const pan = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_e, g) => Math.abs(g.dy) > 6,
      onPanResponderRelease: (_e, g) => {
        if (g.dy < -20) setOpen(true);
        else if (g.dy > 20) setOpen(false);
      },
    }),
  ).current;

  const actionsHeight = anim.interpolate({ inputRange: [0, 1], outputRange: [0, ACTIONS_HEIGHT] });

  return (
    <View style={styles.wrap}>
      <View {...pan.panHandlers}>
        <TouchableOpacity activeOpacity={0.8} onPress={() => setOpen(!expanded)}>
          <View style={styles.handle} />
        </TouchableOpacity>

        <View style={styles.etaRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.eta}>
              Arriving in <Text style={styles.etaMins}>{Math.max(1, Math.round(remainingSec / 60))} min</Text>
            </Text>
            <Text style={styles.sub}>{formatDistance(distRemainingM, units)} away · {fmtEta(remainingSec).split('· ')[1] ?? ''}</Text>
          </View>
          <TouchableOpacity onPress={onStop} hitSlop={10} style={styles.stopBtn}>
            <Text style={styles.stop}>End</Text>
          </TouchableOpacity>
        </View>
      </View>

      <Animated.View style={[styles.actions, { height: actionsHeight, opacity: anim }]}>
        <Action icon="➕" label="Add Stop" onPress={onAddStop} />
        <Action icon="📤" label="Share ETA" onPress={onShareEta} />
        <Action icon="🙂" label="Character" onPress={onCharacterSelect} />
      </Animated.View>
    </View>
  );
}

function Action({ icon, label, onPress }: { icon: string; label: string; onPress: () => void }) {
  return (
    <TouchableOpacity style={styles.action} onPress={onPress}>
      <View style={styles.actionCircle}>
        <Text style={styles.actionIcon}>{icon}</Text>
      </View>
      <Text style={styles.actionLabel}>{label}</Text>
    </TouchableOpacity>
  );
}

const BLUE = '#1d72ff';

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    left: 12,
    right: 12,
    bottom: 24,
    backgroundColor: BLUE,
    borderRadius: theme.radius.lg,
    paddingHorizontal: 20,
    paddingBottom: 16,
    paddingTop: 10,
    shadowColor: BLUE,
    shadowOpacity: 0.45,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
  },
  handle: {
    alignSelf: 'center',
    width: 40,
    height: 5,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.5)',
    marginBottom: 12,
  },
  etaRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  eta: { color: '#ffffff', fontSize: 26, fontWeight: '800', letterSpacing: -0.6 },
  etaMins: { color: '#9fd4ff' },
  sub: { color: 'rgba(255,255,255,0.85)', fontSize: 14, marginTop: 3, fontWeight: '500' },
  stopBtn: { backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: theme.radius.pill, paddingHorizontal: 18, paddingVertical: 10 },
  stop: { color: '#ffffff', fontSize: 16, fontWeight: '800' },
  actions: { flexDirection: 'row', justifyContent: 'space-around', overflow: 'hidden' },
  action: { alignItems: 'center', paddingTop: 16 },
  actionCircle: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionIcon: { fontSize: 22 },
  actionLabel: { color: 'rgba(255,255,255,0.9)', fontSize: 12, marginTop: 6, fontWeight: '600' },
});
