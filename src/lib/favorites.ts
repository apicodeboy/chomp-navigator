import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Place } from '@/types/navigation';
import type { Position } from 'geojson';

/**
 * Saved places ("Favorites"), stored locally on the device so they work offline
 * and without an account. (Can be upgraded later to sync with the Supabase
 * `saved_places` table for signed-in users.)
 */
export interface Favorite {
  id: string;
  name: string;
  address: string;
  coord: Position;
}

const KEY = 'chomp.favorites';

export async function getFavorites(): Promise<Favorite[]> {
  const raw = await AsyncStorage.getItem(KEY);
  if (!raw) return [];
  try {
    return JSON.parse(raw) as Favorite[];
  } catch {
    return [];
  }
}

export async function isFavorite(id: string): Promise<boolean> {
  return (await getFavorites()).some((f) => f.id === id);
}

export async function addFavorite(place: Place): Promise<Favorite[]> {
  const list = await getFavorites();
  if (list.some((f) => f.id === place.id)) return list;
  const next = [
    ...list,
    { id: place.id, name: place.name, address: place.address, coord: place.coord },
  ];
  await AsyncStorage.setItem(KEY, JSON.stringify(next));
  return next;
}

export async function removeFavorite(id: string): Promise<Favorite[]> {
  const next = (await getFavorites()).filter((f) => f.id !== id);
  await AsyncStorage.setItem(KEY, JSON.stringify(next));
  return next;
}
