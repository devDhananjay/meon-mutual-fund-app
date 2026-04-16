import React from 'react';
import {TouchableOpacity, Text, View, StyleSheet} from 'react-native';
import Textstyles from '../../utils/text';
import {useAppTheme} from '../../theme/useAppTheme';

export default function CustomCheckbox({label, value, onChange, disabled = false}) {
  const {colors} = useAppTheme();
  return (
    <TouchableOpacity
      style={styles.row}
      onPress={() => onChange(!value)}
      disabled={disabled}
      activeOpacity={0.85}>
      <View
        style={[
          styles.box,
          {borderColor: colors.border, backgroundColor: colors.inputBg},
          value && [styles.boxChecked, {borderColor: colors.primary, backgroundColor: colors.primary}],
        ]}>
        {value ? <Text style={[styles.check, {color: colors.card}]}>✓</Text> : null}
      </View>
      <Text style={[styles.label, {color: colors.textPrimary}]}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  box: {
    width: 20,
    height: 20,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  boxChecked: {
    borderColor: '#1E81F2',
    backgroundColor: '#1E81F2',
  },
  check: {
    color: '#FFFFFF',
    fontSize: 12,
    ...Textstyles.heading,
  },
  label: {
    color: '#111827',
    fontSize: 14,
    ...Textstyles.medium,
  },
});
