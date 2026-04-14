import {Platform, StyleSheet} from 'react-native';

/**
 * Single source of truth for bundled Figtree files (linked in native projects).
 * Use named files instead of fontWeight so Android/iOS render the same glyph shapes.
 */
export const FIGTREE = {
  regular: 'Figtree-Regular',
  medium: 'Figtree-Medium',
  bold: 'Figtree-Bold',
};

/**
 * Single type scale for the app — prefer these over ad-hoc fontSize values.
 * (Nav titles, tabs, body, captions — keeps screens visually consistent.)
 */
export const typeScale = {
  caption2: 10,
  caption: 11,
  small: 12,
  label: 13,
  body: 14,
  bodyMd: 15,
  bodyLg: 16,
  /** Stack headers, modal titles, primary CTAs */
  title: 17,
  /** Large numeric amount fields (still readable, not oversized) */
  amountInput: 22,
  amountCurrency: 20,
  /** Chevron / icon glyphs styled as text */
  chevron: 18,
};

/**
 * Map numeric or string fontWeight to the correct Figtree font file.
 */
export function mapWeightToFigtreeFamily(weight) {
  if (weight == null) {
    return FIGTREE.regular;
  }
  if (typeof weight === 'number') {
    if (weight >= 700) {
      return FIGTREE.bold;
    }
    if (weight >= 500) {
      return FIGTREE.medium;
    }
    return FIGTREE.regular;
  }
  const s = String(weight).trim().toLowerCase();
  if (s === 'normal' || s === 'regular') {
    return FIGTREE.regular;
  }
  if (s === 'bold' || s === 'bolder') {
    return FIGTREE.bold;
  }
  const n = parseInt(s, 10);
  if (!Number.isNaN(n)) {
    if (n >= 700) {
      return FIGTREE.bold;
    }
    if (n >= 500) {
      return FIGTREE.medium;
    }
    return FIGTREE.regular;
  }
  if (s === 'medium' || s === 'semibold' || s === '600') {
    return FIGTREE.medium;
  }
  return FIGTREE.regular;
}

function isFigtreeFamily(name) {
  return typeof name === 'string' && name.startsWith('Figtree');
}

/** Android adds extra top/bottom padding to text; disabling matches iOS metrics for custom fonts. */
function withAndroidFigtreeMetrics(styleObj) {
  if (
    Platform.OS === 'android' &&
    styleObj.includeFontPadding === undefined &&
    isFigtreeFamily(styleObj.fontFamily)
  ) {
    return {...styleObj, includeFontPadding: false};
  }
  return styleObj;
}

/**
 * Normalize style so Figtree files win: map fontWeight → fontFamily when needed,
 * and drop fontWeight when using Figtree (avoids Android/iOS double-styling).
 */
export function resolveTextStyle(style) {
  const flat = StyleSheet.flatten(style);
  if (!flat || Object.keys(flat).length === 0) {
    return withAndroidFigtreeMetrics({fontFamily: FIGTREE.regular});
  }
  const next = {...flat};

  if (isFigtreeFamily(next.fontFamily)) {
    delete next.fontWeight;
    return withAndroidFigtreeMetrics(next);
  }

  if (next.fontFamily) {
    return next;
  }

  const family = mapWeightToFigtreeFamily(next.fontWeight);
  delete next.fontWeight;
  next.fontFamily = family;
  return withAndroidFigtreeMetrics(next);
}
