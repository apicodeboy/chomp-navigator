import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { formatDistance, type Units } from '@/utils/format';
import { theme } from '@/theme';
import type { BannerInstruction, RouteStep } from '@/types/navigation';

interface Props {
  step: RouteStep | null;
  distanceM: number;
  units: Units;
}

/**
 * Pick the banner that's currently active for this step. A step can carry several
 * banners with different `distanceAlongGeometry` triggers (e.g. a far "in 1 mile"
 * one and a near "now" one). The active banner is the most recently triggered:
 * the smallest trigger distance that is still >= our remaining distance.
 */
function activeBanner(step: RouteStep | null, distanceM: number): BannerInstruction | null {
  if (!step || step.bannerInstructions.length === 0) return null;
  const triggered = step.bannerInstructions.filter(
    (b) => b.distanceAlongGeometry >= distanceM,
  );
  if (triggered.length) {
    return triggered.reduce((a, b) =>
      b.distanceAlongGeometry < a.distanceAlongGeometry ? b : a,
    );
  }
  // None triggered yet → show the earliest (largest trigger distance).
  return step.bannerInstructions.reduce((a, b) =>
    b.distanceAlongGeometry > a.distanceAlongGeometry ? b : a,
  );
}

/** Arrow glyph from a maneuver type + modifier. */
function arrowFor(type?: string, modifier?: string): string {
  const m = modifier ?? '';
  if (type === 'arrive') return '◎';
  if (m.includes('uturn')) return '↩';
  if (m.includes('left')) return m.includes('slight') ? '↖' : '←';
  if (m.includes('right')) return m.includes('slight') ? '↗' : '→';
  return '↑';
}

/** Top banner: maneuver arrow + instruction text + distance to it. */
export default function InstructionBanner({ step, distanceM, units }: Props) {
  const banner = activeBanner(step, distanceM);
  // Prefer Mapbox's banner text; fall back to the step's maneuver instruction.
  const text = banner?.primary.text ?? step?.instruction ?? 'Head to your route';
  const type = banner?.primary.type ?? step?.type;
  const modifier = banner?.primary.modifier ?? step?.modifier;

  return (
    <View style={styles.wrap} pointerEvents="none">
      <Text style={styles.arrow}>{arrowFor(type, modifier)}</Text>
      <View style={styles.textCol}>
        <Text style={styles.dist}>{formatDistance(distanceM, units)}</Text>
        <Text style={styles.instruction} numberOfLines={2}>
          {text}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.overlay,
    borderWidth: 1,
    borderColor: theme.colors.border,
    marginHorizontal: 12,
    marginTop: 8,
    padding: 14,
    borderRadius: theme.radius.md,
    gap: 14,
  },
  arrow: { color: theme.colors.textPrimary, fontSize: 40, fontWeight: '800', width: 48, textAlign: 'center' },
  textCol: { flex: 1 },
  dist: { color: theme.colors.textPrimary, fontSize: 22, fontWeight: '800' },
  instruction: { color: theme.colors.textPrimary, fontSize: 15, marginTop: 2 },
});
