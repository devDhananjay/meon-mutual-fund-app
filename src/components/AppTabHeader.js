import React from 'react';
import {View, Text, StyleSheet, TouchableOpacity, Image} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {useSelector} from 'react-redux';
import {selectCartItemCount} from '../store/slices/cartSlice';
import {navigateToCart, navigateToNotifications} from '../navigation/navigationRef';
import Textstyles from '../utils/text';
import AppColors from '../theme/colors';
import {radius} from '../theme/radius';
import Icons from '../utils/icons';

/**
 * Bell + cart cluster — same behaviour on Dashboard, Explore, My Folios.
 */
export function HeaderActionCluster() {
  const navigation = useNavigation();
  const cartCount = useSelector(selectCartItemCount);

  return (
    <View style={styles.headerActions}>
      <TouchableOpacity
        style={styles.headerIconBtn}
        onPress={() => navigateToNotifications(navigation)}
        hitSlop={{top: 8, bottom: 8, left: 8, right: 8}}
        activeOpacity={0.75}
        accessibilityLabel="Notifications">
        <Image source={Icons.NotificationsIcon} style={styles.headerIconImg} resizeMode="contain" />
      </TouchableOpacity>
      <TouchableOpacity
        style={styles.headerIconBtn}
        onPress={() => navigateToCart(navigation)}
        hitSlop={{top: 8, bottom: 8, left: 8, right: 8}}
        activeOpacity={0.75}
        accessibilityLabel="Cart">
        <Image source={Icons.CartIcon} style={styles.headerIconImg} resizeMode="contain" />
        {cartCount > 0 ? (
          <View style={styles.cartBadge}>
            <Text style={styles.cartBadgeTxt}>{cartCount > 99 ? '99+' : cartCount}</Text>
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
  const padTop = insets.top + 12;

  return (
    <View style={[styles.block, {paddingTop: padTop}]}>
      <View style={styles.row}>
        <View style={styles.titleCol}>
          <Text style={[Textstyles.heading, styles.title]} numberOfLines={2}>
            {title}
          </Text>
          {subtitle ? (
            <Text style={[Textstyles.normal, styles.subtitle]} numberOfLines={2}>
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
    paddingBottom: 10,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  titleCol: {flex: 1, minWidth: 0},
  title: {
    fontSize: 22,
    color: AppColors.textPrimary,
    lineHeight: 28,
  },
  subtitle: {fontSize: 14, color: AppColors.textSecondary, marginTop: 4},
  headerActions: {flexDirection: 'row', alignItems: 'center', gap: 6, paddingTop: 2},
  headerIconBtn: {
    width: 44,
    height: 44,
    borderRadius: radius.button,
    borderWidth: 1,
    borderColor: AppColors.border,
    backgroundColor: AppColors.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerIconImg: {width: 22, height: 22},
  notifDot: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#EF4444',
    borderWidth: 1.5,
    borderColor: AppColors.white,
  },
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
  cartBadgeTxt: {...Textstyles.heading, color: AppColors.white, fontSize: 10, fontWeight: '700'},
});
