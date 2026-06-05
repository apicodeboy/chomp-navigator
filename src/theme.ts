/**
 * Central design tokens — the "outletbuddy" dark theme.
 * Dark near-black surfaces, a lavender/purple accent (+ glow), rounded cards,
 * green "open/go" status. Import `theme` anywhere instead of hardcoding colors.
 */
export const theme = {
  colors: {
    /** Map base / deepest background. */
    bg: '#1a1a1e',
    /** Side panel / sheet surface (slightly darker than cards). */
    panel: '#111114',
    /** Card / input surface. */
    card: '#1e1e24',
    /** Raised card (tiles, selected rows). */
    cardElevated: '#26262d',
    /** Hairline borders / dividers. */
    border: '#2c2c34',

    /** Primary accent (lavender) + a stronger variant + a soft glow. */
    accent: '#c4b5fd',
    accentStrong: '#a78bfa',
    accentGlow: 'rgba(167,139,250,0.45)',

    textPrimary: '#ffffff',
    textSecondary: '#9a9aa6',
    textMuted: '#6b6b76',

    /** "Open 'til 6pm" / go status. */
    success: '#5bd18b',
    danger: '#ff5a5a',

    /** The chomping character + pellets (brand yellow — stays). */
    character: '#ffd400',
    characterOutline: '#a07c00',

    /** Translucent surface for overlays / score pills sitting on the map. */
    overlay: 'rgba(17,17,20,0.92)',
  },
  radius: { pill: 999, lg: 22, md: 16, sm: 12 },
  /** Dark UI map style for @rnmapbox/maps. */
  mapStyleUrl: 'mapbox://styles/mapbox/dark-v11',
} as const;

export type Theme = typeof theme;
