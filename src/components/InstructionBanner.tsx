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
        <Text style={styles.instruction}>
          {text}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    // Pinned to the TOP — a glossy white "sticker" with a thick blue outline.
    position: 'absolute',
    top: 60,
    left: 12,
    right: 12,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderWidth: 4,
    borderColor: '#1d4ed8',
    paddingVertical: 14,
    paddingHorizontal: 18,
    borderRadius: 26,
    gap: 14,
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
  },
  arrow: { color: '#1d4ed8', fontSize: 46, fontWeight: '900', width: 54, textAlign: 'center' },
  textCol: { flex: 1 },
  dist: { color: '#1d4ed8', fontSize: 42, fontWeight: '900', letterSpacing: -1.4 },
  instruction: { ...theme.type.headline, color: '#111111', marginTop: 1 },
});
