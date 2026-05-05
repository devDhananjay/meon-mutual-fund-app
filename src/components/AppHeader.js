import React from 'react';
import {View, Text, TouchableOpacity, StyleSheet, Image} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import Icons from '../utils/icons';
import Textstyles from '../utils/text';
import {useAppTheme} from '../theme/useAppTheme';
import {typeScale} from '../theme/typography';

const HEADER_ICON_LIGHT = '#000000';
const HEADER_ICON_DARK = '#FFFFFF';

export default function AppHeader({title, onBack, right, subtitle, backgroundColor}) {
  const insets = useSafeAreaInsets();
  const {colors, isDark} = useAppTheme();
  const headerIconTint = isDark ? HEADER_ICON_DARK : HEADER_ICON_LIGHT;
  return (
    <View
      style={[
        styles.wrap,
        {paddingTop: insets.top + 4, backgroundColor: backgroundColor ?? colors.background},
      ]}>
      <View style={styles.row}>
        <TouchableOpacity
          onPress={onBack}
          hitSlop={12}
          style={[styles.side, !onBack && styles.sideHidden]}
          disabled={!onBack}>
          {onBack ? (
            <Image
              source={Icons.BackIcon}
              style={[styles.backImg, {tintColor: headerIconTint}]}
              resizeMode="contain"
            />
          ) : null}
        </TouchableOpacity>
        <View style={styles.center}>
          <Text style={[styles.title, {color: colors.textPrimary}]} numberOfLines={1}>
            {title}
          </Text>
          {subtitle ? (
            <Text style={[styles.subtitle, {color: colors.textSecondary}]} numberOfLines={1}>
              {subtitle}
            </Text>
          ) : null}
        </View>
        <View style={styles.side}>{right}</View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {paddingHorizontal: 16, paddingBottom: 6},
  row: {flexDirection: 'row', alignItems: 'center', minHeight: 44},
  side: {minWidth: 44, paddingHorizontal: 2, alignItems: 'center', justifyContent: 'center'},
  sideHidden: {opacity: 0},
  backImg: {width: 18, height: 18, right:15},
  center: {flex: 1, alignItems: 'center', paddingHorizontal: 6},
  title: {...Textstyles.heading, fontSize: typeScale.title},
  subtitle: {...Textstyles.medium, fontSize: 12, marginTop: 2},
});
