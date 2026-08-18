import React, {useCallback, useMemo, useState} from 'react';
import {View, Text, StyleSheet, FlatList, TouchableOpacity, Image} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useNavigation} from '@react-navigation/native';
import {useDispatch, useSelector} from 'react-redux';
import {selectCanPostToBse} from '../../store/slices/authSlice';
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
  buildSipRegisterPayload,
  createSipRegistration,
  createSingleOrder,
  extractOrderId,
  extractOrderAuthUrl,
} from '../../services/ordersService';
import Textstyles from '../../utils/text';
import Icons from '../../utils/icons';
import AppHeader from '../../components/AppHeader';
import {useAppTheme} from '../../theme/useAppTheme';
import {pickMaxSipInvestment, pickMinSipInvestment} from '../../utils/schemeLimits';
import {appAlert} from '../../utils/appAlert';

function formatInr(n) {
  const num = Number(n);
  if (Number.isNaN(num)) {
    return '—';
  }
  return `₹${num.toLocaleString('en-IN', {minimumFractionDigits: 0, maximumFractionDigits: 2})}`;
}

function minAmountForItem(item) {
  const f = item.fund || {};
  if (item.isSIP) {
    const m = pickMinSipInvestment(f);
    return Math.max(100, m);
  }
  const m = Number(f.min_purchase_amount) || 500;
  return Math.max(100, m);
}

function maxAmountForItem(item) {
  const f = item.fund || {};
  if (item.isSIP) {
    return pickMaxSipInvestment(f);
  }
  return Number.POSITIVE_INFINITY;
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

function isSipDateWithinAllowedRange(dateStr) {
  const raw = String(dateStr || '').trim();
  const parts = raw.split('/');
  if (parts.length !== 3) {
    return false;
  }
  const day = Number(parts[0]);
  return Number.isFinite(day) && day >= 1 && day <= 28;
}

function stringifyApiValidationError(err) {
  const body = err?.data;
  const msg = err?.message;
  if (body?.errors && typeof body.errors === 'object') {
    const lines = [];
    Object.entries(body.errors).forEach(([k, v]) => {
      if (Array.isArray(v)) {
        v.forEach(item => lines.push(`${k}: ${String(item)}`));
      } else if (v != null) {
        lines.push(`${k}: ${String(v)}`);
      }
    });
    if (lines.length) {
      return lines.join('\n');
    }
  }
  return String(msg || body?.bse_remarks || body?.message || 'Could not place order.');
}

function CartLineItem({item, onRemove, onChangeAmount, onToggleSip, styles}) {
  const fund = item.fund || {};
  const name = (fund.scheme_name || fund.base_scheme_name || 'Fund').toUpperCase();
  const logo = item.logo_url || fund.logo_url;
  const min = minAmountForItem(item);
  const max = maxAmountForItem(item);
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
          style={[styles.typeChip, !item.isSIP && styles.typeChipOn]}
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

      <View style={styles.amountDivider} />

      <View style={styles.amountRow}>
        <Text style={styles.amtLabel}>Amount</Text>
        <View style={styles.stepper}>
          <TouchableOpacity
            style={styles.stepBtn}
            onPress={() => onChangeAmount(item, Math.min(max, Math.max(min, amt - step)))}
            hitSlop={8}>
            <Text style={styles.stepTxt}>−</Text>
          </TouchableOpacity>
          <Text style={[styles.amtDisplay, styles.amtDisplayPad]}>{formatInr(amt)}</Text>
          <TouchableOpacity
            style={styles.stepBtn}
            onPress={() => onChangeAmount(item, Math.min(max, amt + step))}
            hitSlop={8}>
            <Text style={styles.stepTxt}>+</Text>
          </TouchableOpacity>
        </View>
      </View>
      <Text style={styles.minNote}>
        {item.isSIP ? `SIP ${formatInr(min)} – ${formatInr(max)}` : `Min. ${formatInr(min)}`}
      </Text>
      {item.isSIP ? (
        <Text style={styles.sipMeta}>
          {`SIP: ${item.sipFrequency || 'Monthly'}${item.sipDate ? ` • ${item.sipDate}` : ''}${
            String(item.sipFrequency || '').toLowerCase() === 'daily' && item.sipEndDate
              ? ` → ${item.sipEndDate}`
              : item.sipDurationYears
                ? ` • ${item.sipDurationYears}Y`
                : ''
          }`}
        </Text>
      ) : null}
      {item.isSIP && item.mandateLabel ? <Text style={styles.sipMeta}>Mandate: {item.mandateLabel}</Text> : null}

      <TouchableOpacity style={styles.removeRow} onPress={() => onRemove(item.fund.scheme_code)} hitSlop={12}>
        <Image source={Icons.deleteIcon} style={styles.removeTxt} resizeMode="contain" />
      </TouchableOpacity>
    </View>
  );
}

