import { useEffect, useRef, useState } from 'react';
import * as Location from 'expo-location';
import type { UserFix } from '@/types/navigation';

/**
 * Subscribes to high-accuracy GPS and exposes the latest fix
 * ([lng, lat] + heading + speed). Returns `null` until the first fix arrives
 * or `permissionDenied` if the user said no.
 */
export function useUserLocation(): {
  fix: UserFix | null;
  permissionDenied: boolean;
} {
  const [fix, setFix] = useState<UserFix | null>(null);
  const [permissionDenied, setPermissionDenied] = useState(false);
  const subRef = useRef<Location.LocationSubscription | null>(null);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setPermissionDenied(true);
        return;
      }
      // Also request background so navigation survives a screen lock (iOS UIBackgroundModes).
      await Location.requestBackgroundPermissionsAsync().catch(() => undefined);

      subRef.current = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.BestForNavigation,
          distanceInterval: 1, // meters between updates
          timeInterval: 1000, // ms
        },
        (loc) => {
          if (cancelled) return;
          setFix({
            coord: [loc.coords.longitude, loc.coords.latitude],
            // `heading` is course-over-ground; -1 means unknown on iOS.
            heading:
              loc.coords.heading != null && loc.coords.heading >= 0
                ? loc.coords.heading
                : null,
            speed: loc.coords.speed ?? null,
          });
        },
      );
    })();

    return () => {
      cancelled = true;
      subRef.current?.remove();
    };
  }, []);

  return { fix, permissionDenied };
}
