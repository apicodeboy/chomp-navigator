import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Place } from '@/types/navigation';

/** Recently searched/visited places, stored locally (most-recent first). */
const KEY = 'chomp.recents';
const MAX = 8;

export async function getRecents(): Promise<Place[]> {
  const raw = await AsyncStorage.getItem(KEY);
  if (!raw) return [];
  try {
    return JSON.parse(raw) as Place[];
  } catch {
    return [];
  }
}

export async function addRecent(p: Place): Promise<void> {
  const list = (await getRecents()).filter((r) => r.id !== p.id);
  const next = [p, ...list].slice(0, MAX);
  await AsyncStorage.setItem(KEY, JSON.stringify(next));
}

/** Remove one recent place; returns the updated list. */
export async function removeRecent(id: string): Promise<Place[]> {
  const next = (await getRecents()).filter((r) => r.id !== id);
  await AsyncStorage.setItem(KEY, JSON.stringify(next));
  return next;
}

export async function clearRecents(): Promise<void> {
  await AsyncStorage.removeItem(KEY);
}
