import { useCallback, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  DEFAULT_MAP_STYLE_ID,
  getMapStyle,
  MAP_STYLES,
} from '@/config/mapbox';

const KEY_MAP_STYLE = 'chomp.mapStyle';

/** Selected map style. All styles are free and available to everyone. */
export function useMapStyle() {
  const [selectedId, setSelectedId] = useState<string>(DEFAULT_MAP_STYLE_ID);

  // Restore the saved selection on boot.
  useEffect(() => {
    AsyncStorage.getItem(KEY_MAP_STYLE).then((id) => {
      if (id) setSelectedId(id);
    });
  }, []);

  const select = useCallback((id: string) => {
    const style = getMapStyle(id);
    setSelectedId(style.id);
    void AsyncStorage.setItem(KEY_MAP_STYLE, style.id);
  }, []);

  const style = getMapStyle(selectedId);

  return {
    styles: MAP_STYLES,
    selectedId: style.id,
    styleURL: style.url,
    select,
  };
}
