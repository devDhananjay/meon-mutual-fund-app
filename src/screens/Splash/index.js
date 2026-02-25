import React, {useEffect} from 'react';
import {View, StatusBar, Image, Text, StyleSheet} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import Images from '../../utils/images';
import {Colors} from '../../utils/AppConstant';
import Textstyles from '../../utils/text';

export default function Splash() {
  const navigation = useNavigation();

  useEffect(() => {
    const timer = setTimeout(() => {
      navigation.replace('Login');
    }, 2000);
    return () => clearTimeout(timer);
  }, [navigation]);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.white} />
      <View style={styles.logoRow}>
        <Image source={Images.themeLogo} style={styles.logoIcon} resizeMode="contain" />
        <View style={styles.brandText}>
          <Text style={[Textstyles.bold, styles.meonText]}>
            <Text style={styles.meBlue}>me</Text>
            <Text style={styles.onRed}>on</Text>
          </Text>
          <Text style={[Textstyles.bold, styles.mutualFunds]}>MUTUAL FUNDS</Text>
          <View style={styles.underline}>
            <View style={[styles.underlineSegment, styles.underlineBlue]} />
            <View style={[styles.underlineSegment, styles.underlineRed]} />
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.white,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoIcon: {
    width: 56,
    height: 56,
    marginRight: 8,
  },
  brandText: {
    alignItems: 'flex-start',
  },
  meonText: {
    fontSize: 28,
    letterSpacing: 0.5,
  },
  meBlue: {
    color: Colors.themeBlue,
  },
  onRed: {
    color: Colors.themeRed,
  },
  mutualFunds: {
    fontSize: 12,
    letterSpacing: 1.2,
    color: Colors.black,
    marginTop: 2,
  },
  underline: {
    flexDirection: 'row',
    width: '100%',
    height: 3,
    marginTop: 4,
    borderRadius: 2,
    overflow: 'hidden',
  },
  underlineSegment: {
    flex: 1,
  },
  underlineBlue: {
    backgroundColor: Colors.themeBlue,
  },
  underlineRed: {
    backgroundColor: Colors.themeRed,
  },
});
