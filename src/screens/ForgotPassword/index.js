import React, {useState} from 'react';
import {View, Text, TouchableOpacity, StyleSheet, StatusBar, KeyboardAvoidingView, Platform, ScrollView} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useNavigation} from '@react-navigation/native';
import {AuthColors, AuthSpacing} from '../../constants/authTheme';
import CustomInput from '../../components/auth/CustomInput';
import CustomButton from '../../components/auth/CustomButton';
import AuthBrand from '../../components/auth/AuthBrand';

export default function ForgotPassword() {
  const navigation = useNavigation();
  const [usernameOrEmail, setUsernameOrEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [fieldError, setFieldError] = useState('');

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

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right', 'bottom']}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      <KeyboardAvoidingView style={styles.flex1} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" bounces={false}>
          <View style={styles.brandWrap}>
            <AuthBrand compact />
          </View>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.backButton}
            hitSlop={{top: 12, bottom: 12, left: 12, right: 12}}>
            <Text style={styles.backArrow}>‹</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Forgot Password?</Text>
          <Text style={styles.subtitle}>
            Enter your username or email address and we will send reset instructions.
          </Text>
          <View style={styles.card}>
            <CustomInput
              label="Username / Email"
              value={usernameOrEmail}
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
              <CustomButton
                title="Back to Sign In"
                variant="secondary"
                onPress={() => navigation.navigate('Login')}
              />
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
  backArrow: {
    fontSize: 30,
    color: AuthColors.text,
    fontWeight: '400',
  },
  brandWrap: {
    alignItems: 'center',
    marginBottom: 14,
  },
  title: {
    fontSize: 24,
    color: AuthColors.text,
    fontWeight: '700',
    marginBottom: 12,
  },
  subtitle: {
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
    elevation: 3,
  },
  secondaryWrap: {marginTop: 12},
});
