import React from 'react';
import {TouchableOpacity, View, Text, StyleSheet} from 'react-native';
import AppColors from '../theme/colors';

export default function AppCheckbox({label, value, onChange, disabled = false}) {
  return (
    <TouchableOpacity style={styles.row} onPress={() => onChange(!value)} disabled={disabled} activeOpacity={0.85}>
      <View style={[styles.box, value && styles.checked]}>{value ? <Text style={styles.tick}>✓</Text> : null}</View>
      <Text style={styles.label}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  row: {flexDirection: 'row', alignItems: 'center'},
  box: {
    width: 20,
    height: 20,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: AppColors.border,
    backgroundColor: AppColors.white,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  checked: {borderColor: AppColors.primary, backgroundColor: AppColors.primary},
  tick: {color: AppColors.white, fontSize: 12, fontWeight: '700'},
  label: {fontSize: 14, color: AppColors.textPrimary},
});
