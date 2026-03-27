import React from 'react';
import {TouchableOpacity, Text, StyleSheet, ActivityIndicator} from 'react-native';
import {AuthColors} from '../../constants/authTheme';

export default function CustomButton({
  title,
  onPress,
  loading = false,
  disabled = false,
  variant = 'primary',
}) {
  const isDisabled = disabled || loading;
  const secondary = variant === 'secondary';
  return (
    <TouchableOpacity
      style={[
        styles.button,
        secondary ? styles.secondaryBtn : styles.primaryBtn,
        isDisabled && styles.disabledBtn,
      ]}
      onPress={onPress}
      disabled={isDisabled}
      activeOpacity={0.9}>
      {loading ? (
        <ActivityIndicator color={secondary ? AuthColors.primary : '#FFFFFF'} />
      ) : (
        <Text style={[styles.text, secondary ? styles.secondaryText : styles.primaryText]}>{title}</Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    minHeight: 52,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  primaryBtn: {
    backgroundColor: AuthColors.primary,
  },
  secondaryBtn: {
    borderWidth: 1,
    borderColor: AuthColors.border,
    backgroundColor: '#FFFFFF',
  },
  disabledBtn: {
    opacity: 0.6,
  },
  text: {
    fontSize: 16,
    fontWeight: '700',
  },
  primaryText: {
    color: '#FFFFFF',
  },
  secondaryText: {
    color: AuthColors.text,
  },
});
