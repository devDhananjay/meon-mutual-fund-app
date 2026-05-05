import React from 'react';
import {View, StyleSheet, Image} from 'react-native';
import Icons from '../../utils/icons';

/** Simple handset glyph (no react-native-svg). */
export default function PhoneHandsetIcon({size = 22, tintColor = '#FFFFFF', circleColor = '#1E81F2'}) {
  const s = size;
  return (
    <View style={[styles.circle, {width: s + 10, height: s + 10, borderRadius: (s + 10) / 2, backgroundColor: circleColor}]}>
      <Image source={Icons.PhoneCalling} style={{width: size * 0.55, height: size * 0.55, tintColor}} resizeMode="contain" />
    </View>
  );
}

const styles = StyleSheet.create({
  circle: {alignItems: 'center', justifyContent: 'center'},
  phone: {
    borderWidth: 2,
    borderRadius: 5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ear: {position: 'absolute', borderRadius: 1},
  mouth: {position: 'absolute', borderRadius: 1},
});