export default function CartScreen() {
  const navigation = useNavigation();
  const {colors, isDark} = useAppTheme();
  const styles = useMemo(() => createCartStyles(colors, isDark), [colors, isDark]);
  const dispatch = useDispatch();
  const items = useSelector(selectCartItems);
  const total = useSelector(selectCartTotal);
  const user = useSelector(s => s.auth.user);
  const canPostToBse = useSelector(selectCanPostToBse);
  const [pendingOrderId, setPendingOrderId] = useState(null);
  const [pendingGatewayUrl, setPendingGatewayUrl] = useState('');
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [authLoading, setAuthLoading] = useState(false);

  const onRemove = useCallback(
    code => {
      appAlert('Remove item', 'Do you want to remove this?', [
        {text: 'Cancel', style: 'cancel'},
        {text: 'Remove', style: 'destructive', onPress: () => dispatch(removeFromCart(code))},
      ]);
    },
    [dispatch],
  );

  const onChangeAmount = useCallback(
    (item, next) => {
      const min = minAmountForItem(item);
      const max = maxAmountForItem(item);
      const amount = Math.min(max, Math.max(min, Math.round(next)));
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
    appAlert('Clear cart?', 'All funds will be removed from your cart.', [
      {text: 'Cancel', style: 'cancel'},
      {text: 'Clear', style: 'destructive', onPress: () => dispatch(clearCart())},
    ]);
  }, [dispatch, items.length]);

  const onCheckout = useCallback(async () => {
    if (!canPostToBse || items.length === 0) {
      return;
    }
    try {
      setCheckoutLoading(true);
      const responses = [];
      for (const item of items) {
        const amount = Number(item?.amount) || minAmountForItem(item);
        const isDailySipItem = item?.isSIP && String(item?.sipFrequency || '').toLowerCase() === 'daily';
        if (item?.isSIP && !isDailySipItem && !isSipDateWithinAllowedRange(item?.sipDate)) {
          throw {
            message: `Invalid SIP date for ${item?.fund?.scheme_code || 'fund'}. SIP date must be between 1 and 28.`,
            data: {sip_date: ['SIP date must be between 1 and 28.']},
          };
        }
        if (isDailySipItem && (!item?.sipDate || !item?.sipEndDate)) {
          throw {
            message: `Add start and end SIP dates for ${item?.fund?.scheme_code || 'fund'} (Daily SIP).`,
            data: {sip_date: ['SIP start and end dates required.']},
          };
        }

        const payload = item?.isSIP
          ? buildSipRegisterPayload({
              schemeCode: item?.fund?.scheme_code,
              amount,
              sipFrequency: item?.sipFrequency || 'Monthly',
              sipDate: item?.sipDate,
              sipDurationYears: Number(item?.sipDurationYears) || 1,
              sipEndDate: item?.sipEndDate,
              mandateId: item?.mandateId,
              firstOrderToday: !!item?.firstOrderToday,
              folioNo: item?.folioNumber ?? item?.fund?.folio_number ?? item?.fund?.folio_no,
              euin: user?.euin,
            })
          : buildOrderPlacePayload({
              schemeCode: item?.fund?.scheme_code,
              amount,
              isSip: false,
              mandateId: item?.mandateId,
              useMandate: !!item?.useMandate,
              folioNumber: item?.folioNumber,
              buySellType: item?.additionalPurchase || item?.folioNumber ? 'ADDITIONAL' : undefined,
            });

        console.log('[cart:onCheckout] placing item', {
          schemeCode: item?.fund?.scheme_code,
          isSIP: !!item?.isSIP,
          endpoint: item?.isSIP ? '/api/journey/mf/sip/register/' : '/api/journey/mf/order/place/',
          payload,
        });

        // eslint-disable-next-line no-await-in-loop
        const res = item?.isSIP ? await createSipRegistration(payload) : await createSingleOrder(payload);
        responses.push(res);
        console.log('[cart:onCheckout] item response', {
          schemeCode: item?.fund?.scheme_code,
          isSIP: !!item?.isSIP,
          response: res?.data,
        });
      }

      const firstOrderId = responses.map(r => extractOrderId(r?.data)).find(Boolean) ?? null;
      const firstAuthUrl = responses.map(r => extractOrderAuthUrl(r?.data)).find(Boolean) ?? null;
      if (firstAuthUrl) {
        setPendingGatewayUrl(firstAuthUrl);
      }
      if (firstOrderId) {
        setPendingOrderId(firstOrderId);
        appAlert('Order placed', 'Please tap "Authenticate & Continue" to proceed.');
      } else {
        appAlert('Order placed', 'Your order request is submitted. You can track it in My Orders.', [
          {text: 'My Orders', onPress: () => navigation.navigate('MyOrders')},
          {text: 'OK'},
        ]);
      }
    } catch (e) {
      console.error('[cart:onCheckout] error', {
        message: e?.message,
        status: e?.status,
        endpoint: e?.endpoint,
        method: e?.method,
        data: e?.data,
      });
      appAlert('Checkout failed', stringifyApiValidationError(e));
    } finally {
      setCheckoutLoading(false);
    }
  }, [canPostToBse, items, navigation, user?.euin]);

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
        appAlert('Authenticate', 'Could not get payment gateway URL.');
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
      appAlert('Authenticate failed', msg || 'Could not start authentication.');
    } finally {
      setAuthLoading(false);
    }
  }, [navigation, pendingGatewayUrl, pendingOrderId]);

  const listHeader = useMemo(
    () => (
      <View style={styles.pageHead}>
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
            <TouchableOpacity onPress={onClearAll} activeOpacity={0.8} style={styles.clearLink}>
              <Text style={styles.clearLinkTxt}>Clear cart</Text>
            </TouchableOpacity>
            <Text style={styles.summaryHint}>Taxes and charges may apply at checkout (same as web).</Text>
          </View>
        ) : null}
      </View>
    ),
    [items.length, total, onClearAll, styles],
  );

  const renderItem = useCallback(
    ({item}) => (
      <CartLineItem item={item} onRemove={onRemove} onChangeAmount={onChangeAmount} onToggleSip={onToggleSip} styles={styles} />
    ),
    [onRemove, onChangeAmount, onToggleSip, styles],
  );

  return (
    <SafeAreaView style={[styles.safe, {backgroundColor: colors.background}]} edges={['left', 'right', 'bottom']}>
      <AppHeader
        title="Cart"
        onBack={() => navigation.goBack()}
      />

      <View style={styles.pageBody}>
        <FlatList
          style={styles.list}
          data={items}
          keyExtractor={item => item.id}
          ListHeaderComponent={listHeader}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <View style={styles.emptyWrap}>
              <View style={[styles.emptyCard, {backgroundColor: colors.card, borderColor: colors.border}]}>
                <Image source={Icons.EmptyCart} style={styles.emptyImg} resizeMode="contain" />
                <Text style={[Textstyles.medium, styles.emptyTitle, {color: colors.textPrimary}]}>Your cart is empty</Text>
                <Text style={[Textstyles.normal, styles.emptySub, {color: colors.textSecondary}]}>
                  Add funds from Explore or open a fund and tap &quot;Add to cart&quot;.
                </Text>
                <TouchableOpacity
                  style={[styles.exploreBtn, {backgroundColor: colors.primary}]}
                  onPress={() => navigation.navigate('Explore')}
                  activeOpacity={0.9}>
                  <Text style={[Textstyles.medium, styles.exploreBtnTxt]}>Explore funds</Text>
                </TouchableOpacity>
              </View>
            </View>
          }
          renderItem={renderItem}
          showsVerticalScrollIndicator={false}
        />

        {items.length > 0 ? (
          <View style={[styles.footer, {backgroundColor: colors.card, borderTopColor: colors.border}]}>
            <View style={styles.footerRow}>
              <Text style={[styles.footerLabel, {color: colors.textSecondary}]}>Total</Text>
              <Text style={[styles.footerTotal, {color: colors.textPrimary}]}>{formatInr(total)}</Text>
            </View>
            {pendingOrderId ? (
              <TouchableOpacity
                style={[styles.checkout, {backgroundColor: colors.primary}]}
                onPress={onAuthenticateAndContinue}
                activeOpacity={0.9}
                disabled={authLoading}>
                <Text style={[Textstyles.medium, styles.checkoutTxt]}>
                  {authLoading ? 'Authenticating...' : 'Authenticate & Continue'}
                </Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={[
                  styles.checkout,
                  {backgroundColor: colors.primary},
                  !canPostToBse && styles.checkoutDisabled,
                ]}
                onPress={onCheckout}
                activeOpacity={0.9}
                disabled={checkoutLoading || !canPostToBse}>
                <Text style={[Textstyles.medium, styles.checkoutTxt]}>
                  {checkoutLoading ? 'Placing order...' : 'Proceed to checkout'}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        ) : null}
      </View>
    </SafeAreaView>
  );
}

