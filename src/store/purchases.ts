import { Platform } from 'react-native';
import Constants from 'expo-constants';
import Purchases, {
  LOG_LEVEL,
  type PurchasesStoreProduct,
} from 'react-native-purchases';

/**
 * RevenueCat integration for the character store.
 *
 * Ownership is the source of truth on RevenueCat: a skin is "owned" iff its
 * entitlement is in the customer's ACTIVE entitlements. We never grant skins
 * locally in production.
 *
 * If no RevenueCat API key is configured (e.g. running in a dev build before you
 * set keys, or on the web prototype), PURCHASES_ENABLED is false and useSkinStore
 * falls back to a local dev-grant so the app still runs.
 */
const extra = Constants.expoConfig?.extra as
  | { rcIosKey?: string; rcAndroidKey?: string }
  | undefined;

const API_KEY =
  Platform.select({ ios: extra?.rcIosKey, android: extra?.rcAndroidKey }) ?? '';

export const PURCHASES_ENABLED = API_KEY.length > 0;

let configured = false;

/** Configure the SDK once. Safe to call repeatedly. */
export async function initPurchases(): Promise<void> {
  if (!PURCHASES_ENABLED || configured) return;
  Purchases.setLogLevel(LOG_LEVEL.WARN);
  Purchases.configure({ apiKey: API_KEY });
  configured = true;
}

/** The set of entitlement IDs the user currently owns. */
export async function activeEntitlements(): Promise<string[]> {
  if (!PURCHASES_ENABLED) return [];
  const info = await Purchases.getCustomerInfo();
  return Object.keys(info.entitlements.active);
}

/** Look up the live, localized price string for a product (e.g. "$1.99"). */
export async function priceFor(productId: string): Promise<string | null> {
  if (!PURCHASES_ENABLED) return null;
  const products = await Purchases.getProducts([productId]);
  return products[0]?.priceString ?? null;
}

/**
 * Purchase a skin by its store product id. Returns the user's active entitlements
 * after the transaction. Throws on real errors; resolves with current entitlements
 * if the user cancels.
 */
export async function purchaseProduct(productId: string): Promise<string[]> {
  if (!PURCHASES_ENABLED) throw new Error('Purchases not configured');
  const products = await Purchases.getProducts([productId]);
  const product = products[0] as PurchasesStoreProduct | undefined;
  if (!product) throw new Error(`Product not found: ${productId}`);
  try {
    const { customerInfo } = await Purchases.purchaseStoreProduct(product);
    return Object.keys(customerInfo.entitlements.active);
  } catch (e: unknown) {
    // RevenueCat sets userCancelled on a cancel — treat that as a no-op, not an error.
    if (e && typeof e === 'object' && 'userCancelled' in e && (e as { userCancelled: boolean }).userCancelled) {
      return activeEntitlements();
    }
    throw e;
  }
}

/** Restore previously purchased skins (required by App Store review). */
export async function restorePurchases(): Promise<string[]> {
  if (!PURCHASES_ENABLED) return [];
  const info = await Purchases.restorePurchases();
  return Object.keys(info.entitlements.active);
}
