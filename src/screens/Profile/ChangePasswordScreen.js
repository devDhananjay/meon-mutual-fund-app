import React, {useMemo, useState} from 'react';
import {Image, StyleSheet, Text, TextInput, TouchableOpacity, View} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useNavigation} from '@react-navigation/native';
import AppHeader from '../../components/AppHeader';
import {appAlert} from '../../utils/appAlert';
import Textstyles from '../../utils/text';
import {useAppTheme} from '../../theme/useAppTheme';
import { Icons } from '../../utils';

function PasswordField({
  label,
  value,
  onChangeText,
  placeholder,
  secureTextEntry,
  onToggle,
  styles,
}) {
  return (
    <View style={styles.fieldWrap}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <View style={styles.inputRow}>
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={styles.placeholderColor.color}
          secureTextEntry={secureTextEntry}
          style={styles.input}
        />
        <TouchableOpacity onPress={onToggle} hitSlop={8}>
          {/* <Text style={styles.eye}>{secureTextEntry ? '👁' : '🙈'}</Text> */}
          <Image source={secureTextEntry ? Icons.EyeIcon : Icons.HidePassword} style={styles.eyeImg} resizeMode="contain" />
        </TouchableOpacity>
      </View>
    </View>
  );
}

export default function ChangePasswordScreen() {
  const navigation = useNavigation();
  const {colors, isDark} = useAppTheme();
  const styles = useMemo(() => createStyles(colors, isDark), [colors, isDark]);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const validLength = newPassword.length >= 8 && newPassword.length <= 12;
  const canUpdate =
    currentPassword.length > 0 &&
    validLength &&
    confirmPassword.length > 0 &&
    newPassword === confirmPassword;

  const onUpdate = () => {
    if (!validLength) {
      appAlert('Change password', 'Password length must be 8-12 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      appAlert('Change password', 'New password and confirm password do not match.');
      return;
    }
    appAlert('Change password', 'Password update request submitted.');
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right', 'bottom']}>
      <AppHeader title="Change Password" onBack={() => navigation.goBack()} />
      <View style={styles.body}>
        <Text style={styles.caption}>Your new password must be 8 -12 character long.</Text>
        <PasswordField
          label="Current Password"
          value={currentPassword}
          onChangeText={setCurrentPassword}
          placeholder="Enter old password"
          secureTextEntry={!showCurrent}
          onToggle={() => setShowCurrent(v => !v)}
          styles={styles}
        />
        <PasswordField
          label="New Password"
          value={newPassword}
          onChangeText={setNewPassword}
          placeholder="Enter password"
          secureTextEntry={!showNew}
          onToggle={() => setShowNew(v => !v)}
          styles={styles}
        />
        <PasswordField
          label="Confirm New Password"
          value={confirmPassword}
          onChangeText={setConfirmPassword}
          placeholder="Enter password"
          secureTextEntry={!showConfirm}
          onToggle={() => setShowConfirm(v => !v)}
          styles={styles}
        />
      </View>
      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.updateBtn, !canUpdate && styles.updateBtnDisabled]}
          onPress={onUpdate}
          activeOpacity={0.9}
          disabled={!canUpdate}>
          <Text style={styles.updateBtnTxt}>Update</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

function createStyles(c, isDark) {
  return StyleSheet.create({
    safe: {flex: 1, backgroundColor: c.background},
    body: {paddingHorizontal: 16, paddingTop: 10},
    caption: {fontSize: 18, color: c.textSecondary, marginBottom: 18, lineHeight: 30},
    fieldWrap: {marginBottom: 14},
    fieldLabel: {fontSize: 17, color: c.textPrimary, marginBottom: 7, ...Textstyles.medium},
    inputRow: {
      minHeight: 50,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: c.border,
      backgroundColor: c.card,
      paddingHorizontal: 12,
      flexDirection: 'row',
      alignItems: 'center',
    },
    input: {flex: 1, color: c.textPrimary, fontSize: 17},
    placeholderColor: {color: c.textSecondary},
    eye: {fontSize: 20},
    footer: {paddingHorizontal: 16, paddingBottom: 14, paddingTop: 6},
    updateBtn: {
      minHeight: 52,
      borderRadius: 12,
      backgroundColor: c.primary,
      alignItems: 'center',
      justifyContent: 'center',
    },
    updateBtnDisabled: {backgroundColor: isDark ? '#374151' : '#CBD5E1'},
    updateBtnTxt: {color: '#fff', fontSize: 18, ...Textstyles.medium},
    eyeImg: {width: 22, height: 22},
  });
}
