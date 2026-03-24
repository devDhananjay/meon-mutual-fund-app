import React, {useCallback, useMemo, useState} from 'react';
import {View, Text, StyleSheet, FlatList, TouchableOpacity, Image, Alert} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useNavigation} from '@react-navigation/native';
import {useDispatch, useSelector} from 'react-redux';
import {
  removeFromCart,
  clearCart,
  updateCartItem,
  selectCartItems,
  selectCartTotal,
} from '../../store/slices/cartSlice';
import {
  authenticateOrder,
  buildOrderPlacePayload,
  createCartOrder,
  extractOrderId,
  extractOrderAuthUrl,
} from '../../services/ordersService';
import {Colors} from '../../utils/AppConstant';
import Textstyles from '../../utils/text';

const PAGE_BG = '#F0F2F5';
const CARD_BORDER = '#E8E8E8';
const GREEN_BTN = '#22C55E';
const THEME_BLUE = '#1890FF';

function formatInr(n) {
  const num = Number(n);
  if (Number.isNaN(num)) {
    return '—';
  }
  return `₹${num.toLocaleString('en-IN', {minimumFractionDigits: 0, maximumFractionDigits: 2})}`;
}

function minAmountForItem(item) {
  const f = item.fund || {};
  const m =
    Number(f.min_purchase_amount) ||
    Number(f?.holdings?.min_sip_investment) ||
    500;
  return Math.max(100, m);
}

function stepForAmount(amount) {
  if (amount >= 100000) {
    return 5000;
  }
  if (amount >= 10000) {
    return 1000;
  }
  return 500;
}

function CartLineItem({item, onRemove, onChangeAmount, onToggleSip}) {
  const fund = item.fund || {};
  const name = (fund.scheme_name || fund.base_scheme_name || 'Fund').toUpperCase();
  const logo = item.logo_url || fund.logo_url;
  const min = minAmountForItem(item);
  const amt = Number(item.amount) || min;
  const step = stepForAmount(amt);

  return (
    <View style={styles.lineCard}>
      <View style={styles.lineTop}>
        {logo ? (
          <Image source={{uri: logo}} style={styles.logo} resizeMode="contain" />
        ) : (
          <View style={[styles.logo, styles.logoPh]}>
            <Text style={styles.logoL}>{(name || '?')[0]}</Text>
          </View>
        )}
        <View style={styles.lineBody}>
          <Text style={styles.schemeCaps} numberOfLines={3}>
            {name}
          </Text>
          <Text style={styles.schemeCode}>
            {fund.scheme_code ? `Code · ${fund.scheme_code}` : ''}
          </Text>
        </View>
      </View>

      <View style={styles.typeRow}>
        <TouchableOpacity
          style={[styles.typeChip, styles.typeChipLeft, !item.isSIP && styles.typeChipOn]}
          onPress={() => onToggleSip(item, false)}
          activeOpacity={0.85}>
          <Text style={[styles.typeChipTxt, !item.isSIP && styles.typeChipTxtOn]}>Lumpsum</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.typeChip, item.isSIP && styles.typeChipOn]}
          onPress={() => onToggleSip(item, true)}
          activeOpacity={0.85}>
          <Text style={[styles.typeChipTxt, item.isSIP && styles.typeChipTxtOn]}>SIP</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.amountRow}>
        <Text style={styles.amtLabel}>Amount</Text>
        <View style={styles.stepper}>
          <TouchableOpacity
            style={styles.stepBtn}
            onPress={() => onChangeAmount(item, Math.max(min, amt - step))}
            hitSlop={8}>
            <Text style={styles.stepTxt}>−</Text>
          </TouchableOpacity>
          <Text style={[styles.amtDisplay, styles.amtDisplayPad]}>{formatInr(amt)}</Text>
          <TouchableOpacity style={styles.stepBtn} onPress={() => onChangeAmount(item, amt + step)} hitSlop={8}>
            <Text style={styles.stepTxt}>+</Text>
          </TouchableOpacity>
        </View>
      </View>
      <Text style={styles.minNote}>Min. {formatInr(min)}</Text>
      {item.isSIP ? (
        <Text style={styles.sipMeta}>
          {`SIP: ${item.sipFrequency || 'Monthly'}${item.sipDate ? ` • Date ${item.sipDate}` : ''}${
            item.sipDurationYears ? ` • ${item.sipDurationYears}Y` : ''
          }`}
        </Text>
      ) : null}
      {item.isSIP && item.mandateLabel ? <Text style={styles.sipMeta}>Mandate: {item.mandateLabel}</Text> : null}

      <TouchableOpacity style={styles.removeRow} onPress={() => onRemove(item.fund.scheme_code)} hitSlop={12}>
        <Text style={styles.removeTxt}>Remove</Text>
      </TouchableOpacity>
    </View>
  );
}

