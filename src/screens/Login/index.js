import React, {useEffect, useState} from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  KeyboardAvoidingView,
  Platform,
  Image,
  ActivityIndicator,
} from 'react-native';
import {useForm, Controller} from 'react-hook-form';
import {useNavigation} from '@react-navigation/native';
import {useDispatch} from 'react-redux';
import Images from '../../utils/images';
import {Colors} from '../../utils/AppConstant';
import Textstyles from '../../utils/text';
import {login as loginAction} from '../../store/slices/authSlice';
import {loginWithCredentials} from '../../services/authService';
import {persistAuth, getRememberedUsername, setRememberedUsername} from '../../services/authStorage';

export default function Login() {
  const navigation = useNavigation();
  const dispatch = useDispatch();
  const [rememberPassword, setRememberPassword] = useState(false);
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [apiError, setApiError] = useState('');
  const [hydrated, setHydrated] = useState(false);

  const {
    control,
    handleSubmit,
    setValue,
    formState: {errors, isSubmitting},
  } = useForm({
    defaultValues: {username: '', password: ''},
    mode: 'onSubmit',
  });

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

  const onSubmit = async ({username, password}) => {
    setApiError('');
    const u = username.trim();
    const p = password.trim();
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
      <View style={[styles.container, styles.centered]}>
        <StatusBar barStyle="dark-content" backgroundColor={Colors.white} />
        <ActivityIndicator size="large" color={Colors.themeBlue} />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.white} />
      <View style={styles.content}>
        {!!apiError && (
          <View style={styles.errorBanner}>
            <Text style={styles.errorText}>{apiError}</Text>
          </View>
        )}

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

        <View style={styles.form}>
          <Text style={[Textstyles.medium, styles.label]}>Username</Text>
          <Controller
            control={control}
            name="username"
            rules={{required: 'Username is required'}}
            render={({field: {onChange, onBlur, value}}) => (
              <TextInput
                style={[styles.input, errors.username && styles.inputError]}
                placeholder="Enter username"
                placeholderTextColor={Colors.GREY}
                value={value}
                onBlur={onBlur}
                onChangeText={onChange}
                autoCapitalize="none"
                autoCorrect={false}
                editable={!isSubmitting}
              />
            )}
          />
          {errors.username && (
            <Text style={styles.fieldError}>{errors.username.message}</Text>
          )}

          <Text style={[Textstyles.medium, styles.label]}>Password</Text>
          <View style={styles.passwordRow}>
            <Controller
              control={control}
              name="password"
              rules={{required: 'Password is required'}}
              render={({field: {onChange, onBlur, value}}) => (
                <TextInput
                  style={[styles.input, styles.passwordInput, errors.password && styles.inputError]}
                  placeholder="Enter password"
                  placeholderTextColor={Colors.GREY}
                  value={value}
                  onBlur={onBlur}
                  onChangeText={onChange}
                  secureTextEntry={!passwordVisible}
                  editable={!isSubmitting}
                />
              )}
            />
            <TouchableOpacity
              onPress={() => setPasswordVisible(!passwordVisible)}
              style={styles.eyeButton}
              hitSlop={{top: 10, bottom: 10, left: 10, right: 10}}>
              <Text style={styles.eyeText}>{passwordVisible ? 'Hide' : 'Show'}</Text>
            </TouchableOpacity>
          </View>
          {errors.password && (
            <Text style={styles.fieldError}>{errors.password.message}</Text>
          )}

          <View style={styles.optionsRow}>
            <TouchableOpacity
              onPress={() => setRememberPassword(!rememberPassword)}
              style={styles.checkRow}
              disabled={isSubmitting}>
              <View style={[styles.checkbox, rememberPassword && styles.checkboxChecked]}>
                {rememberPassword && <Text style={styles.checkMark}>✓</Text>}
              </View>
              <Text style={[Textstyles.normal, styles.checkLabel]}>Remember username</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => navigation.navigate('ForgotPassword')}
              disabled={isSubmitting}>
              <Text style={[Textstyles.normal, styles.forgotLink]}>Forgot Password?</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            onPress={handleSubmit(onSubmit)}
            disabled={isSubmitting}
            style={[styles.signInButton, isSubmitting && styles.signInButtonDisabled]}>
            {isSubmitting ? (
              <ActivityIndicator color={Colors.white} />
            ) : (
              <Text style={[Textstyles.medium, styles.signInText]}>Sign In</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  container: {
    flex: 1,
    backgroundColor: Colors.white,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 48,
  },
  errorBanner: {
    marginBottom: 16,
    padding: 12,
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    borderRadius: 8,
  },
  errorText: {
    color: '#B91C1C',
    fontSize: 14,
  },
  fieldError: {
    color: '#B91C1C',
    fontSize: 12,
    marginTop: -12,
    marginBottom: 12,
  },
  logoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 32,
  },
  logoIcon: {
    width: 48,
    height: 48,
    marginRight: 8,
  },
  brandText: {
    alignItems: 'flex-start',
  },
  meonText: {
    fontSize: 24,
    letterSpacing: 0.5,
  },
  meBlue: {color: Colors.themeBlue},
  onRed: {color: Colors.themeRed},
  mutualFunds: {
    fontSize: 10,
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
  underlineSegment: {flex: 1},
  underlineBlue: {backgroundColor: Colors.themeBlue},
  underlineRed: {backgroundColor: Colors.themeRed},
  form: {
    flex: 1,
  },
  label: {
    fontSize: 14,
    color: Colors.TEXT_PRIMARY,
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: Colors.BORDER_GREY,
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    color: Colors.TEXT_PRIMARY,
    marginBottom: 20,
  },
  inputError: {
    borderColor: '#F87171',
  },
  passwordRow: {
    position: 'relative',
    marginBottom: 4,
  },
  passwordInput: {
    paddingRight: 56,
    marginBottom: 16,
  },
  eyeButton: {
    position: 'absolute',
    right: 12,
    top: 10,
  },
  eyeText: {
    fontSize: 14,
    color: Colors.LINK_BLUE,
  },
  optionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 28,
    flexWrap: 'wrap',
    gap: 8,
  },
  checkRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  checkbox: {
    width: 20,
    height: 20,
    borderWidth: 1,
    borderColor: Colors.BORDER_GREY,
    borderRadius: 4,
    marginRight: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: {
    backgroundColor: Colors.themeBlue,
    borderColor: Colors.themeBlue,
  },
  checkMark: {
    color: Colors.white,
    fontSize: 12,
    fontWeight: '700',
  },
  checkLabel: {
    fontSize: 14,
    color: Colors.TEXT_PRIMARY,
  },
  forgotLink: {
    fontSize: 14,
    color: Colors.LINK_BLUE,
  },
  signInButton: {
    backgroundColor: Colors.themeBlue,
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  signInButtonDisabled: {
    opacity: 0.85,
  },
  signInText: {
    fontSize: 16,
    color: Colors.white,
  },
});
