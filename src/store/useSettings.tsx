import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Units } from '@/utils/format';

interface Settings {
  /** Turn-by-turn voice guidance on/off. */
  voiceOn: boolean;
  /** Distance units for banners/ETA. */
  units: Units;
  setVoiceOn: (v: boolean) => void;
  setUnits: (u: Units) => void;
}

const Ctx = createContext<Settings | null>(null);
const KEY = 'chomp.settings';

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [voiceOn, setVoiceOnState] = useState(true);
  const [units, setUnitsState] = useState<Units>('mi');

  // Hydrate persisted settings on boot.
  useEffect(() => {
    AsyncStorage.getItem(KEY).then((raw) => {
      if (!raw) return;
      try {
        const s = JSON.parse(raw) as Partial<Settings>;
        if (typeof s.voiceOn === 'boolean') setVoiceOnState(s.voiceOn);
        if (s.units === 'mi' || s.units === 'km') setUnitsState(s.units);
      } catch {
        // ignore corrupt settings
      }
    });
  }, []);

  const setVoiceOn = (v: boolean) => {
    setVoiceOnState(v);
    void AsyncStorage.setItem(KEY, JSON.stringify({ voiceOn: v, units }));
  };
  const setUnits = (u: Units) => {
    setUnitsState(u);
    void AsyncStorage.setItem(KEY, JSON.stringify({ voiceOn, units: u }));
  };

  const value = useMemo<Settings>(
    () => ({ voiceOn, units, setVoiceOn, setUnits }),
    [voiceOn, units],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useSettings(): Settings {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useSettings must be used inside <SettingsProvider>');
  return ctx;
}
