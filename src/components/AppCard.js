import React from 'react';
import {View, StyleSheet} from 'react-native';
import AppColors from '../theme/colors';
import {radius} from '../theme/radius';
import {shadows} from '../theme/shadows';

export default function AppCard({children, style}) {
  return <View style={[styles.card, style]}>{children}</View>;
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: AppColors.card,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: AppColors.border,
    padding: 16,
    ...shadows.card,
  },
});
