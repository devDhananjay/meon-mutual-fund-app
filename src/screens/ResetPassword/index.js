import React, {useMemo, useState} from 'react';
import {View, Text, StyleSheet, StatusBar, ScrollView, KeyboardAvoidingView, Platform} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useNavigation} from '@react-navigation/native';
import {AuthColors, AuthSpacing} from '../../constants/authTheme';
import AuthBrand from '../../components/auth/AuthBrand';
import CustomInput from '../../components/auth/CustomInput';
import CustomButton from '../../components/auth/CustomButton';
import Textstyles from '../../utils/text';
import {useAppTheme} from '../../theme/useAppTheme';
import {appAlert} from '../../utils/appAlert';

export default function ResetPassword() {
  const navigation = useNavigation();
  const {colors} = useAppTheme();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [passwordError, setPasswordError] = useState('');
  const [confirmError, setConfirmError] = useState('');

  const canSubmit = useMemo(
    () => password.trim().length > 0 && confirmPassword.trim().length > 0,
    [confirmPassword, password],
  );
  const isFinalState = useMemo(
    () => password.length >= 6 && confirmPassword.length >= 6,
    [confirmPassword.length, password.length],
  );

  const onSubmit = async () => {
    let hasError = false;
    if (password.length < 6) {
      setPasswordError('Password must be at least 6 characters.');
      hasError = true;
    } else {
      setPasswordError('');
    }
    if (confirmPassword !== password) {
      setConfirmError('Confirm password does not match.');
      hasError = true;
    } else {
      setConfirmError('');
    }
    if (hasError) {
      return;
    }
    setLoading(true);
    await new Promise(r => setTimeout(r, 800));
    setLoading(false);
    appAlert('Password updated', 'Your password has been updated successfully.', [
      {text: 'OK', onPress: () => navigation.navigate('Login')},
    ]);
  };

  return (
    <SafeAreaView style={[styles.container, {backgroundColor: colors.background}]} edges={['top', 'left', 'right', 'bottom']}>
      <StatusBar barStyle={colors.statusBar} backgroundColor={colors.background} />
      <KeyboardAvoidingView style={styles.flex1} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" bounces={false}>
          <View style={styles.brandWrap}>
            <AuthBrand compact />
          </View>
          <Text style={[styles.title, {color: colors.textPrimary}]}>Reset Password</Text>
          <Text style={[styles.subtitle, {color: colors.textSecondary}]}>
            Set a new password for your account.
          </Text>

          <View style={[styles.card, {backgroundColor: colors.card}]}>
            <CustomInput
              label="Password"
              value={password}
              onChangeText={v => {
                setPassword(v);
                if (passwordError) {
                  setPasswordError('');
                }
              }}
              placeholder="Enter password"
              secureTextEntry
              error={passwordError}
            />
            <CustomInput
              label="Confirm Password"
              value={confirmPassword}
              onChangeText={v => {
                setConfirmPassword(v);
                if (confirmError) {
                  setConfirmError('');
                }
              }}
              placeholder="Confirm password"
              secureTextEntry
              error={confirmError}
            />
            <CustomButton
              title={isFinalState ? 'Update' : 'Send'}
              onPress={onSubmit}
              loading={loading}
              disabled={!canSubmit}
            />
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
  brandWrap: {
    alignItems: 'center',
    marginBottom: 14,
  },
  title: {
    ...Textstyles.heading,
    fontSize: 24,
    color: AuthColors.text,
    fontWeight: '700',
    marginBottom: 8,
  },
  subtitle: {
    ...Textstyles.normal,
    fontSize: 14,
    color: AuthColors.subText,
    lineHeight: 20,
    marginBottom: 16,
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
});
