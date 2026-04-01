import React from 'react';
import {View, Image, StyleSheet} from 'react-native';
import Images from '../../utils/images';

export default function AuthBrand({compact = false}) {
  return (
    <View style={styles.row}>
      <Image source={Images.themeLogo} style={[styles.logo, compact && styles.logoCompact]} resizeMode="contain" />
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  logo: {
    width: 200,
    height: 100,
  },
  logoCompact: {
    width: 200,
    height: 100,
  },
});