function createCartStyles(colors, isDark) {
  const c = colors;
  return StyleSheet.create({
    safe: {flex: 1, backgroundColor: c.background},
    pageBody: {flex: 1},
    list: {flex: 1},
    badge: {
      minWidth: 22,
      height: 22,
      borderRadius: 11,
      backgroundColor: c.primary,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 6,
    },
    badgeTxt: {color: '#FFFFFF', fontSize: 12, fontWeight: '500'},
    toolbarSpacer: {width: 48},
    clearAll: {fontSize: 15, color: '#DC2626', fontWeight: '600'},
    clearLink: {alignSelf: 'flex-end', marginTop: 6},
    clearLinkTxt: {fontSize: 14, color: '#DC2626', fontWeight: '600'},
    // Horizontal padding comes from FlatList `listContent` only — avoids summary vs line cards different width.
    pageHead: {paddingHorizontal: 0, paddingBottom: 4},
    pageTitle: {fontSize: 22, fontWeight: '700', color: c.textPrimary, marginBottom: 6},
    pageSub: {fontSize: 14, color: c.textSecondary, lineHeight: 20, marginVertical: 12},
    summaryCard: {
      backgroundColor: c.card,
      borderRadius: 12,
      padding: 14,
      borderWidth: 1,
      borderColor: c.border,
      marginBottom: 8,
      shadowColor: isDark ? 'transparent' : '#000',
      shadowOffset: {width: 0, height: 1},
      shadowOpacity: isDark ? 0 : 0.05,
      shadowRadius: 3,
    },
    summaryRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 8,
    },
    summaryLabel: {fontSize: 14, color: c.textSecondary},
    summaryVal: {fontSize: 16, fontWeight: '600', color: c.textPrimary},
    summaryTotal: {fontSize: 20, fontWeight: '500', color: c.textPrimary},
    summaryHint: {fontSize: 11, color: c.muted, marginTop: 4, lineHeight: 16},
    listContent: {paddingHorizontal: 16, paddingBottom: 16},
    lineCard: {
      backgroundColor: c.card,
      borderRadius: 12,
      padding: 14,
      marginBottom: 12,
      borderWidth: 1,
      borderColor: c.border,
    },
    lineTop: {flexDirection: 'row', alignItems: 'flex-start'},
    logo: {width: 48, height: 48, borderRadius: 8, marginRight: 12},
    logoPh: {
      backgroundColor: isDark ? '#1E3A5F' : '#EFF6FF',
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: isDark ? c.border : '#BFDBFE',
    },
    logoL: {fontSize: 18, fontWeight: '500', color: c.primary},
    lineBody: {flex: 1},
    schemeCaps: {fontSize: 13, fontWeight: '500', color: c.textPrimary, lineHeight: 18},
    schemeCode: {fontSize: 11, color: c.muted, marginTop: 6},
    typeRow: {flexDirection: 'row', marginTop: 12, gap: 8},
    typeChip: {
      flex: 1,
      paddingVertical: 8,
      paddingHorizontal: 10,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: c.border,
      backgroundColor: isDark ? c.inputBg : '#FAFAFA',
      alignItems: 'center',
      justifyContent: 'center',
    },
    typeChipOn: {
      backgroundColor: isDark ? 'rgba(96,165,250,0.12)' : '#E6F4FF',
      borderColor: c.primary,
    },
    typeChipTxt: {fontSize: 13, color: c.textSecondary, fontWeight: '600'},
    typeChipTxtOn: {color: c.primary},
    amountDivider: {
      height: StyleSheet.hairlineWidth * 2,
      marginTop: 12,
      backgroundColor: isDark ? 'rgba(255,255,255,0.16)' : c.border,
      borderRadius: 1,
    },
    amountRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginTop: 12,
      paddingTop: 12,
    },
    amtLabel: {fontSize: 13, color: c.textSecondary, fontWeight: '600'},
    stepper: {flexDirection: 'row', alignItems: 'center'},
    stepBtn: {
      width: 36,
      height: 36,
      borderRadius: 8,
      backgroundColor: isDark ? '#2C2C2C' : '#F3F4F6',
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: c.border,
    },
    stepTxt: {fontSize: 20, color: c.textPrimary, fontWeight: '600', marginTop: -2},
    amtDisplay: {fontSize: 16, fontWeight: '500', color: c.textPrimary, minWidth: 100, textAlign: 'center'},
    amtDisplayPad: {marginHorizontal: 8},
    minNote: {fontSize: 11, color: c.muted, marginTop: 6},
    sipMeta: {fontSize: 11, color: c.textSecondary, marginTop: 4},
    removeRow: {alignSelf: 'flex-end', marginTop: 10},
    removeTxt: {width: 24, height: 24, tintColor: '#DC2626'},
    emptyWrap: {paddingTop: 8},
    emptyCard: {
      backgroundColor: c.card,
      borderRadius: 12,
      padding: 32,
      alignItems: 'center',
      borderWidth: 1,
      borderColor: c.border,
    },
    emptyImg: {width: 54, height: 54, marginBottom: 10},
    emptyTitle: {fontSize: 17, color: c.textPrimary, marginBottom: 8, textAlign: 'center'},
    emptySub: {fontSize: 14, color: c.textSecondary, textAlign: 'center', lineHeight: 20, marginBottom: 20},
    exploreBtn: {
      backgroundColor: c.primary,
      paddingVertical: 12,
      paddingHorizontal: 28,
      borderRadius: 10,
    },
    exploreBtnTxt: {color: '#FFFFFF', fontSize: 15},
    footer: {
      padding: 16,
      paddingBottom: 28,
      backgroundColor: c.card,
      borderTopWidth: 1,
      borderTopColor: c.border,
    },
    footerRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 12,
    },
    footerLabel: {fontSize: 15, color: c.textSecondary},
    footerTotal: {fontSize: 22, fontWeight: '500', color: c.textPrimary},
    checkout: {
      backgroundColor: c.success,
      height: 52,
      borderRadius: 14,
      paddingVertical: 15,
      justifyContent: 'center',
      alignItems: 'center',
    },
    checkoutTxt: {color: '#FFFFFF', fontSize: 16, fontWeight: '600'},
    checkoutDisabled: {opacity: 0.45},
  });
}
