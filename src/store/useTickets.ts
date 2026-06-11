import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { Linking } from 'react-native';
import { ensureAuth, SUPABASE_ENABLED, supabase } from '@/lib/supabase';

export interface SpendResult {
  ok: boolean;
  error?: 'insufficient_funds' | 'tickets_unavailable' | 'unknown_item' | string;
  balance?: number;
  alreadyOwned?: boolean;
}

interface TicketsStore {
  /** Server balance (null while loading / when backend not configured). */
  balance: number | null;
  /** Lifetime distance navigated, meters (from server progress). */
  progressMeters: number;
  /** Item ids the user owns (from server). */
  owned: Set<string>;
  /** Whether the Tickets backend is configured + reachable. */
  enabled: boolean;
  loading: boolean;
  /** Spend Tickets on a catalog item (price validated server-side). */
  spend: (itemId: string) => Promise<SpendResult>;
  /** Report monotonic lifetime distance (meters) → server credits milestones. */
  reportDistance: (totalMeters: number) => Promise<void>;
  /** Start a Stripe Checkout to buy a Ticket bundle (opens the browser). */
  buyBundle: (bundle: 'small' | 'medium' | 'large') => Promise<void>;
  refresh: () => Promise<void>;
  owns: (itemId: string) => boolean;
}

const Ctx = createContext<TicketsStore | null>(null);

export function TicketsProvider({ children }: { children: React.ReactNode }) {
  const [balance, setBalance] = useState<number | null>(null);
  const [progressMeters, setProgressMeters] = useState(0);
  const [owned, setOwned] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(SUPABASE_ENABLED);
  const userId = useRef<string | null>(null);

  const refresh = useCallback(async () => {
    if (!supabase || !userId.current) return;
    const [{ data: bal }, { data: items }, { data: prog }] = await Promise.all([
      supabase.from('ticket_balances').select('balance').maybeSingle(),
      supabase.from('owned_items').select('item_id'),
      supabase.from('user_progress').select('total_meters').maybeSingle(),
    ]);
    setBalance(bal?.balance ?? 0);
    setOwned(new Set((items ?? []).map((r: { item_id: string }) => r.item_id)));
    setProgressMeters(prog?.total_meters ?? 0);
  }, []);

  // Boot: anonymous auth, then load balance + items.
  useEffect(() => {
    if (!SUPABASE_ENABLED) {
      setLoading(false);
      return;
    }
    (async () => {
      userId.current = await ensureAuth();
      await refresh().catch(() => undefined);
      setLoading(false);
    })();
  }, [refresh]);

  const spend = useCallback(
    async (itemId: string): Promise<SpendResult> => {
      if (!supabase) return { ok: false, error: 'tickets_unavailable' };
      const { data, error } = await supabase.rpc('spend_on_item', { p_item: itemId });
      if (error) return { ok: false, error: error.message };
      const res = data as { ok: boolean; error?: string; balance?: number; already_owned?: boolean };
      if (res.ok) await refresh();
      return {
        ok: res.ok,
        error: res.error,
        balance: res.balance,
        alreadyOwned: res.already_owned,
      };
    },
    [refresh],
  );

  const reportDistance = useCallback(
    async (totalMeters: number) => {
      if (!supabase || !userId.current) return;
      const { error } = await supabase.rpc('report_distance', {
        p_total_meters: Math.round(totalMeters),
      });
      if (!error) await refresh();
    },
    [refresh],
  );

  const buyBundle = useCallback(async (bundle: 'small' | 'medium' | 'large') => {
    if (!supabase) return;
    const { data, error } = await supabase.functions.invoke('create-checkout', {
      body: { bundle },
    });
    const url = (data as { url?: string } | null)?.url;
    if (!error && url) await Linking.openURL(url);
  }, []);

  const owns = useCallback((id: string) => owned.has(id), [owned]);

  const value = useMemo<TicketsStore>(
    () => ({
      balance,
      progressMeters,
      owned,
      enabled: SUPABASE_ENABLED,
      loading,
      spend,
      reportDistance,
      buyBundle,
      refresh,
      owns,
    }),
    [balance, progressMeters, owned, loading, spend, reportDistance, buyBundle, refresh, owns],
  );

  return React.createElement(Ctx.Provider, { value }, children);
}

export function useTickets(): TicketsStore {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useTickets must be used inside <TicketsProvider>');
  return ctx;
}
