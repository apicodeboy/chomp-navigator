import { useCallback, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuthAccount } from '@/hooks/useAuthAccount';
import {
  DEFAULT_MAP_STYLE_ID,
  getMapStyle,
  MAP_STYLES,
  type MapStyleOption,
} from '@/config/mapbox';

const KEY_MAP_STYLE = 'chomp.mapStyle';

/**
 * Selected map style, gated on auth. Signed-out (anonymous / no account) users
 * are locked to the default style; premium styles require a real account.
 */
export function useMapStyle() {
  const { signedIn } = useAuthAccount();
  const [selectedId, setSelectedId] = useState<string>(DEFAULT_MAP_STYLE_ID);

  // Restore the saved selection on boot.
  useEffect(() => {
    AsyncStorage.getItem(KEY_MAP_STYLE).then((id) => {
      if (id) setSelectedId(id);
    });
  }, []);

  // While signed out, force a premium style back to the default.
  useEffect(() => {
    if (!signedIn && getMapStyle(selectedId).premium) {
      setSelectedId(DEFAULT_MAP_STYLE_ID);
      void AsyncStorage.setItem(KEY_MAP_STYLE, DEFAULT_MAP_STYLE_ID);
    }
  }, [signedIn, selectedId]);

  const select = useCallback(
    (id: string) => {
      const style = getMapStyle(id);
      if (style.premium && !signedIn) return; // premium styles need a real account
      setSelectedId(style.id);
      void AsyncStorage.setItem(KEY_MAP_STYLE, style.id);
    },
    [signedIn],
  );

  // The effective style url, never premium while signed out.
  const effective: MapStyleOption =
    !signedIn && getMapStyle(selectedId).premium
      ? getMapStyle(DEFAULT_MAP_STYLE_ID)
      : getMapStyle(selectedId);

  return {
    styles: MAP_STYLES,
    selectedId: effective.id,
    styleURL: effective.url,
    select,
    signedIn,
  };
}
