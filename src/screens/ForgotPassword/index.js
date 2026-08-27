import React, {useCallback, useState} from 'react';
import {View, Text, TouchableOpacity, StyleSheet, StatusBar, KeyboardAvoidingView, Platform, ScrollView, Image} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {CommonActions, useNavigation} from '@react-navigation/native';
import {useDispatch} from 'react-redux';
import {AuthColors, AuthSpacing} from '../../constants/authTheme';
import CustomInput from '../../components/auth/CustomInput';
import CustomButton from '../../components/auth/CustomButton';
import AuthBrand from '../../components/auth/AuthBrand';
import {navigationRef} from '../../navigation/navigationRef';
import {clearAuthStorage} from '../../services/authStorage';
import {logout} from '../../store/slices/authSlice';
import {forgotPassword} from '../../services/authService';
import Icons from '../../utils/icons';
import Textstyles from '../../utils/text';
import {useAppTheme} from '../../theme/useAppTheme';

function extractForgotPasswordError(err) {
  const data = err?.data;
  if (data?.errors?.ucc_code?.length) {
    return String(data.errors.ucc_code[0]);
  }
  if (data?.errors?.non_field_errors?.length) {
    return String(data.errors.non_field_errors[0]);
  }
  if (data?.errors?.company_short_name?.length) {
    return String(data.errors.company_short_name[0]);
  }
  if (data?.message) {
    return String(data.message);
  }
  if (err?.message) {
    return String(err.message);
  }
  return 'Unable to send reset instructions. Please try again.';
}

export default function ForgotPassword() {
  const navigation = useNavigation();
  const dispatch = useDispatch();
  const [uccCode, setUccCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [fieldError, setFieldError] = useState('');
  const {colors} = useAppTheme();

  const canSend = uccCode.trim().length > 0;

  const onSend = async () => {
    const code = uccCode.trim();
    if (!code) {
      setFieldError('UCC Code is required');
      return;
    }
    setFieldError('');
    setLoading(true);
    try {
      const result = await forgotPassword(code);
      const body = result?.data;
      if (body?.status === 'error') {
        setFieldError(extractForgotPasswordError({data: body, message: body?.message}));
        return;
      }
      navigation.navigate('EmailSent', {identifier: code});
    } catch (err) {
      setFieldError(extractForgotPasswordError(err));
    } finally {
      setLoading(false);
    }
  };

  const onBackToSignIn = useCallback(async () => {
    await clearAuthStorage();
    dispatch(logout());
    if (navigationRef.isReady()) {
      navigationRef.dispatch(
        CommonActions.reset({
          index: 0,
          routes: [{name: 'Login'}],
        }),
      );
    } else {
      navigation.navigate('Login');
    }
  }, [dispatch, navigation]);

  return (
    <SafeAreaView style={[styles.container, {backgroundColor: colors.background}]} edges={['top', 'left', 'right', 'bottom']}>
      <StatusBar barStyle={colors.statusBar} backgroundColor={colors.background} />
      <KeyboardAvoidingView style={styles.flex1} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" bounces={false}>
          <View style={styles.brandWrap}>
            <AuthBrand compact />
          </View>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.backButton}
            hitSlop={{top: 12, bottom: 12, left: 12, right: 12}}>
            <Image
              source={Icons.BackIcon}
              style={[styles.backArrowImg, {tintColor: colors.textPrimary}]}
              resizeMode="contain"
            />
          </TouchableOpacity>
          <Text style={[styles.title, {color: colors.textPrimary}]}>Forgot Password?</Text>
          <Text style={[styles.subtitle, {color: colors.textSecondary}]}>
            Enter your username or email address, and we'll give you reset instructions.
          </Text>
          <View style={[styles.card, {backgroundColor: colors.card}]}>
            <CustomInput
              label="UCC Code"
              value={uccCode}
              autoFocus
              onChangeText={v => {
                setUccCode(v);
                if (fieldError) {
                  setFieldError('');
                }
              }}
              placeholder="Enter your UCC Code"
              autoCapitalize="characters"
              error={fieldError}
            />
            <CustomButton title="Send" onPress={onSend} loading={loading} disabled={!canSend} />
            <View style={styles.secondaryWrap}>
              <CustomButton title="Back to Sign In" variant="secondary" onPress={onBackToSignIn} />
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex1: {flex: 1},
  container: {
    flex: 1,
    backgroundColor: AuthColors.bg,
  },
  content: {
    paddingHorizontal: AuthSpacing.screenHorizontal,
    paddingTop: 8,
    paddingBottom: 20,
  },
  backButton: {
    position: 'absolute',
    top: 8,
    left: AuthSpacing.screenHorizontal,
    width: 36,
    height: 36,
    justifyContent: 'center',
    zIndex: 2,
  },
  backArrowImg: {
    width: 18,
    height: 18,
  },
  brandWrap: {
    alignItems: 'center',
    marginBottom: 14,
  },
  title: {
    ...Textstyles.heading,
    fontSize: 24,
    color: AuthColors.text,
    fontWeight: '700',
    marginBottom: 12,
  },
  subtitle: {
    ...Textstyles.normal,
    fontSize: 14,
    color: AuthColors.subText,
    lineHeight: 21,
    marginBottom: 18,
  },
  card: {
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    padding: 16,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowOffset: {width: 0, height: 3},
    shadowRadius: 8,
  },
  secondaryWrap: {marginTop: 12},
});
