import React from 'react';
import {View, Text, TouchableOpacity, StyleSheet, StatusBar, Image} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useNavigation, useRoute} from '@react-navigation/native';
import {AuthColors, AuthSpacing} from '../../constants/authTheme';
import AuthBrand from '../../components/auth/AuthBrand';
import CustomButton from '../../components/auth/CustomButton';
import Icons from '../../utils/icons';
import Textstyles from '../../utils/text';
import {useAppTheme} from '../../theme/useAppTheme';

export default function EmailSent() {
  const navigation = useNavigation();
  const route = useRoute();
  const {colors} = useAppTheme();
  const identifier = route.params?.identifier || 'your account';

  return (
    <SafeAreaView style={[styles.container, {backgroundColor: colors.background}]} edges={['top', 'left', 'right', 'bottom']}>
      <StatusBar barStyle={colors.statusBar} backgroundColor={colors.background} />
      <View style={styles.content}>
        <View style={styles.brandWrap}>
          <AuthBrand compact />
        </View>

        <View style={styles.iconWrapper}>
          <View style={styles.envelopeCircle}>
            <Image source={Icons.EmailSend} style={styles.envelopeIcon} resizeMode="contain" />
            <View style={styles.checkBadge}>
              <Image source={Icons.checkIcons} style={styles.checkBadgeIcon} resizeMode="contain" />
            </View>
          </View>
        </View>

        <Text style={[styles.title, {color: colors.textPrimary}]}>Email Sent!</Text>
        <Text style={[styles.message, {color: colors.textSecondary}]}>
          If an account exists for {identifier}, password reset instructions have been sent.
        </Text>

        <View style={styles.actionWrap}>
          <CustomButton title="Back to Sign In" onPress={() => navigation.navigate('Login')} />
        </View>
        <TouchableOpacity onPress={() => navigation.navigate('ResetPassword')} activeOpacity={0.8}>
          <Text style={[styles.resetNowLink, {color: colors.primary}]}>Reset password now</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: AuthColors.bg,
  },
  content: {
    flex: 1,
    paddingHorizontal: AuthSpacing.screenHorizontal,
    paddingTop: 24,
    alignItems: 'center',
  },
  brandWrap: {marginBottom: 24},
  iconWrapper: {
    marginBottom: 20,
  },
  envelopeCircle: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: AuthColors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  envelopeIcon: {
    width: 42,
    height: 42,
  },
  checkBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: AuthColors.success,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkBadgeIcon: {
    width: 18,
    height: 18,
  },
  title: {
    ...Textstyles.heading,
    fontSize: 24,
    color: AuthColors.text,
    fontWeight: '700',
    marginBottom: 12,
  },
  message: {
    ...Textstyles.normal,
    fontSize: 14,
    color: AuthColors.subText,
    textAlign: 'center',
    lineHeight: 21,
    marginBottom: 26,
    paddingHorizontal: 10,
  },
  actionWrap: {width: '100%', maxWidth: 320},
  resetNowLink: {
    ...Textstyles.medium,
    marginTop: 14,
    fontSize: 14,
    color: AuthColors.primary,
    fontWeight: '600',
  },
});
