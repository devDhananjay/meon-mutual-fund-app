import React from 'react';
import {View, Text, StyleSheet, TouchableOpacity, Image} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {useSelector} from 'react-redux';
import {selectCartItemCount} from '../store/slices/cartSlice';
import {navigateToCart, navigateToNotifications} from '../navigation/navigationRef';
import Textstyles from '../utils/text';
import {radius} from '../theme/radius';
import Icons from '../utils/icons';
import {useAppTheme} from '../theme/useAppTheme';
import AppColors from '../theme/colors';
import {typeScale} from '../theme/typography';
import {TAB_SCREEN_SAFE_TOP_EXTRA} from '../theme/tabScreenLayout';

const HEADER_ICON_LIGHT = '#000000';
const HEADER_ICON_DARK = '#FFFFFF';

/**
 * Bell + cart cluster — same behaviour on Dashboard, Explore, My Folios.
 */
export function HeaderActionCluster() {
  const navigation = useNavigation();
  const cartCount = useSelector(selectCartItemCount);
  const {colors, isDark} = useAppTheme();
  const headerIconTint = isDark ? HEADER_ICON_DARK : HEADER_ICON_LIGHT;

  return (
    <View style={styles.headerActions}>
      <TouchableOpacity
        style={[styles.headerIconBtn, {borderColor: colors.border, backgroundColor: colors.card}]}
        onPress={() => navigateToNotifications(navigation)}
        hitSlop={{top: 8, bottom: 8, left: 8, right: 8}}
        activeOpacity={0.75}
        accessibilityLabel="Notifications">
        <Image
          source={Icons.NotificationsIcon}
          style={[styles.headerIconImg, {tintColor: headerIconTint}]}
          resizeMode="contain"
        />
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.headerIconBtn, {borderColor: colors.border, backgroundColor: colors.card}]}
        onPress={() => navigateToCart(navigation)}
        hitSlop={{top: 8, bottom: 8, left: 8, right: 8}}
        activeOpacity={0.75}
        accessibilityLabel="Cart">
        <Image
          source={Icons.CartIcon}
          style={[styles.headerIconImg, {tintColor: headerIconTint}]}
          resizeMode="contain"
        />
        {cartCount > 0 ? (
          <View style={[styles.cartBadge, {backgroundColor: colors.textPrimary}]}>
            <Text style={[styles.cartBadgeTxt, {color: colors.card}]}>{cartCount > 99 ? '99+' : cartCount}</Text>
          </View>
        ) : null}
      </TouchableOpacity>
    </View>
  );
}

/**
 * Top bar for tab screens: safe top inset + title + actions.
 */
export default function AppTabHeader({title, subtitle}) {
  const insets = useSafeAreaInsets();
  const {colors} = useAppTheme();
  const padTop = insets.top + TAB_SCREEN_SAFE_TOP_EXTRA;

  return (
    <View
      style={[
        styles.block,
        subtitle ? styles.blockWithSubtitle : null,
        {paddingTop: padTop, backgroundColor: colors.background},
      ]}>
      <View style={styles.row}>
        <View style={styles.titleCol}>
          <Text style={[Textstyles.heading, styles.title, {color: colors.textPrimary}]} numberOfLines={2}>
            {title}
          </Text>
          {subtitle ? (
            <Text style={[Textstyles.normal, styles.subtitle, {color: colors.textSecondary}]} numberOfLines={2}>
              {subtitle}
            </Text>
          ) : null}
        </View>
        <HeaderActionCluster />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  block: {
    paddingHorizontal: 16,
    paddingBottom: 0,
  },
  blockWithSubtitle: {
    paddingBottom: 8,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  titleCol: {flex: 1, minWidth: 0},
  title: {
    fontSize:20,
    lineHeight: 22,
  },
  subtitle: {fontSize: 14, marginTop: 4},
  headerActions: {flexDirection: 'row', alignItems: 'center', gap: 6},
  headerIconBtn: {
    width: 44,
    height: 44,
    borderRadius: radius.button,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerIconImg: {width: 22, height: 22},
  cartBadge: {
    position: 'absolute',
    top: 4,
    right: 2,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: AppColors.textPrimary,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  cartBadgeTxt: {...Textstyles.heading, fontSize: 10, fontWeight: '700'},
});
