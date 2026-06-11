import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import Constants from 'expo-constants';

/**
 * Supabase client for the Tickets backend (balances/ledger/RPCs).
 *
 * Reads URL + anon key from app config (which read them from .env). If they're
 * not set, `supabase` is null and the Tickets features degrade gracefully
 * (balance shows as unavailable, spends are blocked with a clear message) instead
 * of crashing — per the "degrade gracefully if not set up yet" requirement.
 */
const extra = Constants.expoConfig?.extra as
  | { supabaseUrl?: string; supabaseAnonKey?: string }
  | undefined;

const URL = extra?.supabaseUrl ?? '';
const ANON = extra?.supabaseAnonKey ?? '';

export const SUPABASE_ENABLED = URL.length > 0 && ANON.length > 0;

export const supabase: SupabaseClient | null = SUPABASE_ENABLED
  ? createClient(URL, ANON, {
      auth: {
        storage: AsyncStorage,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
      },
    })
  : null;

/**
 * Ensure there's a signed-in user. We use anonymous auth so a Maps/Waze-style
 * app has a stable `user_id` (required for server-owned balances) without forcing
 * a login wall. Users can later be upgraded to a real identity.
 */
export async function ensureAuth(): Promise<string | null> {
  if (!supabase) return null;
  const { data: { session } } = await supabase.auth.getSession();
  if (session?.user) return session.user.id;
  const { data, error } = await supabase.auth.signInAnonymously();
  if (error) {
    // eslint-disable-next-line no-console
    console.warn('[supabase] anonymous sign-in failed:', error.message);
    return null;
  }
  return data.user?.id ?? null;
}
