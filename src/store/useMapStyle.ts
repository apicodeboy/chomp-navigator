import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  DEFAULT_MAP_STYLE_ID,
  getMapStyle,
  MAP_STYLES,
  type MapStyleOption,
} from '@/config/mapbox';

const KEY_MAP_STYLE = 'chomp.mapStyle';

interface MapStyleStore {
  styles: MapStyleOption[];
  selectedId: string;
  styleURL: string;
  select: (id: string) => void;
}

// Shared context so the Settings picker and the MapView read/write the SAME
// state — otherwise tapping a style only updated Settings' own copy and the map
// never changed. All styles are free and available to everyone.
const Ctx = createContext<MapStyleStore | null>(null);

export function MapStyleProvider({ children }: { children: React.ReactNode }) {
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

  const value = useMemo<MapStyleStore>(() => {
    const style = getMapStyle(selectedId);
    return { styles: MAP_STYLES, selectedId: style.id, styleURL: style.url, select };
  }, [selectedId, select]);

  return React.createElement(Ctx.Provider, { value }, children);
}

export function useMapStyle(): MapStyleStore {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useMapStyle must be used inside <MapStyleProvider>');
  return ctx;
}
