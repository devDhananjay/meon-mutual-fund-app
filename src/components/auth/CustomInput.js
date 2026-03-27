import React, {useMemo, useState} from 'react';
import {View, Text, TextInput, TouchableOpacity, StyleSheet} from 'react-native';
import {AuthColors} from '../../constants/authTheme';

export default function CustomInput({
  label,
  value,
  onChangeText,
  placeholder,
  error,
  secureTextEntry = false,
  keyboardType = 'default',
  autoCapitalize = 'none',
  autoCorrect = false,
  editable = true,
  returnKeyType,
  onSubmitEditing,
}) {
  const [isFocused, setIsFocused] = useState(false);
  const [passwordVisible, setPasswordVisible] = useState(false);
  const showToggle = secureTextEntry;
  const effectiveSecure = useMemo(
    () => (showToggle ? !passwordVisible : false),
    [passwordVisible, showToggle],
  );

  return (
    <View style={styles.block}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <View
        style={[
          styles.inputRow,
          isFocused && styles.inputFocused,
          error && styles.inputError,
        ]}>
        <TextInput
          style={styles.input}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor="#9CA3AF"
          secureTextEntry={effectiveSecure}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize}
          autoCorrect={autoCorrect}
          editable={editable}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          returnKeyType={returnKeyType}
          onSubmitEditing={onSubmitEditing}
        />
        {showToggle ? (
          <TouchableOpacity
            style={styles.toggleBtn}
            onPress={() => setPasswordVisible(v => !v)}
            hitSlop={{top: 8, left: 8, right: 8, bottom: 8}}>
            <Text style={styles.toggleText}>{passwordVisible ? 'Hide' : 'Show'}</Text>
          </TouchableOpacity>
        ) : null}
      </View>
      {error ? <Text style={styles.errorText}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  block: {
    marginBottom: 14,
  },
  label: {
    marginBottom: 8,
    fontSize: 14,
    color: AuthColors.text,
    fontWeight: '600',
  },
  inputRow: {
    minHeight: 50,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: AuthColors.border,
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
  },
  inputFocused: {
    borderColor: AuthColors.borderFocus,
  },
  inputError: {
    borderColor: AuthColors.error,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: AuthColors.text,
    paddingVertical: 10,
  },
  toggleBtn: {
    marginLeft: 10,
  },
  toggleText: {
    fontSize: 13,
    color: AuthColors.primary,
    fontWeight: '600',
  },
  errorText: {
    fontSize: 12,
    color: AuthColors.error,
    marginTop: 6,
    marginLeft: 2,
  },
});
