import { merge } from 'lodash';

import { alpha, darken, emphasize, getContrastRatio, lighten } from './colorManipulator';
import { palette } from './palette';
import { DeepPartial, ThemeRichColor } from './types';

/** @internal */
export type ThemeColorsMode = 'light' | 'dark';

/** @internal */
export interface ThemeColorsBase<TColor> {
  mode: ThemeColorsMode;

  primary: TColor;
  secondary: TColor;
  info: TColor;
  error: TColor;
  success: TColor;
  warning: TColor;

  text: {
    primary: string;
    secondary: string;
    disabled: string;
    link: string;
    /** Used for auto white or dark text on colored backgrounds */
    maxContrast: string;
  };

  background: {
    /** Dashboard and body background */
    canvas: string;
    /** Primary content pane background (panels etc) */
    primary: string;
    /** Cards and elements that need to stand out on the primary background */
    secondary: string;
  };

  border: {
    weak: string;
    medium: string;
    strong: string;
  };

  gradients: {
    brandVertical: string;
    brandHorizontal: string;
  };

  action: {
    /** Used for selected menu item / select option */
    selected: string;
    /** Used for hovered menu item / select option */
    hover: string;
    /** Used for button/colored background hover opacity */
    hoverOpacity: number;
    /** Used focused menu item / select option */
    focus: string;
    /** Used for disabled buttons and inputs */
    disabledBackground: string;
    /** Disabled text */
    disabledText: string;
    /** Disablerd opacity */
    disabledOpacity: number;
  };

  hoverFactor: number;
  contrastThreshold: number;
  tonalOffset: number;
}

export interface ThemeHoverStrengh {}

/** @beta */
export interface ThemeColors extends ThemeColorsBase<ThemeRichColor> {
  /** Returns a text color for the background */
  getContrastText(background: string, threshold?: number): string;
  /* Brighten or darken a color by specified factor (0-1) */
  emphasize(color: string, amount?: number): string;
}

/** @internal */
export type ThemeColorsInput = DeepPartial<ThemeColorsBase<ThemeRichColor>>;

/**
 * STEM / Enlayer brand colours (Enlayer brand book A.4, A.5 and D.8).
 * Only UI chrome is branded here. Data/visualization colours (createVisualizationColors.ts)
 * are intentionally untouched so dashboards render exactly as before.
 */
export const enlayer = {
  deepGreen: '#183A33',
  editorialGreen: '#0B6B52',
  graphite: '#262D34',
  warmIvory: '#F7F5F0',
  pureWhite: '#FFFFFF',
  emerald: '#00A76F',
  terracotta: '#D6653C',
  statusAmber: '#E3A21A',
  // Product UI tokens (D.8)
  brandGreen: '#00805A',
  platformBlue: '#2F6079',
  harborBlue: '#7AA5C3',
  sectionTint: '#F7FAF8',
  fieldTint: '#F3F7F5',
  mint: '#E9F5F0',
  mutedText: '#5A6763',
  hairline: '#EDF0EF',
  ashGrey: '#C9D2CE',
  stoneGrey: '#B3BEB9',
  chipGoldText: '#7A5C22',
  chipTerracottaText: '#A33F1E',
  // Dark theme depth: shades and tints of the brand colours ("depth, not more colours", A.5)
  deepGreenShade: '#102621', // Deep Green darkened 35%
  deepGreenTint: '#2A4A43', // Deep Green lightened 8%
  emeraldTint: '#4CC19A', // Emerald lightened 30%, readable as text on Deep Green
  terracottaTint: '#E08B6D', // Terracotta lightened 25%
};

class DarkColors implements ThemeColorsBase<Partial<ThemeRichColor>> {
  mode: ThemeColorsMode = 'dark';

  // Warm Ivory, used for ivory-on-deep-green opacity colours
  whiteBase = '247, 245, 240';

  border = {
    weak: `rgba(${this.whiteBase}, 0.12)`,
    medium: `rgba(${this.whiteBase}, 0.2)`,
    strong: `rgba(${this.whiteBase}, 0.30)`,
  };

  text = {
    primary: enlayer.warmIvory,
    secondary: `rgba(${this.whiteBase}, 0.7)`,
    disabled: `rgba(${this.whiteBase}, 0.55)`,
    link: enlayer.emeraldTint,
    maxContrast: palette.white,
  };

  // brandGreen for buttons: white text on Emerald is only 3.1:1, on brandGreen 5:1 (WCAG AA)
  primary = {
    main: enlayer.brandGreen,
    text: enlayer.emeraldTint,
    border: enlayer.emeraldTint,
  };

  secondary = {
    main: `rgba(${this.whiteBase}, 0.10)`,
    shade: `rgba(${this.whiteBase}, 0.14)`,
    text: this.text.primary,
    contrastText: enlayer.warmIvory,
    border: `rgba(${this.whiteBase}, 0.08)`,
  };

  info = {
    main: enlayer.harborBlue,
    text: enlayer.harborBlue,
  };

  error = {
    main: enlayer.terracotta,
    text: enlayer.terracottaTint,
  };

  success = {
    main: enlayer.emerald,
    text: enlayer.emeraldTint,
  };

  warning = {
    main: enlayer.statusAmber,
    text: enlayer.statusAmber,
  };

  background = {
    canvas: enlayer.deepGreenShade,
    primary: enlayer.deepGreen,
    secondary: enlayer.deepGreenTint,
  };

