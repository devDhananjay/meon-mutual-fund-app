import React from 'react';
import {View, Text, TouchableOpacity, StyleSheet, Image} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import AppColors from '../theme/colors';
import Icons from '../utils/icons';
import Textstyles from '../utils/text';

export default function AppHeader({title, onBack, right, subtitle}) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.wrap, {paddingTop: insets.top + 4}]}>
      <View style={styles.row}>
        <TouchableOpacity
          onPress={onBack}
          hitSlop={12}
          style={[styles.side, !onBack && styles.sideHidden]}
          disabled={!onBack}>
          {onBack ? <Image source={Icons.BackIcon} style={styles.backImg} resizeMode="contain" /> : null}
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
    paddingBottom: 6,
  },
  row: {flexDirection: 'row', alignItems: 'center'},
  side: {width: 44, alignItems: 'center', justifyContent: 'center'},
  sideHidden: {opacity: 0},
  backImg: {width: 18, height: 18, tintColor: AppColors.textPrimary},
  center: {flex: 1, alignItems: 'center', paddingHorizontal: 6},
  title: {...Textstyles.heading, fontSize: 18, color: AppColors.textPrimary},
  subtitle: {...Textstyles.medium, fontSize: 12, color: AppColors.textSecondary, marginTop: 2},
});
