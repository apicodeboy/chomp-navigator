import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Units } from '@/utils/format';

interface Settings {
  /** Turn-by-turn voice guidance on/off. */
  voiceOn: boolean;
  /** Distance units for banners/ETA. */
  units: Units;
  /** Route line color (hex). */
  lineColor: string;
  setVoiceOn: (v: boolean) => void;
  setUnits: (u: Units) => void;
  setLineColor: (c: string) => void;
}

const Ctx = createContext<Settings | null>(null);
const KEY = 'chomp.settings';
const DEFAULT_LINE = '#1d72ff'; // glossy blue route (reference look)

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [voiceOn, setVoiceOnState] = useState(true);
  const [units, setUnitsState] = useState<Units>('mi');
  const [lineColor, setLineColorState] = useState(DEFAULT_LINE);

  // Hydrate persisted settings on boot.
  useEffect(() => {
    AsyncStorage.getItem(KEY).then((raw) => {
      if (!raw) return;
      try {
        const s = JSON.parse(raw) as Partial<Settings>;
        if (typeof s.voiceOn === 'boolean') setVoiceOnState(s.voiceOn);
        if (s.units === 'mi' || s.units === 'km') setUnitsState(s.units);
        if (typeof s.lineColor === 'string') setLineColorState(s.lineColor);
      } catch {
        // ignore corrupt settings
      }
    });
  }, []);

  const persist = (next: { voiceOn: boolean; units: Units; lineColor: string }) =>
    void AsyncStorage.setItem(KEY, JSON.stringify(next));

  const setVoiceOn = (v: boolean) => {
    setVoiceOnState(v);
    persist({ voiceOn: v, units, lineColor });
  };
  const setUnits = (u: Units) => {
    setUnitsState(u);
    persist({ voiceOn, units: u, lineColor });
  };
  const setLineColor = (c: string) => {
    setLineColorState(c);
    persist({ voiceOn, units, lineColor: c });
  };

  const value = useMemo<Settings>(
    () => ({ voiceOn, units, lineColor, setVoiceOn, setUnits, setLineColor }),
    [voiceOn, units, lineColor],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useSettings(): Settings {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useSettings must be used inside <SettingsProvider>');
  return ctx;
}
