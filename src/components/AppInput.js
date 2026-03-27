import React, {useMemo, useState} from 'react';
import {View, Text, TextInput, TouchableOpacity, StyleSheet} from 'react-native';
import AppColors from '../theme/colors';
import {radius} from '../theme/radius';

export default function AppInput({
  label,
  value,
  onChangeText,
  placeholder,
  error,
  secureTextEntry = false,
  ...props
}) {
  const [focused, setFocused] = useState(false);
  const [visible, setVisible] = useState(false);
  const secure = useMemo(() => (secureTextEntry ? !visible : false), [secureTextEntry, visible]);
  return (
    <View style={styles.wrap}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <View style={[styles.row, focused && styles.rowFocus, error && styles.rowErr]}>
        <TextInput
          style={styles.input}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor="#9CA3AF"
          secureTextEntry={secure}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          {...props}
        />
        {secureTextEntry ? (
          <TouchableOpacity onPress={() => setVisible(v => !v)} hitSlop={8}>
            <Text style={styles.toggle}>{visible ? 'Hide' : 'Show'}</Text>
          </TouchableOpacity>
        ) : null}
      </View>
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {marginBottom: 14},
  label: {fontSize: 14, fontWeight: '600', color: AppColors.textPrimary, marginBottom: 8},
  row: {
    minHeight: 50,
    borderRadius: radius.input,
    borderWidth: 1,
    borderColor: AppColors.border,
    backgroundColor: AppColors.white,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
  },
  rowFocus: {borderColor: AppColors.primary},
  rowErr: {borderColor: AppColors.danger},
  input: {flex: 1, fontSize: 16, color: AppColors.textPrimary, paddingVertical: 10},
  toggle: {fontSize: 13, fontWeight: '600', color: AppColors.primary},
  error: {marginTop: 6, marginLeft: 2, fontSize: 12, color: AppColors.danger},
});
