import {StyleSheet, Platform} from 'react-native';

const Textstyles = StyleSheet.create({
  bold: {
    fontFamily: Platform.OS === 'android' ? 'Poppins-Bold' : 'Poppins-Bold',
    fontWeight: '700',
  },
  extraBold: {
    fontFamily:
      Platform.OS === 'android' ? 'Poppins-ExtraBold' : 'Poppins-ExtraBold',
    fontWeight: '800',
  },
  normal: {
    fontFamily: Platform.OS === 'android' ? 'Poppins-Regular' : 'Poppins-Regular',
    fontWeight: '400',
  },
  medium: {
    fontFamily: Platform.OS === 'android' ? 'Poppins-Medium' : 'Poppins-Medium',
    fontWeight: '500',
  },
});

export default Textstyles;
