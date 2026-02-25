import React, {useState} from 'react';
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
} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import Images from '../../utils/images';
import {Colors} from '../../utils/AppConstant';
import Textstyles from '../../utils/text';

export default function Login() {
  const navigation = useNavigation();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [rememberPassword, setRememberPassword] = useState(false);
  const [showPassword, setShowPassword] = useState(true);

  const canSignIn = username.trim().length > 0 && password.trim().length > 0;

  const onSignIn = () => {
    // TODO: API login - then navigation.replace('Bottom') or Home
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
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

        <View style={styles.form}>
          <Text style={[Textstyles.medium, styles.label]}>Username</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter username"
            placeholderTextColor={Colors.GREY}
            value={username}
            onChangeText={setUsername}
            autoCapitalize="none"
          />

          <Text style={[Textstyles.medium, styles.label]}>Password</Text>
          <View style={styles.passwordRow}>
            <TextInput
              style={[styles.input, styles.passwordInput]}
              placeholder="Enter password"
              placeholderTextColor={Colors.GREY}
              value={password}
              onChangeText={setPassword}
              secureTextEntry={showPassword}
            />
            <TouchableOpacity
              onPress={() => setShowPassword(!showPassword)}
              style={styles.eyeButton}
              hitSlop={{top: 10, bottom: 10, left: 10, right: 10}}>
              <Text style={styles.eyeText}>{showPassword ? '👁' : '👁‍🗨'}</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.optionsRow}>
            <TouchableOpacity
              onPress={() => setRememberPassword(!rememberPassword)}
              style={styles.checkRow}>
              <View style={[styles.checkbox, rememberPassword && styles.checkboxChecked]}>
                {rememberPassword && <Text style={styles.checkMark}>✓</Text>}
              </View>
              <Text style={[Textstyles.normal, styles.checkLabel]}>Remember Password</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => navigation.navigate('ForgotPassword')}>
              <Text style={[Textstyles.normal, styles.forgotLink]}>Forgot Password?</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            onPress={onSignIn}
            disabled={!canSignIn}
            style={[styles.signInButton, !canSignIn && styles.signInButtonDisabled]}>
            <Text
              style={[
                Textstyles.medium,
                styles.signInText,
                !canSignIn && styles.signInTextDisabled,
              ]}>
              Sign In
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
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
  },
  logoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 40,
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
  meBlue: { color: Colors.themeBlue },
  onRed: { color: Colors.themeRed },
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
  underlineSegment: { flex: 1 },
  underlineBlue: { backgroundColor: Colors.themeBlue },
  underlineRed: { backgroundColor: Colors.themeRed },
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
  passwordRow: {
    position: 'relative',
    marginBottom: 20,
  },
  passwordInput: {
    paddingRight: 48,
  },
  eyeButton: {
    position: 'absolute',
    right: 12,
    top: 0,
    bottom: 0,
    justifyContent: 'center',
  },
  eyeText: {
    fontSize: 20,
  },
  optionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 28,
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
    backgroundColor: Colors.BUTTON_DISABLED,
  },
  signInText: {
    fontSize: 16,
    color: Colors.white,
  },
  signInTextDisabled: {
    color: Colors.GREY,
  },
});
