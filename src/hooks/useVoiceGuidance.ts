import { useEffect, useRef } from 'react';
import * as Speech from 'expo-speech';
import type { NavProgress } from '@/types/navigation';
import type { NavStatus } from './useNavigation';

/**
 * Spoken turn-by-turn driven by Mapbox's own voiceInstructions.
 *
 * Each step carries an array of voice prompts, each with:
 *   - announcement: ready-made text ("In 200 meters, turn left onto Main Street")
 *   - distanceAlongGeometry: how far BEFORE the maneuver to play it (meters)
 *
 * We simply play each prompt once, when the remaining distance to the maneuver
 * (`distToManeuver`) drops to or below its trigger distance. No hand-rolled phrasing
 * or distance bands — Mapbox decides what to say and when.
 */
export function useVoiceGuidance(
  progress: NavProgress | null,
  status: NavStatus,
  enabled: boolean,
) {
  // Which step we're announcing for, and which of its prompts we've already played.
  const stepIndex = useRef<number>(-1);
  const played = useRef<Set<number>>(new Set());
  const arrivalSpoken = useRef(false);

  // Announce arrival once.
  useEffect(() => {
    if (status === 'arrived' && enabled && !arrivalSpoken.current) {
      arrivalSpoken.current = true;
      Speech.speak('You have arrived at your destination.');
    }
    if (status !== 'arrived') arrivalSpoken.current = false;
  }, [status, enabled]);

  useEffect(() => {
    if (!enabled || status !== 'navigating' || !progress?.currentStep) return;

    // New step → reset which prompts we've played.
    if (progress.stepIndex !== stepIndex.current) {
      stepIndex.current = progress.stepIndex;
      played.current = new Set();
    }

    const { distToManeuver, currentStep } = progress;
    currentStep.voiceInstructions.forEach((vi, i) => {
      if (distToManeuver <= vi.distanceAlongGeometry && !played.current.has(i)) {
        played.current.add(i);
        Speech.speak(vi.announcement); // Mapbox's ready-made text
      }
    });
  }, [progress, status, enabled]);

  // Stop any in-flight speech when guidance is muted.
  useEffect(() => {
    if (!enabled) Speech.stop();
  }, [enabled]);
}