export default function CartScreen() {
  const navigation = useNavigation();
  const dispatch = useDispatch();
  const items = useSelector(selectCartItems);
  const total = useSelector(selectCartTotal);
  const [pendingOrderId, setPendingOrderId] = useState(null);
  const [pendingGatewayUrl, setPendingGatewayUrl] = useState('');
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [authLoading, setAuthLoading] = useState(false);

  const onRemove = useCallback(
    code => {
      dispatch(removeFromCart(code));
    },
    [dispatch],
  );

  const onChangeAmount = useCallback(
    (item, next) => {
      const min = minAmountForItem(item);
      const amount = Math.max(min, Math.round(next));
      dispatch(
        updateCartItem({
          fundCode: item.fund.scheme_code,
          amount,
          isSIP: item.isSIP,
          sipFrequency: item.sipFrequency,
        }),
      );
    },
    [dispatch],
  );

  const onToggleSip = useCallback(
    (item, isSIP) => {
      dispatch(
        updateCartItem({
          fundCode: item.fund.scheme_code,
          amount: Number(item.amount) || minAmountForItem(item),
          isSIP,
          sipFrequency: isSIP ? item.sipFrequency || 'Monthly' : undefined,
        }),
      );
    },
    [dispatch],
  );

  const onClearAll = useCallback(() => {
    if (items.length === 0) {
      return;
    }
    Alert.alert('Clear cart?', 'All funds will be removed from your cart.', [
      {text: 'Cancel', style: 'cancel'},
      {text: 'Clear', style: 'destructive', onPress: () => dispatch(clearCart())},
    ]);
  }, [dispatch, items.length]);

  const onCheckout = useCallback(async () => {
    if (items.length === 0) {
      return;
    }
    try {
      setCheckoutLoading(true);
      const orderBodies = items.map(item =>
        buildOrderPlacePayload({
          schemeCode: item?.fund?.scheme_code,
          amount: Number(item?.amount) || minAmountForItem(item),
          isSip: !!item?.isSIP,
          sipFrequency: item?.sipFrequency,
          sipDate: item?.sipDate,
          sipDurationYears: Number(item?.sipDurationYears),
          mandateId: item?.mandateId,
        }),
      );
      const responses = await createCartOrder(orderBodies);
      const firstOrderId = responses.map(r => extractOrderId(r?.data)).find(Boolean) ?? null;
      const firstAuthUrl = responses.map(r => extractOrderAuthUrl(r?.data)).find(Boolean) ?? null;
      if (firstAuthUrl) {
        setPendingGatewayUrl(firstAuthUrl);
      }
      if (firstOrderId) {
        setPendingOrderId(firstOrderId);
        Alert.alert('Order placed', 'Please tap "Authenticate & Continue" to proceed.');
      } else {
        Alert.alert('Order placed', 'Your order request is submitted. You can track it in My Orders.', [
          {text: 'My Orders', onPress: () => navigation.navigate('MyOrders')},
          {text: 'OK'},
        ]);
      }
    } catch (e) {
      Alert.alert('Checkout failed', String(e?.message || 'Could not place order.'));
    } finally {
      setCheckoutLoading(false);
    }
  }, [items, navigation]);

  const onAuthenticateAndContinue = useCallback(async () => {
    if (pendingGatewayUrl) {
      navigation.navigate('MandateAuthWebview', {
        uri: pendingGatewayUrl,
        title: 'Authenticate order',
      });
      return;
    }
    if (!pendingOrderId) {
      return;
    }
    try {
      setAuthLoading(true);
      const res = await authenticateOrder(pendingOrderId);
      const authUrl = extractOrderAuthUrl(res?.data);
      if (authUrl) {
        setPendingGatewayUrl(authUrl);
        navigation.navigate('MandateAuthWebview', {
          uri: authUrl,
          title: 'Authenticate order',
        });
      } else {
        Alert.alert('Authenticate', 'Could not get payment gateway URL.');
      }
    } catch (e) {
      const msg = String(e?.message || '');
      if (msg.toLowerCase().includes('already in authenticated status') && pendingGatewayUrl) {
        navigation.navigate('MandateAuthWebview', {
          uri: pendingGatewayUrl,
          title: 'Authenticate order',
        });
        return;
      }
      Alert.alert('Authenticate failed', msg || 'Could not start authentication.');
    } finally {
      setAuthLoading(false);
    }
  }, [navigation, pendingGatewayUrl, pendingOrderId]);

  const listHeader = useMemo(
    () => (
      <View style={styles.pageHead}>
        <Text style={styles.pageTitle}>My cart</Text>
        <Text style={styles.pageSub}>
          Review your order before checkout. You can switch Lumpsum / SIP and adjust amounts.
        </Text>

        {items.length > 0 ? (
          <View style={styles.summaryCard}>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Items</Text>
              <Text style={styles.summaryVal}>{items.length}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Estimated total</Text>
              <Text style={styles.summaryTotal}>{formatInr(total)}</Text>
            </View>
            <Text style={styles.summaryHint}>Taxes and charges may apply at checkout (same as web).</Text>
          </View>
        ) : null}
      </View>
    ),
    [items.length, total],
  );

  const renderItem = useCallback(
    ({item}) => (
      <CartLineItem item={item} onRemove={onRemove} onChangeAmount={onChangeAmount} onToggleSip={onToggleSip} />
    ),
    [onRemove, onChangeAmount, onToggleSip],
  );

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <View style={styles.toolbar}>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={12}>
          <Text style={styles.back}>‹ Back</Text>
        </TouchableOpacity>
        <View style={styles.toolbarMid}>
          <Text style={[Textstyles.bold, styles.toolbarTitle]}>Cart</Text>
          {items.length > 0 ? (
            <View style={[styles.badge, styles.badgeMargin]}>
              <Text style={styles.badgeTxt}>{items.length}</Text>
            </View>
          ) : null}
        </View>
        {items.length > 0 ? (
          <TouchableOpacity onPress={onClearAll} hitSlop={12}>
            <Text style={styles.clearAll}>Clear</Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.toolbarSpacer} />
        )}
      </View>

      <FlatList
        data={items}
        keyExtractor={item => item.id}
        ListHeaderComponent={listHeader}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyWrap}>
            <View style={styles.emptyCard}>
              <Text style={styles.emptyEmoji}>🛒</Text>
              <Text style={[Textstyles.medium, styles.emptyTitle]}>Your cart is empty</Text>
              <Text style={[Textstyles.normal, styles.emptySub]}>
                Add funds from Explore or open a fund and tap &quot;Add to cart&quot;.
              </Text>
              <TouchableOpacity style={styles.exploreBtn} onPress={() => navigation.navigate('Explore')} activeOpacity={0.9}>
                <Text style={[Textstyles.medium, styles.exploreBtnTxt]}>Explore funds</Text>
              </TouchableOpacity>
            </View>
          </View>
        }
        renderItem={renderItem}
        showsVerticalScrollIndicator={false}
      />

      {items.length > 0 ? (
        <View style={styles.footer}>
          <View style={styles.footerRow}>
            <Text style={styles.footerLabel}>Total</Text>
            <Text style={styles.footerTotal}>{formatInr(total)}</Text>
          </View>
          {pendingOrderId ? (
            <TouchableOpacity style={styles.checkout} onPress={onAuthenticateAndContinue} activeOpacity={0.9} disabled={authLoading}>
              <Text style={[Textstyles.medium, styles.checkoutTxt]}>
                {authLoading ? 'Authenticating...' : 'Authenticate & Continue'}
              </Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity style={styles.checkout} onPress={onCheckout} activeOpacity={0.9} disabled={checkoutLoading}>
              <Text style={[Textstyles.medium, styles.checkoutTxt]}>
                {checkoutLoading ? 'Placing order...' : 'Proceed to checkout'}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      ) : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {flex: 1, backgroundColor: PAGE_BG},
  toolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: CARD_BORDER,
  },
  back: {fontSize: 17, color: THEME_BLUE, fontWeight: '600'},
  toolbarMid: {flexDirection: 'row', alignItems: 'center'},
  badgeMargin: {marginLeft: 8},
  toolbarTitle: {fontSize: 18, color: Colors.TEXT_PRIMARY},
  badge: {
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: THEME_BLUE,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  badgeTxt: {color: Colors.white, fontSize: 12, fontWeight: '800'},
  toolbarSpacer: {width: 48},
  clearAll: {fontSize: 15, color: '#DC2626', fontWeight: '600'},
  pageHead: {paddingHorizontal: 16, paddingBottom: 8},
  pageTitle: {fontSize: 24, fontWeight: '700', color: Colors.TEXT_PRIMARY, marginBottom: 6},
  pageSub: {fontSize: 14, color: '#6B7280', lineHeight: 20, marginBottom: 12},
  summaryCard: {
    backgroundColor: Colors.white,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: CARD_BORDER,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 1},
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  summaryLabel: {fontSize: 14, color: '#6B7280'},
  summaryVal: {fontSize: 16, fontWeight: '600', color: Colors.TEXT_PRIMARY},
  summaryTotal: {fontSize: 20, fontWeight: '700', color: Colors.TEXT_PRIMARY},
  summaryHint: {fontSize: 11, color: '#9CA3AF', marginTop: 4, lineHeight: 16},
  listContent: {paddingHorizontal: 16, paddingBottom: 140},
  lineCard: {
    backgroundColor: Colors.white,
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: CARD_BORDER,
  },
  lineTop: {flexDirection: 'row', alignItems: 'flex-start'},
  logo: {width: 48, height: 48, borderRadius: 8, marginRight: 12},
  logoPh: {
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  logoL: {fontSize: 18, fontWeight: '800', color: THEME_BLUE},
  lineBody: {flex: 1},
  schemeCaps: {fontSize: 13, fontWeight: '700', color: '#111827', lineHeight: 18},
  schemeCode: {fontSize: 11, color: '#9CA3AF', marginTop: 6},
  typeRow: {flexDirection: 'row', marginTop: 12},
  typeChipLeft: {marginRight: 8},
  typeChip: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: CARD_BORDER,
    backgroundColor: '#FAFAFA',
  },
  typeChipOn: {
    backgroundColor: '#E6F4FF',
    borderColor: THEME_BLUE,
  },
  typeChipTxt: {fontSize: 13, color: '#6B7280', fontWeight: '600'},
  typeChipTxtOn: {color: THEME_BLUE},
  amountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  amtLabel: {fontSize: 13, color: '#6B7280', fontWeight: '600'},
  stepper: {flexDirection: 'row', alignItems: 'center'},
  stepBtn: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  stepTxt: {fontSize: 20, color: '#374151', fontWeight: '600', marginTop: -2},
  amtDisplay: {fontSize: 16, fontWeight: '700', color: Colors.TEXT_PRIMARY, minWidth: 100, textAlign: 'center'},
  amtDisplayPad: {marginHorizontal: 8},
  minNote: {fontSize: 11, color: '#9CA3AF', marginTop: 6},
  sipMeta: {fontSize: 11, color: '#6B7280', marginTop: 4},
  removeRow: {alignSelf: 'flex-end', marginTop: 10},
  removeTxt: {fontSize: 14, color: '#DC2626', fontWeight: '600'},
  emptyWrap: {paddingTop: 8},
  emptyCard: {
    backgroundColor: Colors.white,
    borderRadius: 12,
    padding: 32,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: CARD_BORDER,
  },
  emptyEmoji: {fontSize: 40, marginBottom: 12},
  emptyTitle: {fontSize: 17, color: Colors.TEXT_PRIMARY, marginBottom: 8, textAlign: 'center'},
  emptySub: {fontSize: 14, color: Colors.GREY, textAlign: 'center', lineHeight: 20, marginBottom: 20},
  exploreBtn: {
    backgroundColor: THEME_BLUE,
    paddingVertical: 12,
    paddingHorizontal: 28,
    borderRadius: 10,
  },
  exploreBtnTxt: {color: Colors.white, fontSize: 15},
  footer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    padding: 16,
    paddingBottom: 28,
    backgroundColor: Colors.white,
    borderTopWidth: 1,
    borderTopColor: CARD_BORDER,
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  footerLabel: {fontSize: 15, color: '#6B7280'},
  footerTotal: {fontSize: 22, fontWeight: '700', color: Colors.TEXT_PRIMARY},
  checkout: {
    backgroundColor: GREEN_BTN,
    borderRadius: 10,
    paddingVertical: 15,
    alignItems: 'center',
  },
  checkoutTxt: {color: Colors.white, fontSize: 16, fontWeight: '600'},
});
