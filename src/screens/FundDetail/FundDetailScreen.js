import React, {useCallback, useEffect, useMemo, useState} from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Alert,
  Dimensions,
  TextInput,
  Modal,
  Platform,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useNavigation, useRoute} from '@react-navigation/native';
import {useDispatch, useSelector} from 'react-redux';
import Slider from '@react-native-community/slider';
import DateTimePicker from '@react-native-community/datetimepicker';
import {useFundData} from '../../hooks/useFundData';
import {useGraphData} from '../../hooks/useGraphData';
import {useMandateData} from '../../hooks/useMandateData';
import {getSchemeHistory} from '../../services/fundSchemeService';
import {addToWishlist, removeFromWishlist} from '../../services/wishlistService';
import {
  authenticateOrder,
  buildOrderPlacePayload,
  createSingleOrder,
  extractOrderId,
  extractOrderAuthUrl,
  processOrderPayment,
  isAuthenticatedOrderState,
} from '../../services/ordersService';
import {addToCart, selectCartItemCount} from '../../store/slices/cartSlice';
import {navigateToCart} from '../../navigation/navigationRef';
import NavLineChart from '../../components/FundDetail/NavLineChart';
import {Colors} from '../../utils/AppConstant';
import Textstyles from '../../utils/text';

function formatDate(iso) {
  if (!iso) {
    return '—';
  }
  try {
    return new Date(iso).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return '—';
  }
}

function safeInr(v) {
  if (v === null || v === undefined || Number.isNaN(Number(v))) {
    return '—';
  }
  return `₹${Number(v).toLocaleString('en-IN')}`;
}

function formatDDMMYYYY(d) {
  if (!(d instanceof Date) || Number.isNaN(d.getTime())) {
    return '—';
  }
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = d.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
}

function pickMandateLabel(item) {
  if (!item || typeof item !== 'object') {
    return '—';
  }
  const bank = item.bank_name ?? item.bank ?? item.bank_details?.bank_name ?? '';
  const umrn = item.umrn ?? item.UMRN ?? item.mandate_id ?? item.id ?? '';
  const amount = item.amount ?? item.max_amount ?? item.mandate_amount ?? item.sip_amount;
  const left = bank ? String(bank).trim() : 'Mandate';
  const right = umrn ? `#${String(umrn).trim()}` : amount ? safeInr(amount) : '';
  return right ? `${left} • ${right}` : left;
}

async function fetchReturnRows(schemeId, investmentAmount) {
  const periods = [
    {label: '6 months', months: 6},
    {label: '1 year', months: 12},
    {label: '3 years', months: 36},
  ];
  const rows = [];
  for (const period of periods) {
    const toDate = new Date();
    const fromDate = new Date();
    fromDate.setMonth(toDate.getMonth() - period.months);
    const res = await getSchemeHistory(
      schemeId,
      fromDate.toISOString().split('T')[0],
      toDate.toISOString().split('T')[0],
    );
    const navHistory = res?.success ? res.data?.results?.nav_history ?? [] : [];
    if (navHistory.length < 2) {
      continue;
    }
    const startNav = Number(navHistory[navHistory.length - 1].nav_value);
    const endNav = Number(navHistory[0].nav_value);
    if (!startNav) {
      continue;
    }
    const value = investmentAmount * (endNav / startNav);
    const percent = ((value - investmentAmount) / investmentAmount) * 100;
    rows.push({
      label: period.label,
      invested: investmentAmount,
      value: Math.round(value),
      percent: Number(percent.toFixed(2)),
    });
  }
  return rows;
}

