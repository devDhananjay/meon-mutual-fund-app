import React from 'react';
import {View, Text, TouchableOpacity, StyleSheet} from 'react-native';
import {useAppTheme} from '../../theme/useAppTheme';
import Textstyles from '../../utils/text';

export default function SupportLanguageToggle({lang, onChange}) {
  const {colors, isDark} = useAppTheme();
  const activeBg = colors.primary;
  const inactiveBg = isDark ? '#2C2C2C' : '#E5E7EB';
  const activeTxt = '#FFFFFF';
  const inactiveTxt = colors.textPrimary;

  return (
    <View style={[styles.wrap, {borderColor: colors.border, backgroundColor: isDark ? '#232326' : '#F8FAFC'}]}>
      <View style={styles.row}>
      <TouchableOpacity
        onPress={() => onChange('en')}
        style={[styles.chip, {backgroundColor: lang === 'en' ? activeBg : inactiveBg}]}
        hitSlop={6}
        activeOpacity={0.85}>
        <Text style={[styles.chipTxt, Textstyles.medium, {color: lang === 'en' ? activeTxt : inactiveTxt}]}>EN</Text>
      </TouchableOpacity>
      <TouchableOpacity
        onPress={() => onChange('hi')}
        style={[styles.chip, {backgroundColor: lang === 'hi' ? activeBg : inactiveBg}]}
        hitSlop={6}
        activeOpacity={0.85}>
        <Text style={[styles.chipTxt, Textstyles.medium, {color: lang === 'hi' ? activeTxt : inactiveTxt}]}>HI</Text>
      </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    borderWidth: 1,
    borderRadius: 999,
    padding: 3,
  },
  row: {flexDirection: 'row', alignItems: 'center', gap: 6},
  chip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    minWidth: 36,
    alignItems: 'center',
  },
  chipTxt: {fontSize: 12, fontWeight: '700'},
});
