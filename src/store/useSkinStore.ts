import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { DEFAULT_SKIN_ID, getSkin, SKINS, type SkinListing } from './skins';
import {
  activeEntitlements,
  initPurchases,
  PURCHASES_ENABLED,
  purchaseProduct,
  restorePurchases,
} from './purchases';

const KEY_SELECTED = 'chomp.selectedSkin';
const KEY_DEV_OWNED = 'chomp.devOwned'; // only used when RevenueCat is not configured

interface SkinStore {
  selected: SkinListing;
  selectedId: string;
  ownedIds: string[];
  /** True while talking to the store (purchase/restore in flight). */
  busy: boolean;
  select: (id: string) => void;
  /** Equip a skin without an ownership check (ownership enforced by Tickets). */
  equip: (id: string) => void;
  purchase: (id: string) => Promise<void>;
  restore: () => Promise<void>;
  owns: (id: string) => boolean;
  /** Whether real payments are wired up (vs. the dev fallback). */
  paymentsEnabled: boolean;
}

const Ctx = createContext<SkinStore | null>(null);

const FREE_IDS = SKINS.filter((s) => !s.entitlementId).map((s) => s.id);

/** Map the user's active RevenueCat entitlements back to skin IDs (+ free skins). */
function skinIdsFromEntitlements(entitlements: string[]): string[] {
  const owned = new Set(FREE_IDS);
  for (const s of SKINS) {
    if (s.entitlementId && entitlements.includes(s.entitlementId)) owned.add(s.id);
  }
  return Array.from(owned);
}

export function SkinStoreProvider({ children }: { children: React.ReactNode }) {
  const [selectedId, setSelectedId] = useState<string>(DEFAULT_SKIN_ID);
  const [ownedIds, setOwnedIds] = useState<string[]>(FREE_IDS);
  const [busy, setBusy] = useState(false);

  // Boot: restore selection, configure RevenueCat, hydrate ownership.
  useEffect(() => {
    (async () => {
      const sel = await AsyncStorage.getItem(KEY_SELECTED);
      if (sel) setSelectedId(sel);

      if (PURCHASES_ENABLED) {
        await initPurchases();
        const ents = await activeEntitlements();
        setOwnedIds(skinIdsFromEntitlements(ents));
      } else {
        // Dev/web fallback: ownership persisted locally (no real payments).
        const dev = await AsyncStorage.getItem(KEY_DEV_OWNED);
        const extra = dev ? (JSON.parse(dev) as string[]) : [];
        setOwnedIds(Array.from(new Set([...FREE_IDS, ...extra])));
      }
    })();
  }, []);

  const owns = useCallback((id: string) => ownedIds.includes(id), [ownedIds]);

  const select = useCallback(
    (id: string) => {
      if (!ownedIds.includes(id)) return;
      setSelectedId(id);
      void AsyncStorage.setItem(KEY_SELECTED, id);
    },
    [ownedIds],
  );

  const equip = useCallback((id: string) => {
    setSelectedId(id);
    void AsyncStorage.setItem(KEY_SELECTED, id);
  }, []);

  const purchase = useCallback(
    async (id: string) => {
      const skin = getSkin(id);
      if (!skin.productId) return; // free skin, nothing to buy
      setBusy(true);
      try {
        if (PURCHASES_ENABLED) {
          // Real money: RevenueCat is the source of truth for ownership.
          const ents = await purchaseProduct(skin.productId);
          setOwnedIds(skinIdsFromEntitlements(ents));
        } else {
          // Dev fallback: grant + persist locally so the flow is testable without keys.
          const next = Array.from(new Set([...ownedIds, id]));
          setOwnedIds(next);
          await AsyncStorage.setItem(
            KEY_DEV_OWNED,
            JSON.stringify(next.filter((x) => !FREE_IDS.includes(x))),
          );
        }
        equip(id);
      } finally {
        setBusy(false);
      }
    },
    [ownedIds, equip],
  );

  const restore = useCallback(async () => {
    setBusy(true);
    try {
      if (PURCHASES_ENABLED) {
        const ents = await restorePurchases();
        setOwnedIds(skinIdsFromEntitlements(ents));
      }
    } finally {
      setBusy(false);
    }
  }, []);

  const value = useMemo<SkinStore>(
    () => ({
      selected: getSkin(selectedId),
      selectedId,
      ownedIds,
      busy,
      select,
      equip,
      purchase,
      restore,
      owns,
      paymentsEnabled: PURCHASES_ENABLED,
    }),
    [selectedId, ownedIds, busy, select, equip, purchase, restore, owns],
  );

  return React.createElement(Ctx.Provider, { value }, children);
}

export function useSkinStore(): SkinStore {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useSkinStore must be used inside <SkinStoreProvider>');
  return ctx;
}
