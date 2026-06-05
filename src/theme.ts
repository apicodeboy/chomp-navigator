/**
 * Central design tokens — light neumorphic theme with an orange accent.
 * Off-white surfaces, soft cards, vibrant orange primary, green "available/go"
 * status. Import `theme` anywhere instead of hardcoding colors.
 */
export const theme = {
  colors: {
    /** Map base / app background. */
    bg: '#ececec',
    /** Panel / sheet surface. */
    panel: '#ffffff',
    /** Card / input surface. */
    card: '#ffffff',
    /** Slightly recessed surface (tiles, muted chips). */
    cardElevated: '#f4f4f4',
    /** Hairline borders / dividers. */
    border: '#e2e2e2',

    /** Primary accent (orange) + stronger variant + soft glow. */
    accent: '#f26101',
    accentStrong: '#d94f00',
    accentGlow: 'rgba(242,97,1,0.30)',

    textPrimary: '#1c1c1e',
    textSecondary: '#8a8a8e',
    textMuted: '#b0b0b4',

    /** "Available" / go status. */
    success: '#2ea96b',
    danger: '#ff3b30',

    /** Text/icon color that sits on top of the orange accent. */
    onAccent: '#ffffff',

    /** The chomping character + pellets (orange to match the route theme). */
    character: '#f26101',
    characterOutline: '#8f3705',

    /** Translucent light surface for overlays / cards sitting on the map. */
    overlay: 'rgba(255,255,255,0.92)',
  },
  radius: { pill: 999, lg: 22, md: 16, sm: 12 },
  /** Light map style to match the theme. */
  mapStyleUrl: 'mapbox://styles/mapbox/light-v11',
} as const;

export type Theme = typeof theme;
