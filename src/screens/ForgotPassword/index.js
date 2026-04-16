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
import Icons from '../../utils/icons';
import Textstyles from '../../utils/text';
import {useAppTheme} from '../../theme/useAppTheme';

export default function ForgotPassword() {
  const navigation = useNavigation();
  const dispatch = useDispatch();
  const [usernameOrEmail, setUsernameOrEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [fieldError, setFieldError] = useState('');
  const {colors} = useAppTheme();

  const canSend = usernameOrEmail.trim().length > 0;

  const onSend = async () => {
    if (!canSend) {
      setFieldError('Username or email is required');
      return;
    }
    setFieldError('');
    setLoading(true);
    await new Promise(r => setTimeout(r, 700));
    setLoading(false);
    navigation.navigate('EmailSent', {identifier: usernameOrEmail.trim()});
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
            Enter your username or email address and we will send reset instructions.
          </Text>
          <View style={[styles.card, {backgroundColor: colors.card}]}>
            <CustomInput
              label="Username / Email"
              value={usernameOrEmail}
              autoFocus
              onChangeText={v => {
                setUsernameOrEmail(v);
                if (fieldError) {
                  setFieldError('');
                }
              }}
              placeholder="Enter username or email"
              keyboardType="email-address"
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
    // elevation: 3,
  },
  secondaryWrap: {marginTop: 12},
});
