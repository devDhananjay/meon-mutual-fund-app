import {StyleSheet, Platform} from 'react-native';

const FIGTREE = {
  regular: Platform.OS === 'android' ? 'Figtree-Regular' : 'Figtree-Regular',
  medium: Platform.OS === 'android' ? 'Figtree-Medium' : 'Figtree-Medium',
  bold: Platform.OS === 'android' ? 'Figtree-Bold' : 'Figtree-Bold',
};

/**
 * - normal: body
 * - medium: default emphasis (replaces heavy bold usage)
 * - heading: screen/section titles only
 * - bold: alias of medium (legacy); prefer medium
 * - extraBold: alias of medium (legacy); do not use 800 for body
 */
const Textstyles = StyleSheet.create({
  heading: {
    fontFamily: FIGTREE.bold,
    fontWeight: '700',
  },
  medium: {
    fontFamily: FIGTREE.medium,
    fontWeight: '500',
  },
  normal: {
    fontFamily: FIGTREE.regular,
    fontWeight: '400',
  },
  bold: {
    fontFamily: FIGTREE.medium,
    fontWeight: '500',
  },
  extraBold: {
    fontFamily: FIGTREE.medium,
    fontWeight: '500',
  },
});

export default Textstyles;
