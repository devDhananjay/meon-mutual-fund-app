import React from 'react';
import {View, Text, TouchableOpacity, StyleSheet} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import AppColors from '../theme/colors';

export default function AppHeader({title, onBack, right, subtitle}) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.wrap, {paddingTop: insets.top + 8}]}>
      <View style={styles.row}>
        <TouchableOpacity
          onPress={onBack}
          hitSlop={12}
          style={[styles.side, !onBack && styles.sideHidden]}
          disabled={!onBack}>
          <Text style={styles.back}>{onBack ? '‹' : ''}</Text>
        </TouchableOpacity>
        <View style={styles.center}>
          <Text style={styles.title} numberOfLines={1}>{title}</Text>
          {subtitle ? <Text style={styles.subtitle} numberOfLines={1}>{subtitle}</Text> : null}
        </View>
        <View style={styles.side}>{right}</View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    backgroundColor: AppColors.background,
    paddingHorizontal: 16,
    paddingBottom: 10,
  },
  row: {flexDirection: 'row', alignItems: 'center'},
  side: {width: 44, alignItems: 'center', justifyContent: 'center'},
  sideHidden: {opacity: 0},
  back: {fontSize: 30, color: AppColors.textPrimary, lineHeight: 30},
  center: {flex: 1, alignItems: 'center', paddingHorizontal: 6},
  title: {fontSize: 18, fontWeight: '700', color: AppColors.textPrimary},
  subtitle: {fontSize: 12, color: AppColors.textSecondary, marginTop: 2},
});
