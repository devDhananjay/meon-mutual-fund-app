import {typeScale} from './typography';

/**
 * Single spec for search rows app-wide: same height, padding, type size.
 * Use these constants in every screen that has a search box.
 */
export const SEARCH_FIELD = {
  minHeight: 50,
  borderRadius: 12,
  paddingHorizontal: 12,
  paddingVertical: 12,
  /** Figtree + readable body */
  inputFontSize: typeScale.bodyMd,
  inputPaddingVertical: 0,
  iconSize: 16,
  iconMarginRight: 8,
};
