import React, {useEffect, useMemo, useState} from 'react';
import {View, Text, TouchableOpacity, StyleSheet, StatusBar, KeyboardAvoidingView, Platform, ScrollView, ActivityIndicator} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useForm, Controller} from 'react-hook-form';
import {useNavigation} from '@react-navigation/native';
import {useDispatch} from 'react-redux';
import {AuthColors, AuthSpacing} from '../../constants/authTheme';
import AuthBrand from '../../components/auth/AuthBrand';
import CustomInput from '../../components/auth/CustomInput';
import CustomButton from '../../components/auth/CustomButton';
import CustomCheckbox from '../../components/auth/CustomCheckbox';
import {login as loginAction} from '../../store/slices/authSlice';
import {loginWithCredentials} from '../../services/authService';
import {persistAuth, getRememberedUsername, setRememberedUsername} from '../../services/authStorage';
import Textstyles from '../../utils/text';
import {useAppTheme} from '../../theme/useAppTheme';

export default function Login() {
  const navigation = useNavigation();
  const dispatch = useDispatch();
  const [rememberPassword, setRememberPassword] = useState(false);
  const [apiError, setApiError] = useState('');
  const [hydrated, setHydrated] = useState(false);
  const {colors} = useAppTheme();

  const {
    control,
    handleSubmit,
    setValue,
    watch,
    formState: {errors, isSubmitting},
  } = useForm({
    defaultValues: {username: '', password: ''},
    mode: 'onSubmit',
  });
  const username = watch('username');
  const password = watch('password');
  const isSubmitDisabled = useMemo(
    () => !String(username || '').trim() || !String(password || '').trim(),
    [password, username],
  );

  useEffect(() => {
    (async () => {
      const remembered = await getRememberedUsername();
      if (remembered) {
        setValue('username', remembered);
        setRememberPassword(true);
      }
      setHydrated(true);
    })();
  }, [setValue]);

  const onSubmit = async ({username: formUsername, password: formPassword}) => {
    setApiError('');
    const u = formUsername.trim();
    const p = formPassword.trim();
    if (!u || !p) {
      setApiError('Please enter both username and password');
      return;
    }

    try {
      const result = await loginWithCredentials(u, p);
      const body = result?.data;
      if (body?.status === 'success' && body?.data?.tokens && body?.data?.user) {
        const {access_token, refresh_token} = body.data.tokens;
        const userData = body.data.user;
        await persistAuth({
          accessToken: access_token,
          refreshToken: refresh_token,
          user: userData,
        });
        if (rememberPassword) {
          await setRememberedUsername(u);
        } else {
          await setRememberedUsername(null);
        }
        dispatch(
          loginAction({
            user: userData,
            accessToken: access_token,
            refreshToken: refresh_token,
          }),
        );
        navigation.reset({index: 0, routes: [{name: 'MainTabs'}]});
        return;
      }
      setApiError(body?.message || 'Login failed');
    } catch (err) {
      const data = err?.data;
      if (data?.status === 'error' && data?.errors?.non_field_errors?.length) {
        setApiError(data.errors.non_field_errors[0]);
      } else if (err?.message) {
        setApiError(err.message);
      } else {
        setApiError('Something went wrong. Please try again.');
      }
    }
  };

  if (!hydrated) {
    return (
      <SafeAreaView style={[styles.container, styles.centered]}>
        <StatusBar barStyle={colors.statusBar} backgroundColor={colors.background} />
        <ActivityIndicator size="small" color={colors.primary} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, {backgroundColor: colors.background}]} edges={['top', 'left', 'right', 'bottom']}>
      <StatusBar barStyle={colors.statusBar} backgroundColor={colors.background} />
      <KeyboardAvoidingView style={styles.flex1} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          bounces={false}
          showsVerticalScrollIndicator={false}>
          <View style={styles.logoWrap}>
            <AuthBrand />
          </View>
          {apiError ? (
            <View style={styles.errorBanner}>
              <Text style={styles.errorText}>{apiError}</Text>
            </View>
          ) : null}
          <View style={[styles.card, {backgroundColor: colors.card}]}>
            <Controller
              control={control}
              name="username"
              rules={{required: 'Username is required'}}
              render={({field: {onChange, value}}) => (
                <CustomInput
                  label="Username"
                  value={value}
                  onChangeText={onChange}
                  placeholder="Enter username"
                  error={errors.username?.message}
                  editable={!isSubmitting}
                  autoFocus
                />
              )}
            />
            <Controller
              control={control}
              name="password"
              rules={{required: 'Password is required'}}
              render={({field: {onChange, value}}) => (
                <CustomInput
                  label="Password"
                  value={value}
                  onChangeText={onChange}
                  placeholder="Enter password"
                  error={errors.password?.message}
                  secureTextEntry
                  editable={!isSubmitting}
                />
              )}
            />
            <View style={styles.optionsRow}>
              <CustomCheckbox
                label="Remember Password"
                value={rememberPassword}
                onChange={setRememberPassword}
                disabled={isSubmitting}
              />
              <TouchableOpacity
                onPress={() => navigation.navigate('ForgotPassword')}
                disabled={isSubmitting}
                activeOpacity={0.8}>
                <Text style={[styles.forgotLink, {color: colors.primary}]}>Forgot Password?</Text>
              </TouchableOpacity>
            </View>
            <CustomButton
              title="Sign In"
              onPress={handleSubmit(onSubmit)}
              loading={isSubmitting}
              disabled={isSubmitDisabled}
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex1: {flex: 1},
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  container: {
    flex: 1,
    backgroundColor: AuthColors.bg,
  },
  content: {
    paddingHorizontal: AuthSpacing.screenHorizontal,
    paddingTop: 10,
    paddingBottom: 20,
  },
  logoWrap: {
    alignItems: 'center',
    marginBottom: 16,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 3},
    shadowOpacity: 0.08,
    shadowRadius: 8,
    // elevation: 3,
  },
  optionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 22,
    marginTop: 2,
  },
  forgotLink: {
    ...Textstyles.medium,
    fontSize: 14,
    color: AuthColors.primary,
    fontWeight: '600',
  },
  errorBanner: {
    marginBottom: 12,
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#FECACA',
    backgroundColor: '#FEF2F2',
  },
  errorText: {...Textstyles.normal, fontSize: 13, color: AuthColors.error},
});
