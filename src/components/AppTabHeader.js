import React from 'react';
import {View, Text, StyleSheet, TouchableOpacity} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {useSelector} from 'react-redux';
import {selectCartItemCount} from '../store/slices/cartSlice';
import {navigateToCart, navigateToNotifications} from '../navigation/navigationRef';
import {Colors} from '../utils/AppConstant';
import Textstyles from '../utils/text';

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
        <Text style={styles.headerIconTxt}>🔔</Text>
        <View style={styles.notifDot} />
      </TouchableOpacity>
      <TouchableOpacity
        style={styles.headerIconBtn}
        onPress={() => navigateToCart(navigation)}
        hitSlop={{top: 8, bottom: 8, left: 8, right: 8}}
        activeOpacity={0.75}
        accessibilityLabel="Cart">
        <Text style={styles.headerIconTxt}>🛒</Text>
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
  const padTop = insets.top + 18;

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
    paddingBottom: 8,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
  },
  titleCol: {flex: 1, minWidth: 0},
  title: {
    fontSize: 24,
    color: Colors.TEXT_PRIMARY,
    fontWeight: '700',
    lineHeight: 30,
  },
  subtitle: {fontSize: 14, color: Colors.GREY, marginTop: 4},
  headerActions: {flexDirection: 'row', alignItems: 'center', gap: 6, paddingTop: 2},
  headerIconBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: Colors.BORDER_GREY,
    backgroundColor: Colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerIconTxt: {fontSize: 20},
  notifDot: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#EF4444',
    borderWidth: 1.5,
    borderColor: Colors.white,
  },
  cartBadge: {
    position: 'absolute',
    top: 4,
    right: 2,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#111',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  cartBadgeTxt: {color: Colors.white, fontSize: 10, fontWeight: '700'},
});
