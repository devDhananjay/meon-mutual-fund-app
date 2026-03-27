import React from 'react';
import {View, Text, TouchableOpacity, StyleSheet, StatusBar} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useNavigation, useRoute} from '@react-navigation/native';
import {AuthColors, AuthSpacing} from '../../constants/authTheme';
import AuthBrand from '../../components/auth/AuthBrand';
import CustomButton from '../../components/auth/CustomButton';

export default function EmailSent() {
  const navigation = useNavigation();
  const route = useRoute();
  const identifier = route.params?.identifier || 'your account';

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right', 'bottom']}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      <View style={styles.content}>
        <View style={styles.brandWrap}>
          <AuthBrand compact />
        </View>

        <View style={styles.iconWrapper}>
          <View style={styles.envelopeCircle}>
            <Text style={styles.envelopeIcon}>✉</Text>
            <View style={styles.checkBadge}>
              <Text style={styles.checkBadgeText}>✓</Text>
            </View>
          </View>
        </View>

        <Text style={styles.title}>Email Sent!</Text>
        <Text style={styles.message}>
          If an account exists for {identifier}, password reset instructions have been sent.
        </Text>

        <View style={styles.actionWrap}>
          <CustomButton title="Back to Sign In" onPress={() => navigation.navigate('Login')} />
        </View>
        <TouchableOpacity onPress={() => navigation.navigate('ResetPassword')} activeOpacity={0.8}>
          <Text style={styles.resetNowLink}>Reset password now</Text>
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
    fontSize: 42,
    color: '#FFFFFF',
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
  checkBadgeText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  title: {
    fontSize: 24,
    color: AuthColors.text,
    fontWeight: '700',
    marginBottom: 12,
  },
  message: {
    fontSize: 14,
    color: AuthColors.subText,
    textAlign: 'center',
    lineHeight: 21,
    marginBottom: 26,
    paddingHorizontal: 10,
  },
  actionWrap: {width: '100%', maxWidth: 320},
  resetNowLink: {
    marginTop: 14,
    fontSize: 14,
    color: AuthColors.primary,
    fontWeight: '600',
  },
});