  action = {
    hover: `rgba(${this.whiteBase}, 0.16)`,
    selected: `rgba(${this.whiteBase}, 0.12)`,
    focus: `rgba(${this.whiteBase}, 0.16)`,
    hoverOpacity: 0.08,
    disabledText: this.text.disabled,
    disabledBackground: `rgba(${this.whiteBase}, 0.04)`,
    disabledOpacity: 0.38,
  };

  gradients = {
    brandHorizontal: `linear-gradient(270deg, ${enlayer.emerald} 0%, ${enlayer.emeraldTint} 100%)`,
    brandVertical: `linear-gradient(0.01deg, ${enlayer.emerald} 0.01%, ${enlayer.emeraldTint} 99.99%)`,
  };

  contrastThreshold = 3;
  hoverFactor = 0.03;
  tonalOffset = 0.15;
}

class LightColors implements ThemeColorsBase<Partial<ThemeRichColor>> {
  mode: ThemeColorsMode = 'light';

  // Graphite
  blackBase = '38, 45, 52';

  primary = {
    main: enlayer.brandGreen,
    border: enlayer.editorialGreen,
    text: enlayer.editorialGreen,
  };

  text = {
    primary: enlayer.graphite,
    secondary: enlayer.mutedText,
    disabled: `rgba(${this.blackBase}, 0.64)`,
    link: this.primary.text,
    maxContrast: palette.black,
  };

  border = {
    weak: enlayer.hairline,
    medium: enlayer.ashGrey,
    strong: enlayer.stoneGrey,
  };

  secondary = {
    main: `rgba(${this.blackBase}, 0.08)`,
    shade: `rgba(${this.blackBase}, 0.15)`,
    contrastText: enlayer.graphite,
    text: this.text.primary,
    border: this.border.weak,
  };

  info = {
    main: enlayer.platformBlue,
    text: enlayer.platformBlue,
  };

  error = {
    main: enlayer.terracotta,
    text: enlayer.chipTerracottaText,
    border: enlayer.chipTerracottaText,
  };

  success = {
    main: enlayer.emerald,
    text: enlayer.editorialGreen,
  };

  warning = {
    main: enlayer.statusAmber,
    text: enlayer.chipGoldText,
  };

  background = {
    canvas: enlayer.sectionTint,
    primary: enlayer.pureWhite,
    secondary: enlayer.fieldTint,
  };

  action = {
    hover: `rgba(${this.blackBase}, 0.12)`,
    selected: enlayer.mint,
    hoverOpacity: 0.08,
    focus: `rgba(${this.blackBase}, 0.12)`,
    disabledBackground: `rgba(${this.blackBase}, 0.04)`,
    disabledText: this.text.disabled,
    disabledOpacity: 0.38,
  };

  gradients = {
    brandHorizontal: `linear-gradient(90deg, ${enlayer.deepGreen} 0%, ${enlayer.emerald} 100%)`,
    brandVertical: `linear-gradient(0.01deg, ${enlayer.deepGreen} -31.2%, ${enlayer.emerald} 113.07%)`,
  };

  contrastThreshold = 3;
  hoverFactor = 0.03;
  tonalOffset = 0.2;
}

export function createColors(colors: ThemeColorsInput): ThemeColors {
  const dark = new DarkColors();
  const light = new LightColors();
  const base = (colors.mode ?? 'dark') === 'dark' ? dark : light;
  const {
    primary = base.primary,
    secondary = base.secondary,
    info = base.info,
    warning = base.warning,
    success = base.success,
    error = base.error,
    tonalOffset = base.tonalOffset,
    hoverFactor = base.hoverFactor,
    contrastThreshold = base.contrastThreshold,
    ...other
  } = colors;

  function getContrastText(background: string, threshold: number = contrastThreshold) {
    const contrastText =
      getContrastRatio(dark.text.maxContrast, background, base.background.primary) >= threshold
        ? dark.text.maxContrast
        : light.text.maxContrast;
    // todo, need color framework
    return contrastText;
  }

  const getRichColor = ({ color, name }: GetRichColorProps): ThemeRichColor => {
    color = { ...color, name };
    if (!color.main) {
      throw new Error(`Missing main color for ${name}`);
    }
    if (!color.text) {
      color.text = color.main;
    }
    if (!color.border) {
      color.border = color.text;
    }
    if (!color.shade) {
      color.shade = base.mode === 'light' ? darken(color.main, tonalOffset) : lighten(color.main, tonalOffset);
    }
    if (!color.transparent) {
      color.transparent = base.mode === 'light' ? alpha(color.main, 0.08) : alpha(color.main, 0.15);
    }
    if (!color.contrastText) {
      color.contrastText = getContrastText(color.main);
    }
    return color as ThemeRichColor;
  };

  return merge(
    {
      ...base,
      primary: getRichColor({ color: primary, name: 'primary' }),
      secondary: getRichColor({ color: secondary, name: 'secondary' }),
      info: getRichColor({ color: info, name: 'info' }),
      error: getRichColor({ color: error, name: 'error' }),
      success: getRichColor({ color: success, name: 'success' }),
      warning: getRichColor({ color: warning, name: 'warning' }),
      getContrastText,
      emphasize: (color: string, factor?: number) => {
        return emphasize(color, factor ?? hoverFactor);
      },
    },
    other
  );
}

interface GetRichColorProps {
  color: Partial<ThemeRichColor>;
  name: string;
}
