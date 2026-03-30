import React from 'react';
import {TouchableOpacity, Text, View, StyleSheet} from 'react-native';
import {AuthColors} from '../../constants/authTheme';
import Textstyles from '../../utils/text';

export default function CustomCheckbox({label, value, onChange, disabled = false}) {
  return (
    <TouchableOpacity
      style={styles.row}
      onPress={() => onChange(!value)}
      disabled={disabled}
      activeOpacity={0.85}>
      <View style={[styles.box, value && styles.boxChecked]}>
        {value ? <Text style={styles.check}>✓</Text> : null}
      </View>
      <Text style={styles.label}>{label}</Text>
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
    borderColor: AuthColors.border,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  boxChecked: {
    borderColor: AuthColors.primary,
    backgroundColor: AuthColors.primary,
  },
  check: {
    color: '#FFFFFF',
    fontSize: 12,
    ...Textstyles.heading,
  },
  label: {
    color: AuthColors.text,
    fontSize: 14,
    ...Textstyles.medium,
  },
});
