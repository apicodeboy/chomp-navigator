/**
 * Central design tokens — dark map with a golden-yellow accent and white floating
 * cards (the ride-app look). The map is dark; cards/sheets are white with dark text;
 * yellow is used for button fills and the route. Import `theme` everywhere instead
 * of hardcoding colors.
 */
export const theme = {
  colors: {
    /** App / map background (dark). */
    bg: '#15151a',
    /** Floating card / sheet surface (white). */
    panel: '#ffffff',
    card: '#ffffff',
    /** Slightly recessed surface on white cards. */
    cardElevated: '#f1f1f3',
    /** Hairline dividers on white cards. */
    border: '#ececec',

    /** Golden-yellow accent + a deeper amber + soft glow. */
    accent: '#ffc400',
    accentStrong: '#e6a700',
    accentGlow: 'rgba(255,196,0,0.30)',

    /** Text on white cards. */
    textPrimary: '#1c1c1e',
    textSecondary: '#8a8a8e',
    textMuted: '#b0b0b4',
    /** Text placed directly over the dark map (no card behind it). */
    textOnMap: '#ffffff',

    success: '#2ea96b',
    danger: '#ff3b30',

    /** Text/icon on top of the yellow accent (dark, for contrast). */
    onAccent: '#1c1c1e',

    /** The chomping character + pellets (yellow route). */
    character: '#ffc400',
    characterOutline: '#7a5e00',

    /** Translucent white card sitting on the dark map. */
    overlay: 'rgba(255,255,255,0.96)',
  },
  radius: { pill: 999, lg: 22, md: 16, sm: 12 },
  /** Dark map style to match the theme. */
  mapStyleUrl: 'mapbox://styles/mapbox/dark-v11',
} as const;

export type Theme = typeof theme;
