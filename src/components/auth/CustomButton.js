import React from 'react';
import {TouchableOpacity, Text, StyleSheet, ActivityIndicator} from 'react-native';
import Textstyles from '../../utils/text';
import {useAppTheme} from '../../theme/useAppTheme';

export default function CustomButton({
  title,
  onPress,
  loading = false,
  disabled = false,
  variant = 'primary',
}) {
  const {colors} = useAppTheme();
  const isDisabled = disabled || loading;
  const secondary = variant === 'secondary';
  return (
    <TouchableOpacity
      style={[
        styles.button,
        secondary
          ? [styles.secondaryBtn, {borderColor: colors.border, backgroundColor: colors.inputBg}]
          : [styles.primaryBtn, {backgroundColor: colors.primary}],
        isDisabled && styles.disabledBtn,
      ]}
      onPress={onPress}
      disabled={isDisabled}
      activeOpacity={0.9}>
      {loading ? (
        <ActivityIndicator color={secondary ? colors.primary : colors.card} />
      ) : (
        <Text
          style={[
            styles.text,
            secondary ? [styles.secondaryText, {color: colors.textPrimary}] : [styles.primaryText, {color: colors.card}],
          ]}>
          {title}
        </Text>
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
    backgroundColor: '#2F80ED',
  },
  secondaryBtn: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
  },
  disabledBtn: {
    opacity: 0.6,
  },
  text: {
    fontSize: 16,
    ...Textstyles.heading,
  },
  primaryText: {
    color: '#FFFFFF',
  },
  secondaryText: {
    color: '#111827',
  },
});
