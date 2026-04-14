import React, {useCallback, useMemo, useState} from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {CommonActions, useNavigation} from '@react-navigation/native';
import {useSelector, useDispatch} from 'react-redux';
import AppHeader from '../../components/AppHeader';
import AppColors from '../../theme/colors';
import {radius} from '../../theme/radius';
import {Colors} from '../../utils/AppConstant';
import {requestAccountDeactivation} from '../../services/userService';
import {clearAuthStorage} from '../../services/authStorage';
import {logout} from '../../store/slices/authSlice';
import {navigationRef} from '../../navigation/navigationRef';
import Textstyles from '../../utils/text';
import {appAlert} from '../../utils/appAlert';
import {useAppTheme} from '../../theme/useAppTheme';

function pickMobile(user) {
  const m =
    user?.mobile ??
    user?.phone ??
    user?.phone_number ??
    user?.mobile_number ??
    user?.contact_number ??
    '';
  return String(m).replace(/\s/g, '');
}

export default function DeleteAccountScreen() {
  const navigation = useNavigation();
  const dispatch = useDispatch();
  const {colors} = useAppTheme();
  const user = useSelector(s => s.auth.user);

  const defaultMobile = useMemo(() => pickMobile(user), [user]);
  const [mobile, setMobile] = useState(defaultMobile);
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const onSubmit = useCallback(() => {
    const m = mobile.trim();
    if (!/^\d{10}$/.test(m)) {
      appAlert('Mobile number', 'Please enter a valid 10-digit mobile number.');
      return;
    }

    appAlert(
      'Delete account',
      'This will submit a deactivation request for your account. You may be logged out after submission. Continue?',
      [
        {text: 'Cancel', style: 'cancel'},
        {
          text: 'Submit request',
          style: 'destructive',
          onPress: async () => {
            setSubmitting(true);
            try {
              const res = await requestAccountDeactivation({
                mobile: m,
                reason: reason.trim() || 'I no longer want to use this service',
              });
              if (res?.success) {
                appAlert(
                  'Request submitted',
                  'Your account deactivation request has been received. If you are signed out, you can contact support for status.',
                  [
                    {
                      text: 'OK',
                      onPress: async () => {
                        await clearAuthStorage();
                        dispatch(logout());
                        if (navigationRef.isReady()) {
                          navigationRef.dispatch(
                            CommonActions.reset({
                              index: 0,
                              routes: [{name: 'Login'}],
                            }),
                          );
                        }
                      },
                    },
                  ],
                );
              } else {
                appAlert('Request failed', 'Could not submit the request. Please try again.');
              }
            } catch (e) {
              const msg = e?.message || e?.data?.message || 'Something went wrong.';
              appAlert('Error', String(msg));
            } finally {
              setSubmitting(false);
            }
          },
        },
      ],
    );
  }, [dispatch, mobile, reason]);

  return (
    <SafeAreaView style={[styles.safe, {backgroundColor: colors.background}]} edges={['left', 'right', 'bottom']}>
      <AppHeader title="Delete account" onBack={() => navigation.goBack()} />
      <KeyboardAvoidingView
        style={styles.flex1}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>
          <Text style={[styles.lead, {color: colors.textSecondary}]}>
          Submit a request to deactivate your account. This action will be processed as per our policies. Based on your user token, we will securely fetch your account details. You may be required to verify your mobile number to proceed.
          </Text>

          <Text style={[styles.label, {color: colors.textPrimary}]}>Mobile number</Text>
          <TextInput
            style={[styles.input, {borderColor: colors.border, color: colors.textPrimary, backgroundColor: colors.inputBg}]}
            value={mobile}
            onChangeText={setMobile}
            placeholder="10-digit mobile"
            placeholderTextColor={colors.textSecondary}
            keyboardType="phone-pad"
            maxLength={10}
            editable={!submitting}
          />

          <Text style={[styles.label, {color: colors.textPrimary}]}>Reason (optional)</Text>
          <TextInput
            style={[styles.input, styles.inputMultiline, {borderColor: colors.border, color: colors.textPrimary, backgroundColor: colors.inputBg}]}
            value={reason}
            onChangeText={setReason}
            placeholder="Tell us why you are leaving…"
            placeholderTextColor={colors.textSecondary}
            multiline
            editable={!submitting}
          />

          <Text style={[styles.disclaimer, {color: colors.textSecondary}]}>
            Deactivation may affect access to investments and statements. For regulatory requirements, some records may
            be retained as permitted by law.
          </Text>

          <TouchableOpacity
            style={[styles.cta, {backgroundColor: colors.danger}]}
            onPress={onSubmit}
            disabled={submitting}
            activeOpacity={0.9}>
            {submitting ? (
              <ActivityIndicator color={colors.card} />
            ) : (
              <Text style={styles.ctaTxt}>Submit deactivation request</Text>
            )}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {flex: 1, backgroundColor: AppColors.background},
  flex1: {flex: 1},
  content: {paddingHorizontal: 16, paddingBottom: 32, paddingTop: 8},
  lead: {
    ...Textstyles.normal,
    fontSize: 15,
    lineHeight: 22,
    color: AppColors.textSecondary,
    marginBottom: 20,
  },
  label: {
    ...Textstyles.medium,
    fontSize: 13,
    fontWeight: '600',
    color: AppColors.textPrimary,
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: AppColors.border,
    borderRadius: radius.input,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    color: AppColors.textPrimary,
    backgroundColor: AppColors.card,
    marginBottom: 16,
  },
  inputMultiline: {minHeight: 100, textAlignVertical: 'top'},
  disclaimer: {
    ...Textstyles.normal,
    fontSize: 12,
    lineHeight: 18,
    color: AppColors.textSecondary,
    marginBottom: 20,
  },
  cta: {
    backgroundColor: '#DC2626',
    borderRadius: radius.buttonLarge,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 50,
  },
  ctaTxt: {...Textstyles.medium, color: Colors.white, fontSize: 16, fontWeight: '600'},
});
