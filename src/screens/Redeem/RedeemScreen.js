import React, {useCallback, useEffect, useMemo, useState} from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Switch,
  StatusBar,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useNavigation, useRoute} from '@react-navigation/native';
import {useSelector} from 'react-redux';
import {buildRedeemPlacePayload, createSingleOrder, extractOrderId} from '../../services/ordersService';
import {getSchemeByCode} from '../../services/fundSchemeService';
import {Colors} from '../../utils/AppConstant';
import Textstyles from '../../utils/text';
import AppColors from '../../theme/colors';
import {radius} from '../../theme/radius';
import {useAppTheme} from '../../theme/useAppTheme';
import AppBackButton from '../../components/AppBackButton';
import {typeScale} from '../../theme/typography';
import {appAlert} from '../../utils/appAlert';

const BANNER_BG = '#DCFCE7';
const BANNER_FG = '#166534';
const CTA_GREEN = AppColors.primary;
const CHIP_BLUE = Colors.themeBlue;

const QUICK_AMOUNTS = [500, 1000, 2000];

function formatUnits(u) {
  if (u == null || !Number.isFinite(Number(u))) {
    return '0';
  }
  const n = Number(u);
  const s = n.toFixed(6).replace(/\.?0+$/, '');
  return s || '0';
}

export default function RedeemScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const {colors, isDark} = useAppTheme();
  const user = useSelector(s => s.auth.user);
  const canRedeem = useMemo(() => {
    const v = user?.allow_redeem;
    if (v === undefined || v === null || v === '') {
      return true;
    }
    const s = String(v).trim().toLowerCase();
    return !(v === false || v === 0 || s === 'false' || s === '0' || s === 'n' || s === 'no');
  }, [user?.allow_redeem]);
  const schemeCode = route.params?.schemeCode ?? route.params?.scheme_code;
  const schemeName = route.params?.schemeName ?? route.params?.scheme_name ?? 'Fund';
  const folioNumber = route.params?.folioNumber ?? '';
  const availableUnits = Number(route.params?.availableUnits ?? 0) || 0;
  const maxAmount = Number(route.params?.maxAmount ?? route.params?.currentValue ?? 0) || 0;
  const routeCurrentNav = Number(route.params?.currentNav ?? route.params?.current_nav ?? 0) || 0;
  const [schemeDetail, setSchemeDetail] = useState(null);

  const [mode, setMode] = useState('amount');
  const [amountText, setAmountText] = useState('');
  const [unitsText, setUnitsText] = useState('');
  const [redeemAll, setRedeemAll] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (canRedeem) {
      return;
    }
    appAlert('Redeem', 'Redeem is not available for your account.');
    navigation.goBack();
  }, [canRedeem, navigation]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      if (!schemeCode) {
        return;
      }
      try {
        const res = await getSchemeByCode(schemeCode);
        if (!mounted) {
          return;
        }
        const d = res?.data?.data ?? res?.data ?? null;
        setSchemeDetail(d);
      } catch {
        // optional data; validations fall back to route values
      }
    })();
    return () => {
      mounted = false;
    };
  }, [schemeCode]);

  const parsedAmount = useMemo(() => {
    const n = Number(String(amountText).replace(/[^0-9.]/g, ''));
    return Number.isFinite(n) ? n : 0;
  }, [amountText]);

  const parsedUnits = useMemo(() => {
    const n = Number(String(unitsText).replace(/[^0-9.]/g, ''));
    return Number.isFinite(n) ? n : 0;
  }, [unitsText]);

  const redeemByAmount = mode === 'amount';
  const currentNav = useMemo(() => {
    const direct = Number(
      schemeDetail?.current_nav ??
        schemeDetail?.scheme_data?.current_nav ??
        route.params?.current_nav ??
        route.params?.nav ??
        route.params?.currentNav,
    );
    if (Number.isFinite(direct) && direct > 0) {
      return direct;
    }
    if (routeCurrentNav > 0) {
      return routeCurrentNav;
    }
    if (availableUnits > 0 && maxAmount > 0) {
      return maxAmount / availableUnits;
    }
    return 0;
  }, [schemeDetail, route.params?.current_nav, route.params?.nav, route.params?.currentNav, routeCurrentNav, availableUnits, maxAmount]);

  const minRedeemAmount = useMemo(() => {
    const direct = Number(
      schemeDetail?.redemption_amount_min ??
        schemeDetail?.scheme_data?.redemption_amount_min ??
        schemeDetail?.minimum_redemption_amount ??
        schemeDetail?.scheme_data?.minimum_redemption_amount ??
        route.params?.redemption_amount_min,
    );
    return Number.isFinite(direct) && direct > 0 ? direct : 0;
  }, [schemeDetail, route.params?.redemption_amount_min]);

  const onProceed = useCallback(async () => {
    if (!schemeCode) {
      appAlert('Redeem', 'Missing scheme. Go back and try again.');
      return;
    }

    if (redeemByAmount) {
      if (parsedAmount <= 0) {
        appAlert('Redeem', 'Enter a valid amount.');
        return;
      }
      if (minRedeemAmount > 0 && parsedAmount < minRedeemAmount) {
        appAlert('Redeem', `Please enter amount more than ${Math.round(minRedeemAmount)}.`);
        return;
      }
      if (maxAmount > 0 && parsedAmount > maxAmount + 0.01) {
        appAlert('Redeem', `Amount cannot exceed ₹${maxAmount.toFixed(2)}.`);
        return;
      }
    } else if (!redeemAll) {
      if (parsedUnits <= 0) {
        appAlert('Redeem', 'Enter a valid quantity.');
        return;
      }
      if (availableUnits > 0 && parsedUnits > availableUnits + 1e-8) {
        appAlert('Redeem', `Units cannot exceed ${formatUnits(availableUnits)}.`);
        return;
      }
      if (minRedeemAmount > 0 && currentNav > 0 && Number((parsedUnits * currentNav).toFixed(2)) < minRedeemAmount) {
        appAlert('Redeem', `Please enter quantity more than ${(minRedeemAmount / currentNav).toFixed(3)}.`);
        return;
      }
    }

    if (!redeemByAmount && !redeemAll && currentNav > 0 && maxAmount > 0) {
      const amountFromUnits = Number((parsedUnits * currentNav).toFixed(2));
      if (amountFromUnits > maxAmount + 0.01) {
        appAlert('Redeem', `You can redeem up to ${formatUnits(availableUnits)} units only.`);
        return;
      }
    }

    const allRedeem = !redeemByAmount && redeemAll;

    const payload = buildRedeemPlacePayload({
      schemeCode,
      folioNumber,
      redeemByAmount,
      amount: redeemByAmount ? parsedAmount : 0,
      units: redeemByAmount ? 0 : redeemAll ? availableUnits : parsedUnits,
      currentNav,
      allRedeem,
    });

    try {
      setSubmitting(true);
      const res = await createSingleOrder(payload);
      if (!res?.success) {
        const msg = res?.message ?? res?.error ?? 'Could not place redemption.';
        appAlert('Redeem', String(msg));
        return;
      }
      const orderId = extractOrderId(res?.data);
      const root = res?.data?.data ?? res?.data ?? {};
      const txNumber =
        root?.transaction_number ??
        root?.transaction_no ??
        root?.txn_number ??
        root?.txn_no ??
        root?.data?.transaction_number;
      const txLine = txNumber ? `Transaction Number: ${txNumber}` : null;
      const refLine = orderId ? `Reference: ${orderId}` : null;
      const body = [txLine, refLine, 'Track status in My Orders.']
        .filter(Boolean)
        .join('\n');
      appAlert(
        'Redemption submitted',
        body || 'Check My Orders for status.',
        [{text: 'OK', onPress: () => navigation.goBack()}],
      );
    } catch (e) {
      appAlert('Redeem', String(e?.message ?? 'Request failed'));
    } finally {
      setSubmitting(false);
    }
  }, [
    schemeCode,
    folioNumber,
    redeemByAmount,
    parsedAmount,
    parsedUnits,
    minRedeemAmount,
    currentNav,
    maxAmount,
    availableUnits,
    redeemAll,
    navigation,
  ]);

  const setQuick = useCallback(v => {
    setAmountText(String(v));
  }, []);

  return (
    <SafeAreaView style={[styles.safe, {backgroundColor: colors.background}]} edges={['top', 'left', 'right']}>
      <StatusBar barStyle={colors.statusBar} backgroundColor={colors.background} />
      <View style={[styles.toolbar, {borderBottomColor: colors.border}]}>
        <AppBackButton onPress={() => navigation.goBack()} hitSlop={12} style={styles.backBtn} />
        <Text style={[Textstyles.heading, styles.toolbarTitle, {color: colors.textPrimary}]} numberOfLines={1}>
          Redeem
        </Text>
        <View style={styles.toolbarRight} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <Text style={[Textstyles.medium, styles.fundTitle, {color: colors.textPrimary}]} numberOfLines={3}>
          {schemeName}
        </Text>
        <View style={[styles.divider, {backgroundColor: colors.border}]} />

        <View style={[styles.banner, {backgroundColor: isDark ? 'rgba(134,239,172,0.14)' : BANNER_BG}]}>
          <Text style={[styles.bannerLabel, {color: isDark ? '#86EFAC' : BANNER_FG}]}>Redeem available</Text>
          <Text style={[styles.bannerValue, {color: isDark ? '#86EFAC' : BANNER_FG}]}>
            {formatUnits(availableUnits)} units
          </Text>
        </View>

        <View style={[styles.segment, {backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : '#E8EAED'}]}>
          <TouchableOpacity
            style={[
              styles.segBtn,
              redeemByAmount && styles.segBtnOn,
              redeemByAmount && isDark ? {backgroundColor: 'rgba(30,129,242,0.25)'} : null,
            ]}
            onPress={() => {
              setMode('amount');
              setRedeemAll(false);
            }}
            activeOpacity={0.85}>
            <Text
              style={[
                styles.segTxt,
                {color: isDark ? colors.textSecondary : '#6B7280'},
                redeemByAmount && styles.segTxtOn,
                redeemByAmount && isDark ? {color: colors.primary} : null,
              ]}>
              Amount
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.segBtn,
              !redeemByAmount && styles.segBtnOn,
              !redeemByAmount && isDark ? {backgroundColor: 'rgba(30,129,242,0.25)'} : null,
            ]}
            onPress={() => {
              setMode('quantity');
            }}
            activeOpacity={0.85}>
            <Text
              style={[
                styles.segTxt,
                {color: isDark ? colors.textSecondary : '#6B7280'},
                !redeemByAmount && styles.segTxtOn,
                !redeemByAmount && isDark ? {color: colors.primary} : null,
              ]}>
              Quantity
            </Text>
          </TouchableOpacity>
        </View>

        {redeemByAmount ? (
          <>
            <View style={[styles.inputWrap, {borderColor: colors.border, backgroundColor: colors.card}]}>
              <Text style={[styles.rupee, {color: colors.textPrimary}]}>₹</Text>
              <TextInput
                style={[styles.input, {color: colors.textPrimary}]}
                placeholder="Enter Amount"
                placeholderTextColor={colors.textSecondary}
                keyboardType="decimal-pad"
                value={amountText}
                onChangeText={setAmountText}
              />
            </View>
            <View style={styles.chips}>
              {QUICK_AMOUNTS.map(amt => (
                <TouchableOpacity key={amt} style={styles.chip} onPress={() => setQuick(amt)} activeOpacity={0.85}>
                  <Text style={styles.chipTxt}>₹{amt}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </>
        ) : (
          <>
            <View style={[styles.inputWrap, {borderColor: colors.border, backgroundColor: colors.card}]}>
              <Text style={[styles.unitsLabel, {color: colors.textPrimary}]}>Units</Text>
              <TextInput
                style={[styles.input, styles.inputFlex, {color: colors.textPrimary}]}
                placeholder="Enter Quantity"
                placeholderTextColor={colors.textSecondary}
                keyboardType="decimal-pad"
                editable={!redeemAll}
                value={unitsText}
                onChangeText={setUnitsText}
              />
            </View>
            <View style={styles.redeemAllRow}>
            <Text style={[styles.redeemAllTxt, {color: colors.textPrimary}]}>Redeem All</Text>

              <Switch
                value={redeemAll}
                onValueChange={v => {
                  setRedeemAll(v);
                  if (v) {
                    setUnitsText(formatUnits(availableUnits));
                  }
                }}
                trackColor={{false: isDark ? '#475569' : colors.border, true: colors.primary}}
                thumbColor={redeemAll ? '#FFFFFF' : isDark ? '#E5E7EB' : '#f4f3f4'}
                // ios_backgroundColor={isDark ? '#475569' : colors.border}
                style={{left: 20}}
              />
            </View>
          </>
        )}

        <Text style={[styles.hint, {color: colors.textSecondary}]}>
          SWP (systematic withdrawal) is not available in the app yet — use the website for SWP setup.
        </Text>

        <TouchableOpacity
          style={[styles.cta, {backgroundColor: colors.primary}, submitting && styles.ctaDisabled]}
          onPress={onProceed}
          disabled={submitting}
          activeOpacity={0.9}>
          {submitting ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={[styles.ctaTxt, Textstyles.medium]}>Proceed to Redeem</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {flex: 1, backgroundColor: Colors.offWhite},
  toolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    minHeight: 44,
    borderBottomWidth: 1,
    borderBottomColor: AppColors.border,
  },
  backBtn: {width: 44, height: 44, justifyContent: 'center', alignItems: 'center'},
  toolbarTitle: {flex: 1, fontSize: typeScale.title, textAlign: 'center'},
  toolbarRight: {width: 44},
  scroll: {padding: 16, paddingBottom: 40},
  fundTitle: {fontSize: typeScale.bodyMd, color: Colors.TEXT_PRIMARY, lineHeight: 22},
  divider: {height: 1, backgroundColor: Colors.BORDER_GREY, marginVertical: 14},
  banner: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: BANNER_BG,
    borderRadius: radius.input,
    paddingVertical: 12,
    paddingHorizontal: 14,
    marginBottom: 18,
  },
  bannerLabel: {...Textstyles.medium, fontSize: 15, fontWeight: '600', color: BANNER_FG},
  bannerValue: {...Textstyles.medium, fontSize: 15, fontWeight: '600', color: BANNER_FG},
  segment: {
    flexDirection: 'row',
    backgroundColor: '#E8EAED',
    borderRadius: 20,
    padding: 4,
    marginBottom: 16,
    overflow: 'hidden',
  },
  segBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 20,
  },
  segBtnOn: {
    backgroundColor: 'white',
  },
  segTxt: {...Textstyles.medium, fontSize: typeScale.bodyLg, lineHeight: 20, color: '#6B7280', fontWeight: '600'},
  segTxtOn: {color: CHIP_BLUE},
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: AppColors.border,
    borderRadius: radius.input,
    paddingHorizontal: 12,
    paddingVertical: 4,
    marginBottom: 12,
    minHeight: 52,
  },
  rupee: {fontSize: typeScale.bodyLg, color: Colors.TEXT_PRIMARY, marginRight: 6},
  unitsLabel: {fontSize: typeScale.bodyMd, color: Colors.TEXT_PRIMARY, marginRight: 8, minWidth: 44},
  input: {flex: 1, fontSize: typeScale.bodyLg, color: Colors.TEXT_PRIMARY, paddingVertical: 10},
  inputFlex: {flex: 1},
  chips: {flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 20},
  chip: {
    borderWidth: 1,
    borderColor: CHIP_BLUE,
    borderRadius: radius.input,
    paddingVertical: 8,
    paddingHorizontal: 14,
  },
  chipTxt: {...Textstyles.medium, color: CHIP_BLUE, fontWeight: '600', fontSize: 14},
  redeemAllRow: {flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 16},
  redeemAllTxt: {...Textstyles.medium, fontSize: 15, color: Colors.TEXT_PRIMARY, fontWeight: '500'},
  hint: {fontSize: 12, color: Colors.GREY, marginBottom: 20, lineHeight: 18},
  cta: {
    backgroundColor: CTA_GREEN,
    borderRadius: radius.buttonLarge,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaDisabled: {opacity: 0.7},
  ctaTxt: {...Textstyles.heading, color: Colors.white, fontSize: typeScale.bodyLg},
});
