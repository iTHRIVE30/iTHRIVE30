import { Platform } from 'react-native';

/**
 * iTHRIVE30 theme tokens.
 *
 * Two palettes, one token set. `dark` is the live black + gold brand, its values taken
 * verbatim from the hex literals that used to be declared per-screen — so switching a
 * screen over to tokens must not change a single pixel. `light` is the Eucalypt palette
 * from the A/B design handoff: cool ivory ground, sage primary, gold demoted to an accent.
 *
 * WHY TOKENS AT ALL: there were 337 hardcoded colour values across 15 files and 28
 * distinct greys, several of them a shade apart and used interchangeably. Changing any
 * brand colour meant hunting it through the whole app. The grey ramp is deliberately
 * collapsed here - near-identical values fold into one role.
 *
 * CONTRAST, LIGHT MODE: do not lighten `muted`, `faint`, `secondary` or `secondaryDim`
 * for aesthetic reasons. Inverting a dark UI is not a mirror of its grey ramp - #666 and
 * #555 read fine on #0B0B0B and land near 2.5:1 on ivory. These values are set so every
 * label at 9-12px clears 4.5:1 on both `ground` and `surface`. Same reason `onSuccess` is
 * ink rather than white: white on the sage `success` is 3.0:1.
 *
 * Brand gold #D4AF37 is 9.19:1 on brand black and 2.10:1 on white. It cannot carry text
 * in light mode, which is why `primary` becomes sage there and gold survives only as
 * `accentGold` (#B79447) on AUTO chips and earned badges.
 */

export type ThemeName = 'dark' | 'light';

export type Theme = {
  name: ThemeName;

  // Surfaces
  /** Screen background, headers, tab bar. */
  ground: string;
  /** Cards, inputs, habit rows, chart cards. */
  surface: string;
  /** A card nested inside a card - goal cards, badge rows. */
  surfaceAlt: string;
  /** Slightly recessed from ground - tracker cells, strip backgrounds. */
  surfaceSunken: string;

  // Lines
  /** The default 1px hairline and card border. */
  border: string;
  /** A softer internal divider. */
  borderSoft: string;
  /** Divider on a nested surface. */
  borderMuted: string;
  /** The heaviest hairline - segment separators. */
  borderStrong: string;

  // Brand
  /** Titles, ticks, filled buttons, active tab, chart fill. */
  primary: string;
  /** Eyebrow labels and dimmer brand accents. */
  primaryDim: string;
  /** Active day tile, AUTO badge, Do This box. */
  primaryTint: string;
  /** Earned-badge card fill. */
  primaryTintAlt: string;
  /** Hairline around a primaryTint-filled box. */
  primaryTintBorder: string;
  /** Text and icons sitting ON a primary-filled surface. */
  onPrimary: string;
  /** Gold. In light mode this is the ONLY gold left - AUTO chips and earned badges. */
  accentGold: string;

  // Text
  /** Primary text. */
  ink: string;
  /** Primary text, one step down. */
  inkSoft: string;
  /** Body copy and prompt labels. */
  body: string;
  /** Subtitles and detail lines. */
  secondary: string;
  /** Secondary text, one step down. */
  secondaryDim: string;
  /** Placeholders, empty states, "Unlocks on Day N". */
  muted: string;
  /** Tracker date headers, lock icons - the quietest readable text. */
  faint: string;
  /** Badge encouragement copy - warm on dark, deep on light. */
  encouragement: string;

  // Semantic
  success: string;
  /** The check glyph inside a success chip. */
  onSuccess: string;
  successTint: string;
  successInk: string;
  danger: string;
  dangerBorder: string;

  // Overlays
  /** Modal backdrop. */
  backdrop: string;
  /** Photo scrim - stays dark in both themes; type over a photo needs it. */
  scrim: string;
  scrimStrong: string;

  /** Which logo lockup cut to use against `ground`. See lib/brand.ts. */
  logoTone: 'onDark' | 'onLight';
};

