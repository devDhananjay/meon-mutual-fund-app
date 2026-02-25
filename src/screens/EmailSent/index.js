import React from 'react';
import {View, Text, TouchableOpacity, StyleSheet, StatusBar, Image} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import Images from '../../utils/images';
import {Colors} from '../../utils/AppConstant';
import Textstyles from '../../utils/text';

export default function EmailSent() {
  const navigation = useNavigation();

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.white} />
      <View style={styles.content}>
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

        <View style={styles.iconWrapper}>
          <View style={styles.envelopeCircle}>
            <Text style={styles.envelopeIcon}>✉</Text>
            <View style={styles.checkBadge}>
              <Text style={styles.checkBadgeText}>✓</Text>
            </View>
          </View>
        </View>

        <Text style={[Textstyles.bold, styles.title]}>Email Sent!</Text>
        <Text style={[Textstyles.normal, styles.message]}>
          If account exists with us, you will receive password reset email shortly.
        </Text>

        <TouchableOpacity
          onPress={() => navigation.navigate('Login')}
          style={styles.backToSignIn}>
          <Text style={[Textstyles.medium, styles.backToSignInText]}>Back to Sign In</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.white,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 60,
    alignItems: 'center',
  },
  logoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 32,
  },
  logoIcon: {
    width: 40,
    height: 40,
    marginRight: 6,
  },
  brandText: {
    alignItems: 'flex-start',
  },
  meonText: {
    fontSize: 20,
    letterSpacing: 0.5,
  },
  meBlue: { color: Colors.themeBlue },
  onRed: { color: Colors.themeRed },
  mutualFunds: {
    fontSize: 9,
    letterSpacing: 1,
    color: Colors.black,
    marginTop: 2,
  },
  underline: {
    flexDirection: 'row',
    width: '100%',
    height: 2,
    marginTop: 2,
    borderRadius: 1,
    overflow: 'hidden',
  },
  underlineSegment: { flex: 1 },
  underlineBlue: { backgroundColor: Colors.themeBlue },
  underlineRed: { backgroundColor: Colors.themeRed },
  iconWrapper: {
    marginBottom: 28,
  },
  envelopeCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.themeBlue,
    alignItems: 'center',
    justifyContent: 'center',
  },
  envelopeIcon: {
    fontSize: 40,
    color: Colors.white,
  },
  checkBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.green,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkBadgeText: {
    color: Colors.white,
    fontSize: 16,
    fontWeight: '700',
  },
  title: {
    fontSize: 24,
    color: Colors.TEXT_PRIMARY,
    marginBottom: 12,
  },
  message: {
    fontSize: 15,
    color: Colors.gray,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 32,
    paddingHorizontal: 16,
  },
  backToSignIn: {
    borderWidth: 1,
    borderColor: Colors.BORDER_GREY,
    borderRadius: 10,
    paddingVertical: 14,
    paddingHorizontal: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backToSignInText: {
    fontSize: 16,
    color: Colors.TEXT_PRIMARY,
  },
});
