import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Image, StyleSheet, View } from 'react-native';
import Mapbox from '@rnmapbox/maps';
import type { Position } from 'geojson';

/**
 * A character "skin". Swapping characters in your future store = passing a
 * different skin object here. The placeholder asset is generic geometry — replace
 * `sheet` with your own ORIGINAL sprite art (no trademarked characters).
 */
export interface ChomperSkin {
  /** require(...) of a horizontal sprite sheet PNG (animated chomper skins). */
  sheet?: ReturnType<typeof require>;
  /** Number of frames in the sheet. */
  frames: number;
  /** Source frame size in px (assumes square frames laid out horizontally). */
  frameSize: number;
  /**
   * Optional full-art image (require(...)). When set, the marker renders this
   * static artwork instead of the animated sprite sheet (no chomp animation).
   * Used for BOTH idle and navigating unless `navImage` overrides nav.
   */
  image?: ReturnType<typeof require>;
  /**
   * Optional override used ONLY while navigating. Lets the default skin show a
   * different idle vs. nav marker (e.g. gold disk when idle → black arrow once a
   * route starts). Selected characters omit this, so they stay the same in both.
   */
  navImage?: ReturnType<typeof require>;
}

/** Default fallback skin: gold disk when idle, black arrow while navigating. */
export const DEFAULT_SKIN: ChomperSkin = {
  image: require('../../assets/marker-disk.png'),
  navImage: require('../../assets/marker-arrow.png'),
  frames: 1,
  frameSize: 256,
};

interface Props {
  /** Snapped position on the route [lng, lat]. */
  coordinate: Position;
  /**
   * On-screen rotation in degrees. Pass (routeBearing - cameraHeading): in
   * course-up follow mode that's ~0 (chomper points up = forward). When the user
   * rotates the map manually, this keeps the chomper aimed down the route.
   */
  rotationDeg: number;
  /** Rendered size on screen, px. */
  size?: number;
  /** Chomp animation frames per second. */
  fps?: number;
  skin?: ChomperSkin;
  /** 'nav' selects the skin's navImage (the default skin's arrow). */
  mode?: 'idle' | 'nav';
}

/**
 * Cycles through the sprite-sheet frames to produce the open/close chomp.
 * Exported so the store can show a live animated preview of each skin.
 */
export function ChomperSprite({
  skin,
  size,
  fps = 10,
  mode = 'idle',
}: {
  skin: ChomperSkin;
  size: number;
  fps?: number;
  mode?: 'idle' | 'nav';
}) {
  // While navigating, prefer the skin's navImage (default skin's arrow); else
  // fall back to its full-art image (selected characters use the same in both).
  const fullArt = (mode === 'nav' && skin.navImage) || skin.image;

  const [frame, setFrame] = useState(0);
  useEffect(() => {
    if (fullArt) return; // full-art skins don't animate
    const id = setInterval(
      () => setFrame((f) => (f + 1) % skin.frames),
      1000 / fps,
    );
    return () => clearInterval(id);
  }, [skin.frames, fps, fullArt]);

  // Full-art character: render the static image upright.
  if (fullArt) {
    return (
      <Image
        source={fullArt}
        style={{ width: size, height: size }}
        resizeMode="contain"
      />
    );
  }

  return (
    // Clip to one frame; shift the wide sheet left to reveal the current frame.
    <View style={[styles.clip, { width: size, height: size }]}>
      <Image
        source={skin.sheet}
        style={{
          width: size * skin.frames, // whole sheet, scaled to `size` per frame
          height: size,
          transform: [{ translateX: -frame * size }],
        }}
        resizeMode="stretch"
      />
    </View>
  );
}

export default function ChomperMarker({
  coordinate,
  rotationDeg,
  size = 46,
  fps = 10,
  skin = DEFAULT_SKIN,
  mode = 'idle',
}: Props) {
  // Smoothly animate rotation so the chomper doesn't snap when the bearing jumps.
  const rot = useRef(new Animated.Value(rotationDeg)).current;
  useEffect(() => {
    Animated.timing(rot, {
      toValue: rotationDeg,
      duration: 200,
      easing: Easing.out(Easing.quad),
      useNativeDriver: true,
    }).start();
  }, [rotationDeg, rot]);

  const spin = rot.interpolate({
    inputRange: [-360, 360],
    outputRange: ['-360deg', '360deg'],
  });

  return (
    <Mapbox.MarkerView
      coordinate={coordinate}
      anchor={{ x: 0.5, y: 0.5 }}
      allowOverlap
    >
      <Animated.View style={{ transform: [{ rotate: spin }] }}>
        <ChomperSprite skin={skin} size={size} fps={fps} mode={mode} />
      </Animated.View>
    </Mapbox.MarkerView>
  );
}

const styles = StyleSheet.create({
  clip: { overflow: 'hidden' },
});