export const DarkTheme: Theme = {
  name: 'dark',

  ground: '#0B0B0B',
  surface: '#161616',
  surfaceAlt: '#1C1C1C',
  surfaceSunken: '#131313',

  border: '#262626',
  borderSoft: '#242424',
  borderMuted: '#2A2A2A',
  borderStrong: '#333333',

  primary: '#D4AF37',
  primaryDim: '#8A7433',
  primaryTint: '#1F1A08',
  primaryTintAlt: '#1A1608',
  primaryTintBorder: '#3A2F10',
  onPrimary: '#0B0B0B',
  accentGold: '#D4AF37',

  ink: '#FFFFFF',
  inkSoft: '#EEEEEE',
  body: '#CCCCCC',
  secondary: '#AAAAAA',
  secondaryDim: '#888888',
  muted: '#666666',
  faint: '#555555',
  encouragement: '#E8E0C8',

  success: '#3DDC84',
  onSuccess: '#0B0B0B',
  successTint: '#0F1F14',
  successInk: '#BDF5D1',
  danger: '#C4573F',
  dangerBorder: '#4A2A20',

  backdrop: 'rgba(0,0,0,0.4)',
  scrim: 'rgba(0,0,0,0.6)',
  scrimStrong: 'rgba(0,0,0,0.94)',

  logoTone: 'onDark',
};

export const LightTheme: Theme = {
  name: 'light',

  ground: '#F5F5F0',
  surface: '#FFFFFF',
  surfaceAlt: '#FAFAF6',
  surfaceSunken: '#EEEFE8',

  border: '#E2E5DB',
  borderSoft: '#EAECE3',
  borderMuted: '#DFE3D8',
  borderStrong: '#D2D7C8',

  primary: '#5F7355',
  primaryDim: '#57604F',
  primaryTint: '#EBEFE5',
  primaryTintAlt: '#F1F4EC',
  primaryTintBorder: '#D6DECC',
  onPrimary: '#FFFFFF',
  accentGold: '#B79447',

  ink: '#22281F',
  inkSoft: '#2A312A',
  body: '#3C463A',
  secondary: '#57604F',
  secondaryDim: '#5C6553',
  muted: '#616A59',
  faint: '#68715F',
  encouragement: '#3C463A',

  success: '#6E8F5E',
  onSuccess: '#22281F',
  successTint: '#E8F0E4',
  successInk: '#2C4A33',
  danger: '#A8442F',
  dangerBorder: '#E8C9BF',

  backdrop: 'rgba(34,40,31,0.35)',
  // Photo scrims stay black in both themes - overlaid type needs a dark ground
  // regardless of the app's own surface.
  scrim: 'rgba(0,0,0,0.6)',
  scrimStrong: 'rgba(0,0,0,0.94)',

  logoTone: 'onLight',
};

export const THEMES: Record<ThemeName, Theme> = { dark: DarkTheme, light: LightTheme };

/**
 * Categorical series for the Levels comparison chart. Only the first entry is
 * brand-bearing; the rest are a fixed sequence and stay put across themes.
 */
export const levelColors = (t: Theme): string[] => [
  t.primary,
  '#3DDC84',
  '#5AB0FF',
  '#F2789F',
  '#FFA552',
  '#9B8AFB',
];

/**
 * Compatibility shim for the Expo starter-template files that are still in the tree:
 * `hooks/use-theme-color.ts`, `components/themed-text.tsx`, `components/themed-view.tsx`,
 * `components/ui/collapsible.tsx` and `app/modal.tsx`. None of the real screens use them.
 * Mapped onto the brand tokens so they at least render in-brand if anything ever does.
 *
 * Safe to delete this export and those files together.
 */
export const Colors = {
  light: {
    text: LightTheme.ink,
    background: LightTheme.ground,
    tint: LightTheme.primary,
    icon: LightTheme.muted,
    tabIconDefault: LightTheme.muted,
    tabIconSelected: LightTheme.primary,
  },
  dark: {
    text: DarkTheme.ink,
    background: DarkTheme.ground,
    tint: DarkTheme.primary,
    icon: DarkTheme.muted,
    tabIconDefault: DarkTheme.muted,
    tabIconSelected: DarkTheme.primary,
  },
};

export const Fonts = Platform.select({
  ios: {
    /** iOS `UIFontDescriptorSystemDesignDefault` */
    sans: 'system-ui',
    /** iOS `UIFontDescriptorSystemDesignSerif` */
    serif: 'ui-serif',
    /** iOS `UIFontDescriptorSystemDesignRounded` */
    rounded: 'ui-rounded',
    /** iOS `UIFontDescriptorSystemDesignMonospaced` */
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    serif: "Georgia, 'Times New Roman', serif",
    rounded: "'SF Pro Rounded', 'Hiragino Maru Gothic ProN', Meiryo, 'MS PGothic', sans-serif",
    mono: "SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
  },
});
