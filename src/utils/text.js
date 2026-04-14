import {StyleSheet} from 'react-native';
import {FIGTREE} from '../theme/typography';

export {FIGTREE};

/**
 * - normal: body
 * - medium: default emphasis (replaces heavy bold usage)
 * - heading: screen/section titles only
 * - bold: alias of medium (legacy); prefer medium
 * - extraBold: alias of medium (legacy); do not use 800 for body
 *
 * Prefer fontFamily only; global Text/TextInput patch maps fontWeight → Figtree files.
 */
const Textstyles = StyleSheet.create({
  heading: {
    fontFamily: FIGTREE.bold,
  },
  medium: {
    fontFamily: FIGTREE.medium,
  },
  normal: {
    fontFamily: FIGTREE.regular,
  },
  bold: {
    fontFamily: FIGTREE.medium,
  },
  extraBold: {
    fontFamily: FIGTREE.medium,
  },
});

export default Textstyles;
