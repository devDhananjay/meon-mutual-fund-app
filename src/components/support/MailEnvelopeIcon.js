import React from 'react';
import {View, Image, StyleSheet} from 'react-native';
import Icons from '../../utils/icons';

export default function MailEnvelopeIcon({size = 22, tintColor = '#FFFFFF', circleColor = '#1E81F2'}) {
  const outer = size + 10;
  return (
    <View style={[styles.circle, {width: outer, height: outer, borderRadius: outer / 2, backgroundColor: circleColor}]}>
      <Image source={Icons.EmailSend} style={{width: size * 0.55, height: size * 0.55, tintColor}} resizeMode="contain" />
    </View>
  );
}

const styles = StyleSheet.create({
  circle: {alignItems: 'center', justifyContent: 'center'},
});
