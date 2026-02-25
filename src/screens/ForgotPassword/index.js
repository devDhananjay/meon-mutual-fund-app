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
} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import {Colors} from '../../utils/AppConstant';
import Textstyles from '../../utils/text';

export default function ForgotPassword() {
  const navigation = useNavigation();
  const [usernameOrEmail, setUsernameOrEmail] = useState('');

  const canSend = usernameOrEmail.trim().length > 0;

  const onSend = () => {
    // TODO: API call to send reset email
    navigation.navigate('EmailSent');
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.white} />
      <View style={styles.content}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
          hitSlop={{top: 12, bottom: 12, left: 12, right: 12}}>
          <Text style={styles.backArrow}>{'<'}</Text>
        </TouchableOpacity>

        <Text style={[Textstyles.bold, styles.title]}>Forgot Password?</Text>
        <Text style={[Textstyles.normal, styles.subtitle]}>
          Enter your username or email address, and we'll give you reset instructions.
        </Text>

        <Text style={[Textstyles.medium, styles.label]}>Username / Email Address</Text>
        <TextInput
          style={styles.input}
          placeholder="Enter username/email address"
          placeholderTextColor={Colors.GREY}
          value={usernameOrEmail}
          onChangeText={setUsernameOrEmail}
          autoCapitalize="none"
          keyboardType="email-address"
        />

        <TouchableOpacity
          onPress={onSend}
          disabled={!canSend}
          style={[styles.sendButton, !canSend && styles.sendButtonDisabled]}>
          <Text
            style={[
              Textstyles.medium,
              styles.sendText,
              !canSend && styles.sendTextDisabled,
            ]}>
            Send
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => navigation.navigate('Login')}
          style={styles.backToSignIn}>
          <Text style={[Textstyles.medium, styles.backToSignInText]}>Back to Sign In</Text>
        </TouchableOpacity>
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
    paddingTop: 56,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    marginBottom: 24,
  },
  backArrow: {
    fontSize: 28,
    color: Colors.TEXT_PRIMARY,
    fontWeight: '300',
  },
  title: {
    fontSize: 24,
    color: Colors.TEXT_PRIMARY,
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 15,
    color: Colors.gray,
    lineHeight: 22,
    marginBottom: 28,
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
    marginBottom: 24,
  },
  sendButton: {
    backgroundColor: Colors.themeBlue,
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  sendButtonDisabled: {
    backgroundColor: Colors.BUTTON_DISABLED,
  },
  sendText: {
    fontSize: 16,
    color: Colors.white,
  },
  sendTextDisabled: {
    color: Colors.GREY,
  },
  backToSignIn: {
    borderWidth: 1,
    borderColor: Colors.BORDER_GREY,
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backToSignInText: {
    fontSize: 16,
    color: Colors.TEXT_PRIMARY,
  },
});
