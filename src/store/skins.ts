import type { ChomperSkin } from '@/components/ChomperMarker';

/**
 * A purchasable character. Extends the render-time ChomperSkin with store metadata.
 * `priceCents: 0` = free / owned by default. Real pricing should come from your IAP
 * provider (App Store / Play / RevenueCat) — these numbers are just for the UI.
 */
export interface SkinListing extends ChomperSkin {
  id: string;
  name: string;
  /** Fallback display price (cents) for legacy real-money flows. */
  priceCents: number;
  /**
   * Price in Tickets. MUST match the server `ticket_catalog` row — the server
   * is the source of truth and re-validates this on spend. 0 = free.
   */
  ticketPrice: number;
  /** Hex color for the store swatch/preview. */
  swatch: string;
  /**
   * App Store / Play product identifier for this skin. Undefined = free.
   * Create these as non-consumable IAPs and attach them in RevenueCat.
   */
  productId?: string;
  /**
   * RevenueCat entitlement identifier that unlocks this skin. Ownership is derived
   * from the user's ACTIVE entitlements, not stored locally. Undefined = free.
   */
  entitlementId?: string;
}

/**
 * The catalog. Each `sheet` is a placeholder — swap in your own ORIGINAL art.
 * Sheets must be a horizontal strip; if your frame count/size differs, update
 * `frames`/`frameSize` per entry.
 */
export const SKINS: SkinListing[] = [
  {
    id: 'classic',
    name: 'Classic',
    priceCents: 0,
    ticketPrice: 0,
    swatch: '#FFD400',
    sheet: require('../../assets/chomper.png'),
    frames: 6,
    frameSize: 128,
  },
  {
    id: 'mint',
    name: 'Mint',
    priceCents: 0,
    ticketPrice: 0,
    swatch: '#50E0B4',
    sheet: require('../../assets/chomper-mint.png'),
    frames: 6,
    frameSize: 128,
  },
  {
    id: 'grape',
    name: 'Grape',
    priceCents: 0,
    ticketPrice: 0,
    swatch: '#B478FF',
    sheet: require('../../assets/chomper-grape.png'),
    frames: 6,
    frameSize: 128,
  },
  {
    id: 'coral',
    name: 'Coral',
    priceCents: 0,
    ticketPrice: 0,
    swatch: '#FF6E6E',
    sheet: require('../../assets/chomper-coral.png'),
    frames: 6,
    frameSize: 128,
  },
  {
    id: 'sky',
    name: 'Sky',
    priceCents: 0,
    ticketPrice: 0,
    swatch: '#7CC4FF',
    sheet: require('../../assets/chomper-sky.png'),
    frames: 6,
    frameSize: 128,
  },
  {
    id: 'lime',
    name: 'Lime',
    priceCents: 0,
    ticketPrice: 0,
    swatch: '#B6E000',
    sheet: require('../../assets/chomper-lime.png'),
    frames: 6,
    frameSize: 128,
  },
  {
    id: 'oni',
    name: 'Red Oni',
    priceCents: 0,
    ticketPrice: 0,
    swatch: '#D4202A',
    image: require('../../assets/character-oni.png'),
    frames: 1,
    frameSize: 256,
  },
  {
    id: 'warpaint',
    name: 'War Paint',
    priceCents: 0,
    ticketPrice: 0,
    swatch: '#E0A44E',
    image: require('../../assets/character-warpaint.png'),
    frames: 1,
    frameSize: 256,
  },
];

export const DEFAULT_SKIN_ID = 'classic';

export function getSkin(id: string): SkinListing {
  return SKINS.find((s) => s.id === id) ?? SKINS[0];
}

export function formatPrice(cents: number): string {
  return cents === 0 ? 'Free' : `$${(cents / 100).toFixed(2)}`;
}
