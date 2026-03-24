import {StyleSheet, Platform} from 'react-native';

const Textstyles = StyleSheet.create({
  bold: {
    fontFamily: Platform.OS === 'android' ? 'Figtree-Bold' : 'Figtree-Bold',
    fontWeight: '700',
  },
  extraBold: {
    fontFamily:
      Platform.OS === 'android' ? 'Figtree-ExtraBold' : 'Figtree-ExtraBold',
    fontWeight: '800',
  },
  normal: {
    fontFamily: Platform.OS === 'android' ? 'Figtree-Regular' : 'Figtree-Regular',
    fontWeight: '400',
  },
  medium: {
    fontFamily: Platform.OS === 'android' ? 'Figtree-Medium' : 'Figtree-Medium',
    fontWeight: '500',
  },
});

export default Textstyles;
