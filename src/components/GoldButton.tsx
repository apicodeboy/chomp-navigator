import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text, TouchableOpacity, type ViewStyle } from 'react-native';

interface Props {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  style?: ViewStyle;
}

/**
 * Solid-gold primary action button with a glossy top highlight, a gold glow, and
 * a gentle "alive" pulse. Built on RN's Animated (no reanimated).
 */
export default function GoldButton({ label, onPress, disabled, style }: Props) {
  const pulse = useRef(new Animated.Value(0)).current;
  const press = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (disabled) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 1300, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0, duration: 1300, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [pulse, disabled]);

  // Instant tactile press feedback.
  const onPressIn = () =>
    Animated.spring(press, { toValue: 0.94, useNativeDriver: true, speed: 50, bounciness: 0 }).start();
  const onPressOut = () =>
    Animated.spring(press, { toValue: 1, useNativeDriver: true, speed: 30 }).start();

  const pulseScale = pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.03] });
  const scale = Animated.multiply(pulseScale, press);

  return (
    <Animated.View
      style={[styles.wrap, style, disabled && styles.disabled, { transform: [{ scale }] }]}
    >
      <TouchableOpacity
        activeOpacity={0.85}
        onPress={onPress}
        onPressIn={onPressIn}
        onPressOut={onPressOut}
        disabled={disabled}
        style={styles.btn}
      >
        {/* glossy highlight across the top half */}
        <Animated.View pointerEvents="none" style={styles.shine} />
        <Text style={styles.text}>{label}</Text>
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    borderRadius: 14,
    shadowColor: '#ffc400',
    shadowOpacity: 0.55,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 3 },
    elevation: 8,
  },
  disabled: { opacity: 0.45 },
  btn: {
    backgroundColor: '#e6a700',
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#ffd34d',
  },
  shine: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '52%',
    backgroundColor: 'rgba(255,255,255,0.30)',
  },
  text: { color: '#1c1c1e', fontWeight: '900', fontSize: 17, letterSpacing: 0.5 },
});
