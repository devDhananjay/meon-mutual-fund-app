import React from 'react';
import {View, StyleSheet} from 'react-native';

/** Simple handset glyph (no react-native-svg). */
export default function PhoneHandsetIcon({size = 22, color = '#FFFFFF', circleColor = '#1E81F2'}) {
  const s = size;
  return (
    <View style={[styles.circle, {width: s + 10, height: s + 10, borderRadius: (s + 10) / 2, backgroundColor: circleColor}]}>
      <View style={[styles.phone, {borderColor: color, width: s * 0.38, height: s * 0.62}]}>
        <View style={[styles.ear, {backgroundColor: color, width: s * 0.16, height: 2, top: -1}]} />
        <View style={[styles.mouth, {backgroundColor: color, width: s * 0.16, height: 2, bottom: -1}]} />
      </View>
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
