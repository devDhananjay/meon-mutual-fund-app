import React from 'react';
import {TouchableOpacity, Image, StyleSheet} from 'react-native';
import Icons from '../utils/icons';
import {useAppTheme} from '../theme/useAppTheme';

/**
 * Consistent back control using `Icons.BackIcon` (same asset as AppHeader).
 */
const HEADER_TINT_LIGHT = '#000000';
const HEADER_TINT_DARK = '#FFFFFF';

export default function AppBackButton({
  onPress,
  hitSlop = 12,
  style,
  tintColor,
  imageStyle,
  /** Use high-contrast black/white for nav bars (default). Set false to follow theme text color. */
  forHeader = true,
}) {
  const {colors, isDark} = useAppTheme();
  const headerTint = isDark ? HEADER_TINT_DARK : HEADER_TINT_LIGHT;
  const tc = tintColor ?? (forHeader ? headerTint : colors.textPrimary);
  const hs =
    typeof hitSlop === 'number'
      ? {top: hitSlop, bottom: hitSlop, left: hitSlop, right: hitSlop}
      : hitSlop;
  return (
    <TouchableOpacity
      onPress={onPress}
      hitSlop={hs}
      style={[styles.hit, style]}
      accessibilityRole="button"
      accessibilityLabel="Go back">
      <Image source={Icons.BackIcon} style={[styles.img, {tintColor: tc}, imageStyle]} resizeMode="contain" />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  hit: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  img: {
    width: 18,
    height: 18,
    right:15,
  },
});
