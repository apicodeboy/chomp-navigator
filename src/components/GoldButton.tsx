import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text, TouchableOpacity, View, type ViewStyle } from 'react-native';

type Variant = 'gold' | 'red';

interface Props {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  style?: ViewStyle;
  /** 'gold' = primary (Go/Start); 'red' = destructive (Back/Cancel). */
  variant?: Variant;
}

const PALETTE: Record<
  Variant,
  { base: string; baseLow: string; topGloss: string; border: string; glow: string; text: string }
> = {
  gold: {
    base: '#f2b400',
    baseLow: '#cf9200',
    topGloss: 'rgba(255,255,255,0.45)',
    border: '#ffe08a',
    glow: '#ffc400',
    text: '#1c1c1e',
  },
  red: {
    base: '#ef3b34',
    baseLow: '#c2261f',
    topGloss: 'rgba(255,255,255,0.32)',
    border: '#ff8f88',
    glow: '#ff3b30',
    text: '#ffffff',
  },
};

/**
 * Glossy primary/secondary action button. A bright top gloss + a continuously
 * sweeping light streak give it a shiny, "alive" feel. The streak/press effects
 * live on non-interactive inner layers (and the touch target never moves), so
 * the very first tap always registers.
 */
export default function GoldButton({ label, onPress, disabled, style, variant = 'gold' }: Props) {
  const p = PALETTE[variant];
  const press = useRef(new Animated.Value(1)).current;
  const sweep = useRef(new Animated.Value(0)).current;

  // Continuous shine sweep (on a pointer-events-none layer — never blocks taps).
  useEffect(() => {
    if (disabled) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(sweep, { toValue: 1, duration: 1500, useNativeDriver: true }),
        Animated.delay(1100),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [sweep, disabled]);

  const onPressIn = () =>
    Animated.spring(press, { toValue: 0.95, useNativeDriver: true, speed: 50, bounciness: 0 }).start();
  const onPressOut = () =>
    Animated.spring(press, { toValue: 1, useNativeDriver: true, speed: 30 }).start();

  const translateX = sweep.interpolate({ inputRange: [0, 1], outputRange: [-90, 230] });

  return (
    <View style={[styles.wrap, { shadowColor: p.glow }, style, disabled && styles.disabled]}>
      <TouchableOpacity
        activeOpacity={0.9}
        onPress={onPress}
        onPressIn={onPressIn}
        onPressOut={onPressOut}
        disabled={disabled}
        hitSlop={6}
      >
        <Animated.View
          style={[
            styles.btn,
            { backgroundColor: p.base, borderColor: p.border, transform: [{ scale: press }] },
          ]}
        >
          {/* Bottom shade for a rounded, 3D body. */}
          <View pointerEvents="none" style={[styles.bottomShade, { backgroundColor: p.baseLow }]} />
          {/* Bright top gloss. */}
          <View pointerEvents="none" style={[styles.gloss, { backgroundColor: p.topGloss }]} />
          {/* Sweeping light streak. */}
          <Animated.View
            pointerEvents="none"
            style={[styles.streak, { transform: [{ translateX }, { rotate: '20deg' }] }]}
          />
          <Text style={[styles.text, { color: p.text }]}>{label}</Text>
        </Animated.View>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    borderRadius: 14,
    shadowOpacity: 0.6,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 3 },
    elevation: 8,
  },
  disabled: { opacity: 0.45 },
  btn: {
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    borderWidth: 1,
  },
  bottomShade: { position: 'absolute', left: 0, right: 0, bottom: 0, height: '46%', opacity: 0.55 },
  gloss: { position: 'absolute', top: 0, left: 0, right: 0, height: '50%' },
  streak: {
    position: 'absolute',
    top: -10,
    bottom: -10,
    width: 36,
    backgroundColor: 'rgba(255,255,255,0.5)',
  },
  text: { fontWeight: '900', fontSize: 18, letterSpacing: -0.4 },
});
