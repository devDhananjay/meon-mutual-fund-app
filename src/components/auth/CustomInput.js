import React, {useMemo, useState} from 'react';
import {View, Text, TextInput, TouchableOpacity, StyleSheet} from 'react-native';
import Textstyles from '../../utils/text';
import {useAppTheme} from '../../theme/useAppTheme';

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
  autoFocus = false,
}) {
  const {colors} = useAppTheme();
  const [isFocused, setIsFocused] = useState(false);
  const [passwordVisible, setPasswordVisible] = useState(false);
  const showToggle = secureTextEntry;
  const effectiveSecure = useMemo(
    () => (showToggle ? !passwordVisible : false),
    [passwordVisible, showToggle],
  );

  return (
    <View style={styles.block}>
      {label ? <Text style={[styles.label, {color: colors.textPrimary}]}>{label}</Text> : null}
      <View
        style={[
          styles.inputRow,
          {borderColor: colors.border, backgroundColor: colors.inputBg},
          isFocused && {borderColor: colors.primary},
          error && {borderColor: colors.danger},
        ]}>
        <TextInput
          style={[styles.input, {color: colors.textPrimary}]}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={colors.textSecondary}
          secureTextEntry={effectiveSecure}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize}
          autoCorrect={autoCorrect}
          editable={editable}
          autoFocus={autoFocus}
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
            <Text style={[styles.toggleText, {color: colors.primary}]}>
              {passwordVisible ? 'Hide' : 'Show'}
            </Text>
          </TouchableOpacity>
        ) : null}
      </View>
      {error ? <Text style={[styles.errorText, {color: colors.danger}]}>{error}</Text> : null}
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
    ...Textstyles.medium,
  },
  inputRow: {
    minHeight: 50,
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
  },
  input: {
    flex: 1,
    fontSize: 16,
    paddingVertical: 10,
  },
  toggleBtn: {
    marginLeft: 10,
  },
  toggleText: {
    fontSize: 13,
    ...Textstyles.medium,
  },
  errorText: {
    fontSize: 12,
    marginTop: 6,
    marginLeft: 2,
    ...Textstyles.normal,
  },
});