export default function FundDetailScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const dispatch = useDispatch();
  const cartCount = useSelector(selectCartItemCount);
  const user = useSelector(s => s.auth.user);

  useEffect(() => {
    if (__DEV__) {
      console.log('[FundDetail] route', {
        name: route.name,
        key: route.key,
        params: route.params,
      });
    }
  }, [route]);

  const schemeCode =
    route.params?.schemeCode ?? route.params?.scheme_code ?? route.params?.code;
  const paramName = route.params?.schemeName ?? route.params?.scheme_name;

  const {data: folioData, isLoading: loading, error, refetch} = useFundData(schemeCode);
  const {data: mandateData, isPending: mandateLoading} = useMandateData();
  const [timeFrame, setTimeFrame] = useState('1M');
  const schemeId = folioData?.schemeId ?? null;

  const {data: graphData, isLoading: graphLoading} = useGraphData(schemeId, timeFrame);

  const fundInfo = folioData?.schemeData || {};
  const logoUrl = folioData?.logo_url || fundInfo?.logo_url;
  const holdingsList = fundInfo?.holdings?.holdings ?? [];

  const [isFav, setIsFav] = useState(false);
  useEffect(() => {
    if (folioData?.wish_flag !== undefined) {
      setIsFav(!!folioData.wish_flag);
    }
  }, [folioData?.wish_flag]);

  const [calcAmount, setCalcAmount] = useState(5000);
  const [debouncedAmount, setDebouncedAmount] = useState(5000);
  useEffect(() => {
    const t = setTimeout(() => setDebouncedAmount(calcAmount), 400);
    return () => clearTimeout(t);
  }, [calcAmount]);

  const [returnRows, setReturnRows] = useState([]);
  const [tableLoading, setTableLoading] = useState(false);
  const [orderType, setOrderType] = useState('ONE_TIME');
  const [orderAmount, setOrderAmount] = useState('');
  const [sipFrequency, setSipFrequency] = useState('Monthly');
  const [sipDurationYears, setSipDurationYears] = useState('1');
  const [sipDate, setSipDate] = useState(() => new Date());
  const [showSipDatePicker, setShowSipDatePicker] = useState(false);
  const [mandateModalVisible, setMandateModalVisible] = useState(false);
  const [selectedMandate, setSelectedMandate] = useState(null);
  const [pendingOrderId, setPendingOrderId] = useState(null);
  const [pendingOrderAmount, setPendingOrderAmount] = useState(null);
  const [pendingGatewayUrl, setPendingGatewayUrl] = useState('');
  const [placingOrder, setPlacingOrder] = useState(false);
  const [authLoading, setAuthLoading] = useState(false);
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [readyForPayment, setReadyForPayment] = useState(false);

  useEffect(() => {
    if (!schemeId) {
      setReturnRows([]);
      return;
    }
    let cancelled = false;
    (async () => {
      setTableLoading(true);
      try {
        const rows = await fetchReturnRows(schemeId, debouncedAmount);
        if (!cancelled) {
          setReturnRows(rows);
        }
      } catch {
        if (!cancelled) {
          setReturnRows([]);
        }
      } finally {
        if (!cancelled) {
          setTableLoading(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [schemeId, debouncedAmount]);

  const displayName = fundInfo?.scheme_name || fundInfo?.base_scheme_name || paramName || 'Fund';
  const mandates = mandateData?.results ?? [];
  const selectedMandateLabel = selectedMandate ? pickMandateLabel(selectedMandate) : 'Select your preferred mandate option';

  const minLumpsum = Number(fundInfo?.min_purchase_amount) || 500;
  const minSip = Number(fundInfo?.holdings?.min_sip_investment) || 500;
  const minOrderAmount = orderType === 'SIP' ? minSip : minLumpsum;
  const fundDetailsRows = useMemo(
    () => [
      {label: 'Fund house', value: fundInfo?.amc_name || fundInfo?.fund_house},
      {label: 'Scheme type', value: fundInfo?.scheme_type},
      {label: 'Plan', value: fundInfo?.scheme_plan},
      {label: 'Option', value: fundInfo?.scheme_option},
      {label: 'Benchmark', value: fundInfo?.benchmark},
      {label: 'AUM', value: fundInfo?.aum ? safeInr(fundInfo.aum) : null},
      {label: 'Expense ratio', value: fundInfo?.expense_ratio ? `${fundInfo.expense_ratio}%` : null},
      {label: 'Exit load', value: fundInfo?.exit_load},
      {label: 'Fund manager', value: fundInfo?.fund_manager},
    ].filter(r => r.value != null && String(r.value).trim() !== ''),
    [fundInfo],
  );

  useEffect(() => {
    setOrderAmount(prev => {
      const n = Number(String(prev).replace(/[^0-9.]/g, ''));
      if (!prev || !Number.isFinite(n) || n < minOrderAmount) {
        return String(minOrderAmount);
      }
      return prev;
    });
  }, [minOrderAmount, schemeCode]);

  useEffect(() => {
    if (!selectedMandate && mandates.length > 0) {
      setSelectedMandate(mandates[0]);
    }
  }, [mandates, selectedMandate]);

  const onWishlist = useCallback(async () => {
    if (!fundInfo?.scheme_code) {
      return;
    }
    try {
      if (!isFav) {
        const res = await addToWishlist({
          scheme_code: fundInfo.scheme_code,
          scheme_name: fundInfo.scheme_name,
          amc_code: fundInfo.amc_code,
        });
        if (res?.success) {
          setIsFav(true);
          Alert.alert('Watchlist', 'Added to watchlist');
        }
      } else {
        const res = await removeFromWishlist(fundInfo.scheme_code);
        if (res?.success) {
          setIsFav(false);
          Alert.alert('Watchlist', 'Removed from watchlist');
        }
      }
    } catch {
      Alert.alert('Error', 'Could not update watchlist');
    }
  }, [fundInfo, isFav]);

  const parseOrderAmount = useCallback(() => {
    const parsed = Number(String(orderAmount).replace(/[^0-9.]/g, ''));
    return Number.isFinite(parsed) ? Math.round(parsed) : 0;
  }, [orderAmount]);

  const onAddToCart = useCallback(() => {
    if (!fundInfo?.scheme_code) {
      Alert.alert('Error', 'Fund data not loaded');
      return;
    }
    const amount = Math.max(minOrderAmount, parseOrderAmount());
    if (orderType === 'SIP' && !selectedMandate && mandates.length > 0) {
      Alert.alert('Select mandate', 'Please choose a mandate for SIP.');
      return;
    }
    dispatch(
      addToCart({
        fund: fundInfo,
        amount,
        isSIP: orderType === 'SIP',
        sipFrequency: orderType === 'SIP' ? sipFrequency : undefined,
        sipDate: orderType === 'SIP' ? formatDDMMYYYY(sipDate) : undefined,
        sipDurationYears: orderType === 'SIP' ? sipDurationYears : undefined,
        mandateId: orderType === 'SIP' ? selectedMandate?.id ?? selectedMandate?.mandate_id : undefined,
        mandateLabel: orderType === 'SIP' ? selectedMandateLabel : undefined,
        logo_url: logoUrl,
      }),
    );
    Alert.alert('Cart', `${displayName} added to cart`);
  }, [
    dispatch,
    displayName,
    fundInfo,
    logoUrl,
    mandates.length,
    minOrderAmount,
    orderType,
    parseOrderAmount,
    selectedMandate,
    selectedMandateLabel,
    sipDate,
    sipDurationYears,
    sipFrequency,
  ]);

  const onPlaceOrder = useCallback(async () => {
    if (!fundInfo?.scheme_code) {
      Alert.alert('Order', 'Fund details not available.');
      return;
    }
    const amount = Math.max(minOrderAmount, parseOrderAmount());
    if (orderType === 'SIP' && !selectedMandate && mandates.length > 0) {
      Alert.alert('Select mandate', 'Please choose a mandate for SIP.');
      return;
    }
    try {
      setPlacingOrder(true);
      const payload = {
        ...buildOrderPlacePayload({
          schemeCode: fundInfo.scheme_code,
          amount,
          isSip: orderType === 'SIP',
          sipFrequency,
          sipDate: formatDDMMYYYY(sipDate),
          sipDurationYears: Number(sipDurationYears),
          mandateId: selectedMandate?.id ?? selectedMandate?.mandate_id,
        }),
      };
      const res = await createSingleOrder(payload);
      const orderId = extractOrderId(res?.data);
      const directAuthUrl = extractOrderAuthUrl(res?.data);
      if (directAuthUrl) {
        setPendingGatewayUrl(directAuthUrl);
      }
      if (orderId) {
        setPendingOrderId(orderId);
        setPendingOrderAmount(amount);
        setReadyForPayment(false);
        Alert.alert('Order placed', 'Please tap "Authenticate & Continue" to complete payment.');
      } else {
        const fallbackAuthUrl = extractOrderAuthUrl(res?.data);
        if (fallbackAuthUrl) {
          navigation.navigate('MandateAuthWebview', {
            uri: fallbackAuthUrl,
            title: 'Authenticate order',
          });
        } else {
          Alert.alert(
            'Order placed',
            'Your order is submitted. You can track it in My Orders.',
            [
              {text: 'My Orders', onPress: () => navigation.navigate('MyOrders')},
              {text: 'OK'},
            ],
          );
        }
      }
    } catch (e) {
      Alert.alert('Order failed', String(e?.message || 'Could not place order.'));
    } finally {
      setPlacingOrder(false);
    }
  }, [
    fundInfo,
    minOrderAmount,
    parseOrderAmount,
    orderType,
    selectedMandate,
    mandates.length,
    sipFrequency,
    sipDate,
    sipDurationYears,
    navigation,
  ]);

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
      const authStateRaw =
        res?.data?.data?.status ??
        res?.data?.data?.response_data?.status ??
        res?.data?.message;
      if (isAuthenticatedOrderState(authStateRaw)) {
        setReadyForPayment(true);
      }
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
        setReadyForPayment(true);
        navigation.navigate('MandateAuthWebview', {
          uri: pendingGatewayUrl,
          title: 'Authenticate order',
        });
        return;
      }
      if (msg.toLowerCase().includes('already in authenticated status')) {
        setReadyForPayment(true);
        return;
      }
      Alert.alert('Authenticate failed', msg || 'Could not start authentication.');
    } finally {
      setAuthLoading(false);
    }
  }, [navigation, pendingGatewayUrl, pendingOrderId]);

  const onPayNow = useCallback(async () => {
    const orderNumber = pendingOrderId;
    const totalAmount = Number(pendingOrderAmount ?? parseOrderAmount() ?? 0);
    const clientCode = user?.client_code ?? user?.ucc_code ?? user?.ucc;
    if (!orderNumber || !clientCode || !totalAmount) {
      Alert.alert('Pay now', 'Payment details are incomplete.');
      return;
    }
    try {
      setPaymentLoading(true);
      const res = await processOrderPayment({
        clientCode,
        modeOfPayment: 'DIRECT',
        orderNumber,
        totalAmount,
      });
      const paymentUrl = extractOrderAuthUrl(res?.data);
      if (paymentUrl) {
        navigation.navigate('MandateAuthWebview', {
          uri: paymentUrl,
          title: 'Complete payment',
        });
      } else {
        Alert.alert('Pay now', 'Payment gateway URL not found.');
      }
    } catch (e) {
      Alert.alert('Payment failed', String(e?.message || 'Could not start payment.'));
    } finally {
      setPaymentLoading(false);
    }
  }, [navigation, parseOrderAmount, pendingOrderAmount, pendingOrderId, user]);

  const openCart = useCallback(() => {
    navigateToCart(navigation);
  }, [navigation]);

  const onTapQuickAmount = useCallback(v => {
    setOrderAmount(String(v));
  }, []);

  const onChangeSipDate = useCallback((event, nextDate) => {
    if (Platform.OS === 'android') {
      setShowSipDatePicker(false);
    }
    if (event?.type === 'dismissed') {
      return;
    }
    if (nextDate instanceof Date && !Number.isNaN(nextDate.getTime())) {
      setSipDate(nextDate);
    }
  }, []);

  const header = useMemo(
    () => (
      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={12}>
          <Text style={styles.back}>‹</Text>
        </TouchableOpacity>
        <View style={styles.topActions}>
          <TouchableOpacity onPress={onWishlist} hitSlop={12}>
            <Text style={styles.iconBtn}>{isFav ? '★' : '☆'}</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={openCart} style={[styles.cartWrap, styles.cartBtn]} hitSlop={12}>
            <Text style={styles.iconBtn}>🛒</Text>
            {cartCount > 0 ? (
              <View style={styles.badge}>
                <Text style={styles.badgeTxt}>{cartCount > 99 ? '99+' : cartCount}</Text>
              </View>
            ) : null}
          </TouchableOpacity>
        </View>
      </View>
    ),
    [navigation, onWishlist, openCart, isFav, cartCount],
  );

  if (!schemeCode) {
    return (
      <SafeAreaView style={styles.safe}>
        {header}
        <Text style={styles.err}>Missing scheme code</Text>
      </SafeAreaView>
    );
  }

  if (loading && !folioData) {
    return (
      <SafeAreaView style={styles.safe}>
        {header}
        <View style={styles.center}>
          <ActivityIndicator size="large" color={Colors.themeBlue} />
          <Text style={styles.loadingTxt}>Loading fund…</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error || !fundInfo?.scheme_code) {
    return (
      <SafeAreaView style={styles.safe}>
        {header}
        <View style={styles.center}>
          <Text style={styles.err}>{error || 'Could not load fund'}</Text>
          <TouchableOpacity onPress={() => refetch()} style={styles.retry}>
            <Text style={styles.retryTxt}>Retry</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      {header}
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.card}>
          <View style={styles.titleRow}>
            {logoUrl ? (
              <Image source={{uri: logoUrl}} style={styles.logo} resizeMode="contain" />
            ) : (
              <View style={[styles.logo, styles.logoPh]}>
                <Text style={styles.logoL}>{displayName[0]}</Text>
              </View>
            )}
            <Text style={[Textstyles.bold, styles.title]} numberOfLines={3}>
              {displayName}
            </Text>
          </View>
          <View style={styles.tags}>
            {fundInfo.scheme_plan ? (
              <View style={styles.tag}>
                <Text style={styles.tagTxt}>{fundInfo.scheme_plan}</Text>
              </View>
            ) : null}
            {fundInfo.scheme_type ? (
              <View style={styles.tag}>
                <Text style={styles.tagTxt}>{fundInfo.scheme_type}</Text>
              </View>
            ) : null}
            {fundInfo?.holdings?.nfo_risk ? (
              <View style={styles.tag}>
                <Text style={styles.tagTxt}>{fundInfo.holdings.nfo_risk} risk</Text>
              </View>
            ) : null}
          </View>

          {schemeId ? (
            <NavLineChart
              graphData={graphData}
              graphLoading={graphLoading}
              timeFrame={timeFrame}
              onTimeFrameChange={setTimeFrame}
            />
          ) : null}
        </View>

        <View style={styles.card}>
          <View style={styles.grid2}>
            <View style={styles.cell}>
              <Text style={styles.cellLabel}>NAV ({formatDate(fundInfo.last_updated)})</Text>
              <Text style={[Textstyles.bold, styles.cellVal]}>
                {fundInfo.nav != null ? Number(fundInfo.nav).toFixed(2) : '—'}
              </Text>
            </View>
            <View style={styles.cell}>
              <Text style={styles.cellLabel}>Rating</Text>
              <Text style={[Textstyles.bold, styles.cellVal]}>
                {fundInfo?.holdings?.groww_rating ?? '—'}
              </Text>
            </View>
            <View style={styles.cell}>
              <Text style={styles.cellLabel}>Min SIP</Text>
              <Text style={[Textstyles.bold, styles.cellVal]}>
                {fundInfo?.holdings?.min_sip_investment != null
                  ? safeInr(fundInfo.holdings.min_sip_investment)
                  : '—'}
              </Text>
            </View>
            <View style={styles.cell}>
              <Text style={styles.cellLabel}>Min purchase</Text>
              <Text style={[Textstyles.bold, styles.cellVal]}>{safeInr(fundInfo.min_purchase_amount)}</Text>
            </View>
          </View>
        </View>

        <View style={styles.card}>
          <Text style={[Textstyles.bold, styles.sectionTitle]}>Return calculator</Text>
          <Text style={[Textstyles.medium, styles.calcAmt]}>₹{calcAmount.toLocaleString('en-IN')}</Text>
          <Slider
            style={styles.slider}
            minimumValue={1000}
            maximumValue={200000}
            step={500}
            value={calcAmount}
            onValueChange={setCalcAmount}
            minimumTrackTintColor={Colors.themeBlue}
            maximumTrackTintColor={Colors.LIGHT_GREY}
            thumbTintColor={Colors.themeBlue}
          />
          <Text style={[Textstyles.medium, styles.tableHead]}>Over the past</Text>
          {tableLoading ? (
            <ActivityIndicator style={{marginVertical: 16}} color={Colors.themeBlue} />
          ) : (
            returnRows.map((row, i) => (
              <View key={row.label} style={[styles.tableRow, i > 0 && styles.tableRowBorder]}>
                <Text style={styles.tCell}>{row.label}</Text>
                <Text style={styles.tCell}>{safeInr(row.invested)}</Text>
                <Text style={styles.tCell}>{safeInr(row.value)}</Text>
                <Text
                  style={[
                    styles.tCell,
                    styles.tRight,
                    row.percent >= 0 ? styles.pos : styles.neg,
                  ]}>
                  {row.percent >= 0 ? '+' : ''}
                  {row.percent.toFixed(2)}%
                </Text>
              </View>
            ))
          )}
        </View>

        {holdingsList.length > 0 ? (
          <View style={styles.card}>
            <Text style={[Textstyles.bold, styles.sectionTitle]}>Holdings</Text>
            {holdingsList.slice(0, 15).map((h, idx) => (
              <View key={idx} style={styles.holdingRow}>
                <Text style={[Textstyles.medium, styles.hName]} numberOfLines={2}>
                  {h.instrument_name || h.sector_name || '—'}
                </Text>
                <Text style={styles.hPct}>{h.corpus_per != null ? `${Number(h.corpus_per).toFixed(1)}%` : '—'}</Text>
              </View>
            ))}
          </View>
        ) : null}

        {fundDetailsRows.length > 0 ? (
          <View style={styles.card}>
            <Text style={[Textstyles.bold, styles.sectionTitle]}>More fund details</Text>
            {fundDetailsRows.map((row, idx) => (
              <View key={row.label} style={[styles.detailRow, idx > 0 && styles.detailRowBorder]}>
                <Text style={styles.detailLabel}>{row.label}</Text>
                <Text style={styles.detailValue}>{String(row.value)}</Text>
              </View>
            ))}
          </View>
        ) : null}

        <View style={[styles.card, styles.orderCard]}>
          {pendingOrderId ? (
            <View style={styles.authSummaryWrap}>
              <Text style={styles.authSummaryLabel}>Order Amount</Text>
              <Text style={styles.authSummaryAmount}>{safeInr(pendingOrderAmount ?? minOrderAmount)}</Text>
              <TouchableOpacity style={styles.authContinueBtn} onPress={onAuthenticateAndContinue} activeOpacity={0.9} disabled={authLoading}>
                <Text style={styles.authContinueTxt}>
                  {authLoading ? 'Authenticating...' : 'Authenticate & Continue'}
                </Text>
              </TouchableOpacity>
              {readyForPayment ? (
                <TouchableOpacity style={styles.payNowPrimaryBtn} onPress={onPayNow} activeOpacity={0.9} disabled={paymentLoading}>
                  <Text style={styles.payNowPrimaryTxt}>{paymentLoading ? 'Starting payment...' : 'Pay Now'}</Text>
                </TouchableOpacity>
              ) : null}
            </View>
          ) : (
            <>
              <View style={styles.orderTabs}>
            <TouchableOpacity
              style={[styles.orderTabBtn, orderType === 'ONE_TIME' && styles.orderTabBtnActive]}
              activeOpacity={0.85}
              onPress={() => setOrderType('ONE_TIME')}>
              <Text style={[styles.orderTabTxt, orderType === 'ONE_TIME' && styles.orderTabTxtActive]}>One-time</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.orderTabBtn, orderType === 'SIP' && styles.orderTabBtnActive]}
              activeOpacity={0.85}
              onPress={() => setOrderType('SIP')}>
              <Text style={[styles.orderTabTxt, orderType === 'SIP' && styles.orderTabTxtActive]}>SIP</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.amountInputWrap}>
            <Text style={styles.amountCurrency}>₹</Text>
            <TextInput
              style={styles.amountInput}
              value={orderAmount}
              onChangeText={t => setOrderAmount(t.replace(/[^0-9]/g, ''))}
              keyboardType="number-pad"
              placeholder={String(minOrderAmount)}
              placeholderTextColor={Colors.GREY}
            />
          </View>

          <View style={styles.quickAmountRow}>
            {[500, 1000, 2000].map(v => (
              <TouchableOpacity key={v} style={styles.quickAmountChip} onPress={() => onTapQuickAmount(v)} activeOpacity={0.85}>
                <Text style={styles.quickAmountChipTxt}>₹{v}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {orderType === 'SIP' ? (
            <>
              <View style={styles.sipFieldsRow}>
                <View style={styles.sipFieldCol}>
                  <Text style={styles.sipFieldLabel}>SIP frequency</Text>
                  <View style={styles.sipOptionRow}>
                    {['Monthly', 'Quarterly'].map(freq => (
                      <TouchableOpacity
                        key={freq}
                        style={[styles.inlineChip, sipFrequency === freq && styles.inlineChipOn]}
                        onPress={() => setSipFrequency(freq)}
                        activeOpacity={0.85}>
                        <Text style={[styles.inlineChipTxt, sipFrequency === freq && styles.inlineChipTxtOn]}>{freq}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              </View>

              <View style={styles.sipFieldsRow}>
                <View style={styles.sipFieldCol}>
                  <Text style={styles.sipFieldLabel}>SIP date</Text>
                  <TouchableOpacity
                    style={styles.sipPickerField}
                    activeOpacity={0.85}
                    onPress={() => setShowSipDatePicker(true)}>
                    <Text style={styles.sipPickerValue}>{formatDDMMYYYY(sipDate)}</Text>
                    <Text style={styles.sipPickerArrow}>⌄</Text>
                  </TouchableOpacity>
                </View>

                <View style={styles.sipFieldCol}>
                  <Text style={styles.sipFieldLabel}>SIP Duration (Years)</Text>
                  <View style={styles.sipOptionRow}>
                    {['1', '3', '5'].map(y => (
                      <TouchableOpacity
                        key={y}
                        style={[styles.inlineChip, sipDurationYears === y && styles.inlineChipOn]}
                        onPress={() => setSipDurationYears(y)}
                        activeOpacity={0.85}>
                        <Text style={[styles.inlineChipTxt, sipDurationYears === y && styles.inlineChipTxtOn]}>{y}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              </View>

              <TouchableOpacity
                style={styles.mandateSelectCard}
                activeOpacity={0.85}
                onPress={() => setMandateModalVisible(true)}>
                <View style={{flex: 1}}>
                  <Text style={styles.mandateTitle}>Choose Mandate Method</Text>
                  <Text style={styles.mandateSub} numberOfLines={2}>{selectedMandateLabel}</Text>
                </View>
                <Text style={styles.mandateArrow}>›</Text>
              </TouchableOpacity>
            </>
          ) : null}

          <Text style={styles.minAmtHint}>Min amount: {safeInr(minOrderAmount)}</Text>

            <View style={styles.orderActions}>
              <TouchableOpacity style={styles.addedToCartBtn} onPress={onAddToCart} activeOpacity={0.9}>
                <Text style={styles.addedToCartTxt}>Added to Cart</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.buyNowBtn} onPress={onPlaceOrder} activeOpacity={0.9} disabled={placingOrder}>
                <Text style={styles.buyNowTxt}>
                  {placingOrder ? 'Placing order...' : orderType === 'SIP' ? 'Start SIP' : 'Buy Now'}
                </Text>
              </TouchableOpacity>
            </View>
            </>
          )}
        </View>

        <TouchableOpacity style={styles.viewCart} onPress={openCart} activeOpacity={0.85}>
          <Text style={[Textstyles.medium, styles.viewCartTxt]}>View cart →</Text>
        </TouchableOpacity>

        <Modal visible={mandateModalVisible} transparent animationType="fade" onRequestClose={() => setMandateModalVisible(false)}>
          <View style={styles.modalRoot}>
            <TouchableOpacity style={styles.modalDim} activeOpacity={1} onPress={() => setMandateModalVisible(false)} />
            <View style={styles.modalSheet}>
              <Text style={styles.modalTitle}>Select mandate</Text>
              {mandateLoading ? <ActivityIndicator color={Colors.themeBlue} style={{marginVertical: 12}} /> : null}
              {!mandateLoading && mandates.length === 0 ? (
                <Text style={styles.modalEmpty}>No mandate found. Please add mandate from Mandate screen.</Text>
              ) : null}
              {!mandateLoading &&
                mandates.map((m, idx) => {
                  const active = (selectedMandate?.id ?? selectedMandate?.mandate_id) === (m?.id ?? m?.mandate_id);
                  return (
                    <TouchableOpacity
                      key={String(m?.id ?? m?.mandate_id ?? idx)}
                      style={[styles.modalRow, active && styles.modalRowActive]}
                      onPress={() => {
                        setSelectedMandate(m);
                        setMandateModalVisible(false);
                      }}
                      activeOpacity={0.9}>
                      <Text style={[styles.modalRowTxt, active && styles.modalRowTxtActive]}>{pickMandateLabel(m)}</Text>
                    </TouchableOpacity>
                  );
                })}
            </View>
          </View>
        </Modal>

        {showSipDatePicker ? (
          <DateTimePicker
            value={sipDate}
            mode="date"
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            minimumDate={new Date()}
            onChange={onChangeSipDate}
          />
        ) : null}

        <View style={{height: 32}} />
      </ScrollView>
    </SafeAreaView>
  );
}

const w = Dimensions.get('window').width;

const styles = StyleSheet.create({
  safe: {flex: 1, backgroundColor: '#f9f9f9'},
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.BORDER_GREY,
  },
  back: {fontSize: 28, color: Colors.TEXT_PRIMARY, fontWeight: '300'},
  topActions: {flexDirection: 'row', alignItems: 'center'},
  cartBtn: {marginLeft: 20},
  iconBtn: {fontSize: 22},
  cartWrap: {position: 'relative'},
  badge: {
    position: 'absolute',
    top: -6,
    right: -10,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#111',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  badgeTxt: {color: '#fff', fontSize: 10, fontWeight: '700'},
  scroll: {paddingBottom: 40},
  card: {
    backgroundColor: Colors.white,
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: Colors.BORDER_GREY,
  },
  titleRow: {flexDirection: 'row', alignItems: 'flex-start'},
  logo: {width: 48, height: 48, borderRadius: 8, marginRight: 12},
  logoPh: {
    backgroundColor: Colors.offWhite,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.BORDER_GREY,
  },
  logoL: {fontSize: 20, fontWeight: '700', color: Colors.themeBlue},
  title: {flex: 1, fontSize: 18, color: Colors.TEXT_PRIMARY, lineHeight: 24},
  tags: {flexDirection: 'row', flexWrap: 'wrap', marginTop: 12, marginBottom: 8},
  tag: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
    backgroundColor: '#F1F8FF',
    borderWidth: 1,
    borderColor: '#1E81F2',
    marginRight: 8,
    marginBottom: 6,
  },
  tagTxt: {fontSize: 12, color: '#1E81F2'},
  grid2: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -8,
  },
  cell: {width: w > 400 ? '50%' : '100%', paddingHorizontal: 8, marginBottom: 16},
  cellLabel: {fontSize: 13, color: Colors.GREY, marginBottom: 4},
  cellVal: {fontSize: 17, color: Colors.TEXT_PRIMARY},
  sectionTitle: {fontSize: 17, marginBottom: 10, color: Colors.TEXT_PRIMARY},
  calcAmt: {fontSize: 22, color: Colors.TEXT_PRIMARY, marginBottom: 8},
  slider: {width: '100%', height: 44, marginBottom: 8},
  tableHead: {fontSize: 15, color: Colors.GREY, marginBottom: 8, marginTop: 8},
  tableRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingVertical: 10,
    gap: 4,
  },
  tableRowBorder: {borderTopWidth: 1, borderTopColor: Colors.BORDER_GREY},
  tCell: {fontSize: 12, color: Colors.TEXT_PRIMARY, width: '23%', minWidth: 70},
  tRight: {textAlign: 'right', flex: 1},
  pos: {color: '#16a34a'},
  neg: {color: '#dc2626'},
  holdingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: Colors.BORDER_GREY,
  },
  hName: {flex: 1, fontSize: 14, paddingRight: 8},
  hPct: {fontSize: 14, fontWeight: '600', color: Colors.TEXT_PRIMARY},
  detailRow: {paddingVertical: 10},
  detailRowBorder: {borderTopWidth: 1, borderTopColor: Colors.BORDER_GREY},
  detailLabel: {fontSize: 13, color: '#6B7280', marginBottom: 4},
  detailValue: {fontSize: 14, color: Colors.TEXT_PRIMARY},
  orderCard: {padding: 0, overflow: 'hidden'},
  orderTabs: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: Colors.BORDER_GREY,
  },
  orderTabBtn: {flex: 1, alignItems: 'center', paddingVertical: 14},
  orderTabBtnActive: {borderBottomWidth: 3, borderBottomColor: Colors.themeBlue},
  orderTabTxt: {fontSize: 18, color: '#6B7280', fontWeight: '700'},
  orderTabTxtActive: {color: Colors.themeBlue},
  amountInputWrap: {
    marginHorizontal: 14,
    marginTop: 14,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 12,
    minHeight: 56,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
  },
  amountCurrency: {fontSize: 32, color: '#6B7280', marginRight: 12},
  amountInput: {flex: 1, fontSize: 36, color: Colors.TEXT_PRIMARY, paddingVertical: 0},
  quickAmountRow: {flexDirection: 'row', justifyContent: 'space-around', marginTop: 14, marginHorizontal: 14},
  quickAmountChip: {
    borderWidth: 1,
    borderColor: Colors.themeBlue,
    borderRadius: 10,
    paddingVertical: 10,
    minWidth: 86,
    alignItems: 'center',
  },
  quickAmountChipTxt: {fontSize: 18, color: Colors.themeBlue, fontWeight: '700'},
  sipFieldsRow: {marginHorizontal: 14, marginTop: 14},
  sipFieldCol: {flex: 1},
  sipFieldLabel: {fontSize: 14, color: '#4B5563', marginBottom: 8},
  sipOptionRow: {flexDirection: 'row', gap: 8},
  inlineChip: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#FFFFFF',
  },
  inlineChipOn: {backgroundColor: '#EAF4FF', borderColor: Colors.themeBlue},
  inlineChipTxt: {fontSize: 14, color: '#374151', fontWeight: '600'},
  inlineChipTxtOn: {color: Colors.themeBlue},
  sipPickerField: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 10,
    paddingHorizontal: 12,
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sipPickerValue: {fontSize: 18, color: Colors.TEXT_PRIMARY},
  sipPickerArrow: {fontSize: 18, color: '#6B7280'},
  mandateSelectCard: {
    marginHorizontal: 14,
    marginTop: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.BORDER_GREY,
    minHeight: 78,
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  mandateTitle: {fontSize: 16, color: Colors.TEXT_PRIMARY, fontWeight: '700'},
  mandateSub: {fontSize: 14, color: '#6B7280', marginTop: 4},
  mandateArrow: {fontSize: 28, color: '#9CA3AF', marginLeft: 8},
  minAmtHint: {marginHorizontal: 14, marginTop: 12, color: '#6B7280', fontSize: 13},
  orderActions: {flexDirection: 'row', gap: 10, marginHorizontal: 14, marginTop: 14, marginBottom: 14},
  addedToCartBtn: {
    flex: 1,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#A7F3D0',
    backgroundColor: '#F0FDF4',
    minHeight: 52,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addedToCartTxt: {fontSize: 16, color: '#34D399', fontWeight: '700'},
  buyNowBtn: {
    flex: 1,
    borderRadius: 12,
    backgroundColor: '#22C55E',
    minHeight: 52,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buyNowTxt: {fontSize: 16, color: Colors.white, fontWeight: '700'},
  authContinueBtn: {
    flex: 1,
    borderRadius: 12,
    backgroundColor: Colors.themeBlue,
    minHeight: 52,
    alignItems: 'center',
    justifyContent: 'center',
  },
  authContinueTxt: {fontSize: 16, color: Colors.white, fontWeight: '700'},
  authSummaryWrap: {padding: 16},
  authSummaryLabel: {fontSize: 13, color: '#6B7280', marginBottom: 6},
  authSummaryAmount: {fontSize: 28, color: Colors.TEXT_PRIMARY, fontWeight: '700', marginBottom: 16},
  payNowPrimaryBtn: {
    marginTop: 12,
    borderRadius: 12,
    backgroundColor: '#22C55E',
    minHeight: 52,
    alignItems: 'center',
    justifyContent: 'center',
  },
  payNowPrimaryTxt: {fontSize: 16, color: Colors.white, fontWeight: '700'},
  viewCart: {marginHorizontal: 16, marginTop: 12, paddingVertical: 12, alignItems: 'center'},
  viewCartTxt: {color: Colors.themeBlue, fontSize: 16},
  modalRoot: {flex: 1, justifyContent: 'flex-end'},
  modalDim: {...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.45)'},
  modalSheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    padding: 16,
    maxHeight: '70%',
  },
  modalTitle: {fontSize: 16, fontWeight: '800', color: Colors.TEXT_PRIMARY, marginBottom: 10},
  modalEmpty: {fontSize: 13, color: '#6B7280', marginVertical: 10},
  modalRow: {paddingVertical: 12, paddingHorizontal: 10, borderRadius: 10, marginBottom: 6},
  modalRowActive: {backgroundColor: '#EAF4FF'},
  modalRowTxt: {fontSize: 14, color: Colors.TEXT_PRIMARY},
  modalRowTxtActive: {color: Colors.themeBlue, fontWeight: '700'},
  center: {flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24},
  loadingTxt: {marginTop: 12, color: Colors.GREY},
  err: {color: '#B91C1C', textAlign: 'center', padding: 16},
  retry: {marginTop: 12, padding: 12},
  retryTxt: {color: Colors.themeBlue, fontWeight: '600'},
});
