import React from 'react';
import {TouchableOpacity, Text, StyleSheet, ActivityIndicator} from 'react-native';
import AppColors from '../theme/colors';
import {radius} from '../theme/radius';
import {shadows} from '../theme/shadows';
import Textstyles from '../utils/text';

export default function AppButton({
  title,
  onPress,
  loading = false,
  disabled = false,
  variant = 'primary',
  style,
}) {
  const isSecondary = variant === 'secondary';
  const isDisabled = disabled || loading;
  return (
    <TouchableOpacity
      activeOpacity={0.9}
      onPress={onPress}
      disabled={isDisabled}
      style={[
        styles.base,
        isSecondary ? styles.secondary : styles.primary,
        isDisabled && styles.disabled,
        style,
      ]}>
      {loading ? (
        <ActivityIndicator color={isSecondary ? AppColors.primary : AppColors.white} />
      ) : (
        <Text style={[styles.txt, isSecondary ? styles.secondaryTxt : styles.primaryTxt]}>{title}</Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: 52,
    borderRadius: radius.buttonLarge,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  primary: {
    backgroundColor: AppColors.primary,
    ...shadows.button,
  },
  secondary: {
    backgroundColor: AppColors.white,
    borderWidth: 1,
    borderColor: AppColors.border,
  },
  disabled: {
    opacity: 0.65,
  },
  txt: {...Textstyles.heading, fontSize: 16},
  primaryTxt: {color: AppColors.white},
  secondaryTxt: {color: AppColors.textPrimary},
});
