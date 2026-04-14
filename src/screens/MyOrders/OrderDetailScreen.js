import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  Image,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useNavigation, useRoute} from '@react-navigation/native';
import {useSelector} from 'react-redux';
import {navigateToAllFundsSIP, navigateToFundDetail} from '../../navigation/navigationRef';
import {pickSchemeCode} from '../../utils/schemeCode';
import Textstyles from '../../utils/text';
import Icons from '../../utils/icons';
import {
  authenticateOrder,
  createCancelOrder,
  extractOrderAuthUrl,
  fetchOrderStatus,
  processOrderPayment,
} from '../../services/ordersService';
import {
  pickOrderTitle,
  pickOrderAmountRaw,
  pickOrderStatus,
  pickOrderType,
  pickOrderDate,
  pickCompletedDate,
  pickNavDate,
  pickFolio,
  pickOrderIdDisplay,
  formatOrderTypeLabel,
  normalizeStatusKey,
  statusCategory,
} from './orderHelpers';
import StatusTimeline from '../../components/StatusTimeline';
import AppModal from '../../components/AppModal';
import AppBackButton from '../../components/AppBackButton';
import {radius} from '../../theme/radius';
import {useAppTheme} from '../../theme/useAppTheme';
import {appAlert} from '../../utils/appAlert';

function formatInr(value) {
  if (value === null || value === undefined || value === '') {
    return '—';
  }
  const n = Number(value);
  if (Number.isNaN(n)) {
    return String(value);
  }
  return `₹${n.toLocaleString('en-IN', {minimumFractionDigits: 0, maximumFractionDigits: 2})}`;
}

function formatDateTime(raw) {
  if (!raw) {
    return '—';
  }
  try {
    const d = new Date(raw);
    if (Number.isNaN(d.getTime())) {
      return String(raw);
    }
    const dateStr = d.toLocaleDateString('en-IN', {day: '2-digit', month: 'short', year: 'numeric'});
    const timeStr = d.toLocaleTimeString('en-IN', {hour: '2-digit', minute: '2-digit', hour12: true});
    return `${dateStr}, ${timeStr}`;
  } catch {
    return String(raw);
  }
}

function formatDateOnly(raw) {
  if (!raw) {
    return '—';
  }
  try {
    const d = new Date(raw);
    if (Number.isNaN(d.getTime())) {
      return String(raw);
    }
    return d.toLocaleDateString('en-IN', {day: '2-digit', month: 'short', year: 'numeric'});
  } catch {
    return String(raw);
  }
}

function buildTimelineSteps(order) {
  const raw = order?.order_timeline ?? order?.timeline ?? order?.status_history ?? order?.steps;
  if (Array.isArray(raw) && raw.length > 0) {
    return raw.map((s, i) => ({
      id: typeof s?.id === 'number' ? s.id : i,
      key: String(i),
      title: s.title ?? s.label ?? s.status ?? `Step ${i + 1}`,
      at: s.date ?? s.at ?? s.timestamp,
      done: s.completed !== false && s.done !== false && s.status !== 'pending',
      completed: s.completed !== false && s.done !== false,
      continueButton: !!s.continueButton,
      cancelled: !!s.cancelled,
      failed: !!s.failed,
    }));
  }
  const status = normalizeStatusKey(pickOrderStatus(order));
  const updatedAt = order?.updated_at ?? order?.updatedAt;
  const createdAt = order?.created_at ?? order?.createdAt;

  const buySellType = String(
    order?.buy_sell ??
      order?.buySell ??
      order?.buy_sell_type ??
      order?.buySellType ??
      '',
  )
    .trim()
    .toUpperCase();

  const stepsBase = [
    {id: 0, title: 'Order Accepted'},
    {id: 1, title: 'Order Authenticated'},
    {id: 2, title: 'Payment Confirmed'},
    {id: 3, title: 'Units allocated'},
  ].map(s => ({
    ...s,
    key: String(s.id),
    at: null,
    done: false,
    completed: false,
    continueButton: false,
    cancelled: false,
    failed: false,
  }));

  let steps = stepsBase.map(s => ({...s}));

  if (status === 'FAILED') {
    steps = steps.map(step =>
      step.id === 0 ? {...step, failed: true, title: 'Order Failed', continueButton: true} : step,
    );
  }

  if (status === 'SUBMITTED' || status === 'PENDING') {
    steps = steps.map(step => {
      if (step.id < 1) return {...step, completed: true, done: true};
      if (step.id === 1) return {...step, continueButton: true};
      return step;
    });
  }

  if (status === 'AUTHENTICATED') {
    steps = steps.map(step => {
      if (step.id < 2) return {...step, completed: true, done: true, at: updatedAt};
      if (step.id === 2) return {...step, continueButton: true};
      return step;
    });
  }

  if (status === 'PAYMENT_CONFIRMED') {
    steps = steps.map(step => {
      if (step.id < 3) return {...step, completed: true, done: true, at: updatedAt};
      if (step.id === 3) return {...step, continueButton: true};
      return step;
    });
  }

  if (status === 'COMPLETED') {
    steps = steps.map(step => ({...step, completed: true, done: true, at: updatedAt}));
  }

  if (buySellType === 'R') {
    steps = steps.filter(step => step.id !== 2);
    steps = steps.map(step =>
      step.title === 'Units allocated' ? {...step, title: 'Redemption Completed'} : step,
    );
  }

  if (buySellType === 'SIP') {
    steps = steps.filter(step => step.id !== 2);
  }

  if (status === 'CANCELLED' || status === 'CANCELED') {
    steps = steps.map((step, idx) => (idx === 0 ? {...step, title: 'Order Cancelled', cancelled: true} : step));
  }

  steps = steps.map((step, idx) => (idx === 0 ? {...step, at: createdAt} : step));

  return steps;
}

export default function OrderDetailScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const {colors, isDark} = useAppTheme();
  const styles = useMemo(() => getOrderDetailStyles(colors, isDark), [colors, isDark]);
  const user = useSelector(s => s.auth.user);
  const routeOrder = route.params?.order;
  const [resolvedOrder, setResolvedOrder] = useState(routeOrder || null);
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [statusLoading, setStatusLoading] = useState(false);
  const [timelineActionLoading, setTimelineActionLoading] = useState(false);
  const [orderContinue, setOrderContinue] = useState(false);
  const [paymentBoxStatus, setPaymentBoxStatus] = useState('NEW');
  const pollLockRef = useRef(false);
  const [paymentModeModalVisible, setPaymentModeModalVisible] = useState(false);
  const [paymentModeStep, setPaymentModeStep] = useState('method'); // method | upi | neft
  const [selectedPaymentMode, setSelectedPaymentMode] = useState(null);
  const [upiVpa, setUpiVpa] = useState('');
  const [neftUtr, setNeftUtr] = useState('');
  const [paymentModeBusy, setPaymentModeBusy] = useState(false);
  const [pullRefreshing, setPullRefreshing] = useState(false);
  const order = resolvedOrder || routeOrder;

  useEffect(() => {
    setResolvedOrder(routeOrder || null);
  }, [routeOrder]);

  const statusLookupId = routeOrder?.id ?? routeOrder?.order_id;

  useEffect(() => {
    if (!statusLookupId) {
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        setStatusLoading(true);
        const res = await fetchOrderStatus(statusLookupId);
        const root = res?.data?.data ?? res?.data ?? {};
        const detail = root?.order ?? root?.result ?? root;
        if (!cancelled && detail && typeof detail === 'object') {
          setResolvedOrder(prev => ({...(prev || {}), ...detail}));
          if (__DEV__) {
            //     console.log('[OrderDetail] status api merged', {
            //       statusLookupId,
            //       detail,
            // });
          }
        }
      } catch (e) {
        if (__DEV__) {
          console.log('[OrderDetail] status api failed', {
            statusLookupId,
            error: e?.message || String(e),
          });
        }
      } finally {
        if (!cancelled) {
          setStatusLoading(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [statusLookupId]);

  const title = useMemo(() => pickOrderTitle(order || {}), [order]);
  const amount = useMemo(() => formatInr(pickOrderAmountRaw(order)), [order]);
  const status = useMemo(() => pickOrderStatus(order), [order]);
  const typePill = useMemo(() => formatOrderTypeLabel(pickOrderType(order)), [order]);
  const cat = useMemo(() => statusCategory(status), [status]);

  const timeline = useMemo(() => buildTimelineSteps(order || {}), [order]);

  const onOpenFund = useCallback(() => {
    const code = pickSchemeCode(order);
    if (!code) {
      return;
    }
    navigateToFundDetail(navigation, {
      schemeCode: code,
      schemeName: title,
    });
  }, [navigation, order, title]);

  const onNeedHelp = useCallback(() => {
    appAlert('Need help?', 'Choose how you would like to get assistance.', [
      {text: "FAQ's", onPress: () => navigation.navigate('SupportArticle', {id: 'faq'})},
      {text: 'Help & Support', onPress: () => navigation.navigate('SupportArticle', {id: 'help'})},
      {text: 'Cancel', style: 'cancel'},
    ]);
  }, [navigation]);

  const logo = order?.logo_url ?? order?.logo;
  // Web parity:
  // - authenticate endpoint expects internal `order_id`
  // - payment endpoint expects numeric `order_numbers` (often same id in our API responses)
  const authOrderId =
    order?.order_id ??
    order?.bse_order_id ??
    order?.order_number ??
    order?.order_no ??
    order?.id;

  const orderNumber =
    order?.bse_order_id ??
    order?.order_id ??
    order?.order_number ??
    order?.order_no ??
    order?.transaction_number ??
    order?.id;
  const timelineStatus = normalizeStatusKey(status);

  const buyFlag = String(order?.buy_sell ?? order?.buySell ?? '').toUpperCase() === 'P';
  const isSipFlag =
    !!order?.isSIP ||
    !!order?.is_sip ||
    !!order?.sip_frequency ||
    !!order?.sip_date ||
    !!order?.sip_duration_years ||
    String(order?.buy_sell_display ?? order?.buy_sell ?? '').toUpperCase().includes('SIP') ||
    !!order?.xsip_reg_id;
  const selectedMandate =
    order?.mandate_id ?? order?.mandateId ?? order?.mandate_id ?? order?.mandate ?? null;

  const derivePaymentBoxStatus = useCallback(() => {
    if (timelineStatus.includes('SUBMITTED') || timelineStatus.includes('PENDING')) {
      return 'AUTHENTICATION_REQUIRED';
    }
    if (timelineStatus.includes('AUTHENTICATED') || timelineStatus.includes('PAYMENT_REQUIRED')) {
      // Web parity: if SIP or mandate is involved, after authentication we move to confirmation step (no payment mode selection)
      if (!buyFlag || isSipFlag || selectedMandate) {
        return 'CONFIRMATION_REQUIRED';
      }
      return 'PAYMENT_REQUIRED';
    }
    if (timelineStatus.includes('AUTHENTICATION_REQUIRED')) {
      return 'AUTHENTICATION_REQUIRED';
    }
    if (timelineStatus.includes('PAYMENT_CONFIRMED')) {
      return 'CONFIRMATION_REQUIRED';
    }
    if (timelineStatus.includes('CONFIRMED') || timelineStatus.includes('COMPLETED') || cat === 'success') {
      return 'COMPLETED';
    }
    return 'NEW';
  }, [buyFlag, cat, isSipFlag, selectedMandate, timelineStatus]);

  useEffect(() => {
    if (!orderContinue) {
      return;
    }
    setPaymentBoxStatus(derivePaymentBoxStatus());
  }, [orderContinue, derivePaymentBoxStatus]);

  const onPayNowWithMode = useCallback(async (mode, neftReferenceOverride = '') => {
    const clientCode = user?.client_code ?? user?.ucc_code ?? user?.ucc;
    const totalAmount = Number(String(pickOrderAmountRaw(order)).replace(/,/g, '')) || 0;
    if (!orderNumber || !clientCode || !totalAmount) {
      return;
    }
    if (!mode) {
      appAlert('Payment', 'Please select a payment mode.');
      return;
    }
    try {
      setPaymentLoading(true);
      setPaymentModeBusy(true);
      if (__DEV__) {
        console.log('[OrderDetail] pay-now request', {
          orderNumber,
          totalAmount,
          mode_of_payment: mode,
        });
      }
      const res = await processOrderPayment({
        clientCode,
        modeOfPayment: mode,
        orderNumber,
        totalAmount,
        vpaId: mode === 'UPI' ? upiVpa : '',
        neftReference: mode === 'NEFT' ? neftReferenceOverride : '',
      });
      const apiStatus = String(res?.data?.status ?? res?.status ?? '').toLowerCase();
      const responseString =
        res?.data?.data?.responsestring ??
        res?.data?.data?.ResponseString ??
        res?.data?.message ??
        '';

      const url = extractOrderAuthUrl(res?.data);
      if (__DEV__) {
        console.log('[OrderDetail] pay-now response', {orderNumber, hasUrl: !!url, data: res?.data});
      }

      // If API says pending, show error/pending message and DO NOT show "payment link has been generated".
      if (apiStatus === 'pending') {
        appAlert('Payment', responseString || 'Payment is pending. Please try again.');
        setPaymentBoxStatus('PAYMENT_REQUIRED');
        setPaymentModeModalVisible(false);
        setPaymentModeStep('method');
        return;
      }

      // Web parity:
      // DIRECT opens gateway in a webview; UPI/NEFT usually just generates/sends a payment link.
      if (url) {
        navigation.navigate('MandateAuthWebview', {uri: url, title: 'Complete payment'});
      }
      // If gateway URL isn't returned, still show the API message (UPI request, mapping issues, etc).
      if (!url && responseString) {
        appAlert('Payment', responseString);
      }
      setPaymentBoxStatus('PAYMENT_CONFIRMATION_REQUIRED');
      setPaymentModeModalVisible(false);
      setPaymentModeStep('method');
    } finally {
      setPaymentLoading(false);
      setPaymentModeBusy(false);
    }
  }, [navigation, order, orderNumber, user, upiVpa]);

  const onAuthenticateFromPaymentBox = useCallback(async () => {
    if (!authOrderId) {
      return;
    }
    try {
      setPaymentLoading(true);
      const res = await authenticateOrder(authOrderId);
      const url = extractOrderAuthUrl(res?.data);
      if (__DEV__) {
        console.log('[OrderDetail] auth from payment-box response', {
          authOrderId,
          hasUrl: !!url,
          data: res?.data,
        });
      }
      if (url) {
        navigation.navigate('MandateAuthWebview', {uri: url, title: 'Authenticate & Continue'});
        const nextStatus =
          !buyFlag || isSipFlag || selectedMandate
            ? 'CONFIRMATION_REQUIRED'
            : 'PAYMENT_REQUIRED';
        setPaymentBoxStatus(nextStatus);
      } else {
        appAlert('Authentication failed', 'Payment authentication URL not found.');
      }
    } catch (e) {
      appAlert('Authentication failed', String(e?.message || 'Could not authenticate order.'));
    } finally {
      setPaymentLoading(false);
    }
  }, [authOrderId, buyFlag, isSipFlag, navigation, selectedMandate]);

  const refreshResolvedOrder = useCallback(async () => {
    if (!statusLookupId) {
      return;
    }
    try {
      const res = await fetchOrderStatus(statusLookupId);
      const root = res?.data?.data ?? res?.data ?? res ?? {};
      const detail = root?.order ?? root?.result ?? root?.data ?? root;
      if (detail && typeof detail === 'object') {
        setResolvedOrder(prev => ({...(prev || {}), ...detail}));
      }
    } catch (e) {
      if (__DEV__) {
        console.log('[OrderDetail] refresh status failed', {statusLookupId, error: e?.message || String(e)});
      }
    }
  }, [statusLookupId]);

  // While PaymentBox is visible, poll order status so UI conditions update
  // (web paritiy: Continue panel updates after authentication/payment).
  useEffect(() => {
    if (!orderContinue || !statusLookupId) {
      return;
    }
    let attempts = 0;
    const maxAttempts = 18; // ~72s with 4s interval
    const interval = setInterval(async () => {
      attempts += 1;
      const terminal =
        cat === 'success' ||
        cat === 'failed' ||
        timelineStatus.includes('COMPLETED') ||
        timelineStatus.includes('FAILED');
      if (terminal || attempts > maxAttempts) {
        clearInterval(interval);
        return;
      }
      if (pollLockRef.current) {
        return;
      }
      pollLockRef.current = true;
      try {
        await refreshResolvedOrder();
      } finally {
        pollLockRef.current = false;
      }
    }, 4000);

    return () => clearInterval(interval);
  }, [cat, orderContinue, refreshResolvedOrder, statusLookupId, timelineStatus]);

  const onTimelineCancel = useCallback(async () => {
    if (!order) {
      return;
    }
    try {
      setTimelineActionLoading(true);
      await createCancelOrder(order);
      appAlert('Order cancelled', 'Your order has been cancelled.');
      navigation.navigate('MyOrders');
    } catch (e) {
      appAlert('Cancel failed', String(e?.message || 'Could not cancel order.'));
    } finally {
      setTimelineActionLoading(false);
    }
  }, [navigation, order]);

  const onTimelineContinue = useCallback(async () => {
    if (!orderNumber) {
      return;
    }
    try {
      setTimelineActionLoading(true);

      if (timelineStatus === 'FAILED') {
        navigateToAllFundsSIP(navigation);
        return;
      }

      await refreshResolvedOrder();
      setOrderContinue(true);
    } catch (e) {
      appAlert('Continue failed', String(e?.message || 'Could not proceed.'));
    } finally {
      setTimelineActionLoading(false);
    }
  }, [navigation, orderNumber, refreshResolvedOrder, timelineStatus]);

  const onPullRefresh = useCallback(async () => {
    setPullRefreshing(true);
    try {
      await refreshResolvedOrder();
    } finally {
      setPullRefreshing(false);
    }
  }, [refreshResolvedOrder]);

  if (!order) {
    return (
      <SafeAreaView style={[styles.safe, {backgroundColor: colors.background}]} edges={['top', 'left', 'right']}>
        <View style={styles.topBar}>
          <View style={[styles.topBarSide, styles.topBarSideLeft]}>
            <AppBackButton onPress={() => navigation.goBack()} hitSlop={10} />
          </View>
          <Text style={styles.navTitle}>Order Details</Text>
          <View style={[styles.topBarSide, styles.topBarSideRight]} />
        </View>
        <View style={styles.missing}>
          <Text style={styles.missingTxt}>No order data.</Text>
        </View>
      </SafeAreaView>
    );
  }

  const summaryHead =
    cat === 'success'
      ? 'Order Completed'
      : cat === 'failed'
        ? 'Order Failed'
        : cat === 'progress'
          ? 'Order InProgress'
          : `Order ${status}`;

  return (
    <SafeAreaView style={[styles.safe, {backgroundColor: colors.background}]} edges={['top', 'left', 'right']}>
      <View style={styles.topBar}>
        <View style={[styles.topBarSide, styles.topBarSideLeft]}>
          <AppBackButton onPress={() => navigation.goBack()} hitSlop={10} />
        </View>
        <Text style={styles.navTitle}>Order Details</Text>
        <View style={[styles.topBarSide, styles.topBarSideRight]}>
          <TouchableOpacity style={styles.refreshBtn} onPress={onPullRefresh} activeOpacity={0.8}>
            <Text style={styles.refreshBtnTxt}>{pullRefreshing ? '...' : 'Refresh'}</Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={pullRefreshing}
            onRefresh={onPullRefresh}
            tintColor={colors.primary}
          />
        }>
        <View style={styles.summaryCard}>
          <View style={styles.summaryTop}>
            <View style={styles.summaryLeft}>
              <Text style={styles.summaryHead}>{summaryHead}</Text>
              <Text style={styles.summaryAmt}>{amount}</Text>
              <View style={styles.typePill}>
                <Text style={styles.typePillTxt}>{typePill}</Text>
              </View>
            </View>
            <View style={styles.summaryIconWrap}>
              {cat === 'success' ? (
                <View style={[styles.statusCircle, styles.statusCircleOk]}>
                  <Image source={Icons.checkIcons} style={styles.statusIconImg} resizeMode="contain" />
                </View>
              ) : cat === 'failed' ? (
                <View style={[styles.statusCircle, styles.statusCircleFail]}>
                  <Image source={Icons.CnacelIcon} style={styles.statusIconImg} resizeMode="contain" />
                </View>
              ) : (
                <View style={[styles.statusCircle, styles.statusCirclePending]}>
                  {/* <Text style={styles.clockTxt}>🕐</Text> */}
                  <Image source={Icons.inProgress} style={styles.clockIconImg} resizeMode="contain" />
                </View>
              )}
            </View>
          </View>
        </View>

        <TouchableOpacity style={styles.fundCard} onPress={onOpenFund} activeOpacity={0.75}>
          {logo ? (
            <Image source={{uri: logo}} style={styles.fundLogo} resizeMode="contain" />
          ) : (
            <View style={[styles.fundLogo, styles.fundLogoPh]}>
              <Text style={styles.fundLogoLetter}>{(title || '?')[0]?.toUpperCase() ?? '?'}</Text>
            </View>
          )}
          <Text style={styles.fundName} numberOfLines={2}>
            {title}
          </Text>
          <Text style={styles.chev}>›</Text>
        </TouchableOpacity>

        <View style={styles.dateRow}>
          <View style={styles.dateHalf}>
            <Text style={styles.dateLabel}>Completed on</Text>
            <Text style={styles.dateVal}>{formatDateOnly(pickCompletedDate(order))}</Text>
          </View>
          <View style={styles.dateHalf}>
            <Text style={styles.dateLabel}>Nav. Date</Text>
            <Text style={styles.dateVal}>{formatDateOnly(pickNavDate(order))}</Text>
          </View>
        </View>

        <View style={styles.notice}>
          <Text style={styles.noticeIcon}>⚡</Text>
          <Text style={styles.noticeTxt}>Speedy order completion in just 1 working day.</Text>
        </View>

        {statusLoading ? (
          <View style={styles.statusLoadingRow}>
            <Text style={styles.statusLoadingTxt}>Refreshing order status...</Text>
          </View>
        ) : null}

        <Text style={styles.sectionTitle}>{orderContinue ? 'Payment' : 'Order Status'}</Text>
        {orderContinue ? (
          <View style={styles.paymentBoxCard}>
            {paymentBoxStatus === 'AUTHENTICATION_REQUIRED' ? (
              <TouchableOpacity
                style={styles.authBoxBtn}
                onPress={onAuthenticateFromPaymentBox}
                activeOpacity={0.9}
                disabled={paymentLoading}>
                <Text style={styles.authBoxTxt}>
                  {paymentLoading ? 'Authenticating...' : 'Authenticate & Continue'}
                </Text>
              </TouchableOpacity>
            ) : null}

            {paymentBoxStatus === 'PAYMENT_REQUIRED' ? (
              <TouchableOpacity
                style={styles.payBoxBtn}
                onPress={() => {
                  setPaymentModeModalVisible(true);
                  setPaymentModeStep('method');
                  setSelectedPaymentMode(null);
                  setUpiVpa('');
                  setNeftUtr('');
                }}
                activeOpacity={0.9}
                disabled={paymentLoading}>
                <Text style={styles.payBoxTxt}>
                  {paymentLoading ? 'Processing Payment...' : 'Pay Now'}
                </Text>
              </TouchableOpacity>
            ) : null}

            <AppModal
              visible={paymentModeModalVisible}
              onClose={() => setPaymentModeModalVisible(false)}
              title="Select payment mode"
              isBottomSheet
              maxHeight={'88%'}>
              <View style={styles.modalSheetInner}>
                  <TouchableOpacity
                    style={styles.modalCloseBtn}
                    onPress={() => {
                      setPaymentModeModalVisible(false);
                      setPaymentModeStep('method');
                      setSelectedPaymentMode(null);
                    }}
                    activeOpacity={0.9}>
                    <Text style={styles.modalCloseTxt}>✕</Text>
                  </TouchableOpacity>
                  {paymentModeStep === 'method' ? (
                    <>
                      <View style={{marginBottom: 10}}>
                        <TouchableOpacity
                          onPress={() => {
                            setPaymentModeModalVisible(false);
                            setPaymentModeStep('method');
                            setSelectedPaymentMode(null);
                          }}>
                          <View style={styles.modalBackRow}>
                            <Image source={Icons.BackIcon} style={styles.modalBackIcon} resizeMode="contain" />
                            <Text style={styles.modalBackTxt}>Back to Payment</Text>
                          </View>
                        </TouchableOpacity>
                      </View>

                      <TouchableOpacity
                        style={[styles.modalOptionRow, selectedPaymentMode === 'UPI' && styles.modalOptionRowActive]}
                        onPress={() => {
                          setSelectedPaymentMode('UPI');
                        }}>
                        <Text style={styles.modalOptionIcon}>🪪</Text>
                        <View style={{flex: 1}}>
                          <Text style={styles.modalOptionMain}>Send Payment Link via UPI</Text>
                          <Text style={styles.modalOptionSub}>SBI *****8392</Text>
                        </View>
                        <Text style={styles.modalOptionChevron}>›</Text>
                      </TouchableOpacity>

                      {selectedPaymentMode === 'UPI' ? (
                        <View style={{marginTop: 10}}>
                          <View style={styles.paymentModeCard}>
                            <Text style={styles.paymentModeHint}>Enter Your UPI ID</Text>
                            <TextInput
                              style={styles.utrInput}
                              value={upiVpa}
                              onChangeText={setUpiVpa}
                              placeholder="name@bank"
                              autoCapitalize="none"
                              autoCorrect={false}
                            />
                          </View>
                        </View>
                      ) : null}

                      <TouchableOpacity
                        style={[styles.modalOptionRow, selectedPaymentMode === 'NEFT' && styles.modalOptionRowActive]}
                        onPress={() => {
                          setSelectedPaymentMode('NEFT');
                        }}>
                        <Text style={styles.modalOptionIcon}>🏦</Text>
                        <View style={{flex: 1}}>
                          <Text style={styles.modalOptionMain}>Net Banking</Text>
                          <Text style={styles.modalOptionSub}>Pay via net banking</Text>
                        </View>
                        <Text style={styles.modalOptionChevron}>›</Text>
                      </TouchableOpacity>

                      {selectedPaymentMode === 'NEFT' ? (
                        <View style={{marginTop: 10}}>
                          <View style={styles.paymentModeCard}>
                            <Text style={styles.paymentModeHint}>Enter Your UTR ID</Text>
                            <TextInput
                              style={styles.utrInput}
                              value={neftUtr}
                              onChangeText={setNeftUtr}
                              placeholder="UTR / Reference"
                              autoCapitalize="none"
                              autoCorrect={false}
                            />
                          </View>
                        </View>
                      ) : null}

                      <TouchableOpacity
                        style={[styles.modalOptionRow, selectedPaymentMode === 'DIRECT' && styles.modalOptionRowActive]}
                        onPress={() => {
                          setSelectedPaymentMode('DIRECT');
                        }}>
                        <Text style={styles.modalOptionIcon}>🔒</Text>
                        <View style={{flex: 1}}>
                          <Text style={styles.modalOptionMain}>Pay via Payment Gateway</Text>
                          <Text style={styles.modalOptionSub}>Continue to secure payment page</Text>
                        </View>
                        <Text style={styles.modalOptionChevron}>›</Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={[styles.modalContinuePrimaryBtn, (paymentLoading || paymentModeBusy) && {opacity: 0.7}]}
                        onPress={async () => {
                          if (!selectedPaymentMode) {
                            appAlert('Payment', 'Please choose a payment method.');
                            return;
                          }
                          if (selectedPaymentMode === 'UPI') {
                            const v = String(upiVpa || '').trim();
                            const upiRegex = /^[a-zA-Z0-9._-]{2,64}@[a-zA-Z]{2,64}$/;
                            if (!upiRegex.test(v)) {
                              appAlert('UPI', 'Please enter a valid UPI VPA (example: name@bank).');
                              return;
                            }
                          }
                          if (selectedPaymentMode === 'NEFT') {
                            const v = String(neftUtr || '').trim();
                            if (!v) {
                              appAlert('NEFT', 'Please enter UTR / Reference.');
                              return;
                            }
                          }
                          setPaymentModeBusy(false);
                          await onPayNowWithMode(selectedPaymentMode, selectedPaymentMode === 'NEFT' ? neftUtr : '');
                        }}
                        disabled={paymentLoading || paymentModeBusy}>
                        {paymentModeBusy ? (
                          <ActivityIndicator size="small" color="#FFFFFF" />
                        ) : selectedPaymentMode === 'DIRECT' ? (
                          <Text style={styles.modalContinuePrimaryTxt}>Pay Now</Text>
                        ) : (
                          <Text style={styles.modalContinuePrimaryTxt}>Continue</Text>
                        )}
                      </TouchableOpacity>
                    </>
                  ) : null}

                  {paymentModeStep === 'upi' ? (
                    <>
                      <View style={styles.modalBackRow}>
                        <TouchableOpacity onPress={() => setPaymentModeStep('method')}>
                          <View style={styles.modalBackRow}>
                            <Image source={Icons.BackIcon} style={styles.modalBackIcon} resizeMode="contain" />
                            <Text style={styles.modalBackTxt}>Back to Payment</Text>
                          </View>
                        </TouchableOpacity>
                      </View>
                      <View style={styles.paymentModeCard}>
                        <Text style={styles.paymentModeTitle}>Send Payment Link via UPI</Text>
                        <Text style={styles.paymentModeHint}>Enter Your UPI ID</Text>
                        <TextInput
                          style={styles.utrInput}
                          value={upiVpa}
                          onChangeText={setUpiVpa}
                          placeholder="name@bank"
                          autoCapitalize="none"
                          autoCorrect={false}
                        />
                      </View>
                      <TouchableOpacity
                        style={[styles.modalContinuePrimaryBtn, (paymentLoading || paymentModeBusy) && {opacity: 0.7}]}
                        onPress={async () => {
                          const v = String(upiVpa || '').trim();
                          const upiRegex = /^[a-zA-Z0-9._-]{2,64}@[a-zA-Z]{2,64}$/;
                          if (!upiRegex.test(v)) {
                            appAlert('UPI', 'Please enter a valid UPI VPA (example: name@bank).');
                            return;
                          }
                          await onPayNowWithMode('UPI');
                        }}
                        disabled={paymentLoading || paymentModeBusy}>
                        {paymentModeBusy ? <ActivityIndicator size="small" color="#FFFFFF" /> : <Text style={styles.modalContinuePrimaryTxt}>Continue</Text>}
                      </TouchableOpacity>
                    </>
                  ) : null}

                  {paymentModeStep === 'neft' ? (
                    <>
                      <View style={styles.modalBackRow}>
                        <TouchableOpacity onPress={() => setPaymentModeStep('method')}>
                          <View style={styles.modalBackRow}>
                            <Image source={Icons.BackIcon} style={styles.modalBackIcon} resizeMode="contain" />
                            <Text style={styles.modalBackTxt}>Back to Payment</Text>
                          </View>
                        </TouchableOpacity>
                      </View>
                      <View style={styles.paymentModeCard}>
                        <Text style={styles.paymentModeTitle}>Net Banking</Text>
                        <Text style={styles.paymentModeHint}>Enter Your UTR ID</Text>
                        <TextInput
                          style={styles.utrInput}
                          value={neftUtr}
                          onChangeText={setNeftUtr}
                          placeholder="UTR / Reference"
                          autoCapitalize="none"
                          autoCorrect={false}
                          keyboardType="default"
                        />
                      </View>
                      <TouchableOpacity
                        style={[styles.modalContinuePrimaryBtn, (paymentLoading || paymentModeBusy) && {opacity: 0.7}]}
                        onPress={async () => {
                          const v = String(neftUtr || '').trim();
                          if (!v) {
                            appAlert('NEFT', 'Please enter UTR/Reference.');
                            return;
                          }
                          await onPayNowWithMode('NEFT', v);
                        }}
                        disabled={paymentLoading || paymentModeBusy}>
                        {paymentModeBusy ? <ActivityIndicator size="small" color="#FFFFFF" /> : <Text style={styles.modalContinuePrimaryTxt}>Continue</Text>}
                      </TouchableOpacity>
                    </>
                  ) : null}
              </View>
            </AppModal>

            {paymentBoxStatus === 'PAYMENT_CONFIRMATION_REQUIRED' ? (
              <TouchableOpacity style={styles.payBoxBtnDisabled} disabled>
                <Text style={styles.payBoxBtnDisabledTxt}>
                  {selectedPaymentMode === 'UPI' ? 'Payment link has been sent' : 'Payment link has been generated'}
                </Text>
              </TouchableOpacity>
            ) : null}

            {paymentBoxStatus === 'CONFIRMATION_REQUIRED' ? (
              isSipFlag || selectedMandate || !buyFlag ? (
                <>
                  <View style={styles.mailSentBox}>
                    <Text style={styles.mailSentTxt}>Payment Link has been sent to your email</Text>
                  </View>
                  <View style={styles.twoStepBox}>
                    <Text style={styles.twoStepTxt}>
                      Please complete the 2-step authentication on BSE Star MF to continue.
                    </Text>
                  </View>
                </>
              ) : (
                <TouchableOpacity style={styles.payBoxBtnDisabled} disabled>
                  <Text style={styles.payBoxBtnDisabledTxt}>Units allocation in Process</Text>
                </TouchableOpacity>
              )
            ) : null}

            {paymentBoxStatus === 'COMPLETED' ? (
              <TouchableOpacity style={styles.completeBoxBtn} disabled>
                <Text style={styles.completeBoxTxt}>Order Completed Successfully</Text>
              </TouchableOpacity>
            ) : null}

            {paymentBoxStatus === 'NEW' ? (
              <Text style={styles.paymentHintTxt}>Please wait while we refresh your order details.</Text>
            ) : null}
          </View>
        ) : (
          <StatusTimeline
            steps={timeline}
            timelineStatus={timelineStatus}
            loading={timelineActionLoading}
            paymentLoading={paymentLoading}
            onContinue={onTimelineContinue}
            onCancel={onTimelineCancel}
            formatDateTime={formatDateTime}
          />
        )}

        <Text style={styles.sectionTitle}>Order details</Text>
        <View style={styles.kvCard}>
          <View style={styles.kvRow}>
            <Text style={styles.kvLabel}>Placed on</Text>
            <Text style={styles.kvVal}>{formatDateTime(pickOrderDate(order))}</Text>
          </View>
          {pickFolio(order) ? (
            <View style={styles.kvRow}>
              <Text style={styles.kvLabel}>Folio no.</Text>
              <Text style={styles.kvVal}>{pickFolio(order)}</Text>
            </View>
          ) : null}
          {pickOrderIdDisplay(order) != null ? (
            <View style={styles.kvRow}>
              <Text style={styles.kvLabel}>Order ID</Text>
              <Text style={styles.kvVal} selectable>
                {String(pickOrderIdDisplay(order))}
              </Text>
            </View>
          ) : null}
        </View>

        <TouchableOpacity style={styles.helpRow} activeOpacity={0.7} onPress={onNeedHelp}>
          <View style={styles.helpIconWrap}>
            <Text style={styles.helpIconTxt}>?</Text>
          </View>
          <Text style={[Textstyles.medium, styles.helpTxt]}>Need Help?</Text>
          <Text style={styles.chev}>›</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

function getOrderDetailStyles(colors, isDark) {
  const c = colors;
  return StyleSheet.create({
  safe: {flex: 1, backgroundColor: c.background},
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 6,
    minHeight: 44,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: c.border,
    backgroundColor: c.background,
  },
  topBarSide: {width: 88, height: 44, justifyContent: 'center'},
  topBarSideLeft: {alignItems: 'flex-start'},
  topBarSideRight: {alignItems: 'flex-end'},
  navTitle: {flex: 1, ...Textstyles.heading, fontSize: 18, color: c.textPrimary, textAlign: 'center'},
  topRightSpacer: {width: 72},
  refreshBtn: {
    minWidth: 72,
    alignItems: 'flex-end',
    justifyContent: 'center',
    paddingVertical: 4,
    paddingLeft: 4,
  },
  refreshBtnTxt: {
    color: c.textPrimary,
    fontSize: 14,
    ...Textstyles.medium,
  },
  scroll: {padding: 16, paddingBottom: 40},
  summaryCard: {
    backgroundColor: c.card,
    borderRadius: radius.cardLarge,
    borderWidth: 1,
    borderColor: c.border,
    padding: 16,
    marginBottom: 12,
  },
  summaryTop: {flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start'},
  summaryLeft: {flex: 1, marginRight: 12},
  summaryHead: {fontSize: 14, color: c.textSecondary, marginBottom: 6},
  summaryAmt: {...Textstyles.medium, fontSize: 28, color: c.textPrimary, fontWeight: '500'},
  typePill: {
    alignSelf: 'flex-start',
    marginTop: 10,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    backgroundColor: '#E8F0FE',
  },
  typePillTxt: {...Textstyles.medium, fontSize: 13, color: c.primary, fontWeight: '500'},
  summaryIconWrap: {justifyContent: 'center'},
  statusCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusCircleOk: {backgroundColor: '#DCFCE7'},
  statusCircleFail: {backgroundColor: '#FEE2E2'},
  clockIconImg: {width: 22, height: 22},
  statusCirclePending: {backgroundColor: '#FEF3C7'},
  statusIconTxt: {...Textstyles.medium, fontSize: 22, color: '#15803D', fontWeight: '500'},
  statusIconImg: {width: 22, height: 22},
  clockTxt: {fontSize: 22},
  fundCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: c.card,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: c.border,
    padding: 12,
    marginBottom: 12,
  },
  fundLogo: {width: 40, height: 40, borderRadius: 8, marginRight: 12},
  fundLogoPh: {
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  fundLogoLetter: {...Textstyles.medium, fontSize: 16, fontWeight: '500', color: c.primary},
  fundName: {flex: 1, ...Textstyles.medium, fontSize: 15, fontWeight: '600', color: c.textPrimary},
  chev: {...Textstyles.normal, fontSize: 22, color: c.textSecondary, fontWeight: '300'},
  dateRow: {flexDirection: 'row', marginBottom: 12},
  dateHalf: {flex: 1, paddingRight: 8},
  dateLabel: {fontSize: 12, color: c.textSecondary, marginBottom: 4},
  dateVal: {...Textstyles.medium, fontSize: 14, fontWeight: '600', color: c.textPrimary},
  notice: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFBEB',
    borderRadius: radius.input,
    borderWidth: 1,
    borderColor: '#FDE68A',
    padding: 12,
    marginBottom: 16,
  },
  noticeIcon: {fontSize: 18, marginRight: 8},
  noticeTxt: {flex: 1, fontSize: 13, color: '#92400E', lineHeight: 18},
  continueBtn: {
    backgroundColor: '#16A34A',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    marginBottom: 14,
  },
  continueTxt: {...Textstyles.medium, fontSize: 15, color: '#FFFFFF', fontWeight: '500'},
  tlActionWrap: {
    alignItems: 'flex-end',
    justifyContent: 'flex-start',
    paddingLeft: 8,
    paddingTop: 2,
  },
  authActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cancelBtn: {
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 14,
    alignItems: 'center',
    backgroundColor: isDark ? c.border : '#F3F4F6',
    borderWidth: 1,
    borderColor: c.border,
    marginRight: 10,
  },
  cancelTxt: {...Textstyles.medium, fontSize: 14, color: c.textPrimary, fontWeight: '500'},
  payNowBtn: {
    backgroundColor: '#22C55E',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    marginBottom: 14,
  },
  payNowTxt: {...Textstyles.medium, fontSize: 15, color: '#FFFFFF', fontWeight: '500'},
  statusLoadingRow: {
    paddingVertical: 8,
    paddingHorizontal: 10,
    marginBottom: 10,
  },
  statusLoadingTxt: {fontSize: 12, color: c.textSecondary},
  sectionTitle: {...Textstyles.heading, fontSize: 15, fontWeight: '700', color: c.textPrimary, marginBottom: 10},
  timelineCard: {
    backgroundColor: c.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: c.border,
    padding: 16,
    marginBottom: 16,
  },
  paymentBoxCard: {
    backgroundColor: c.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: c.border,
    padding: 16,
    marginBottom: 16,
  },
  authBoxBtn: {
    backgroundColor: '#4F46E5',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    marginBottom: 14,
  },
  authBoxTxt: {...Textstyles.medium, fontSize: 15, color: '#FFFFFF', fontWeight: '500'},
  payBoxBtn: {
    backgroundColor: '#1E81F2',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    marginBottom: 14,
  },
  payBoxTxt: {...Textstyles.medium, fontSize: 15, color: '#FFFFFF', fontWeight: '500'},
  payBoxBtnDisabled: {
    backgroundColor: '#93C5FD',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    marginBottom: 14,
    opacity: 0.7,
  },
  payBoxBtnDisabledTxt: {...Textstyles.medium, fontSize: 15, color: '#FFFFFF', fontWeight: '500'},
  mailSentBox: {
    backgroundColor: '#ECFFF5',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#9CE5BE',
    padding: 12,
    marginBottom: 10,
  },
  mailSentTxt: {...Textstyles.medium, fontSize: 14, color: '#15803D', fontWeight: '500', textAlign: 'center'},
  twoStepBox: {
    backgroundColor: '#FFFBEB',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#FDE68A',
    padding: 12,
  },
  twoStepTxt: {...Textstyles.medium, fontSize: 13, color: '#92400E', fontWeight: '600', lineHeight: 18},
  completeBoxBtn: {
    backgroundColor: '#22C55E',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    marginBottom: 14,
  },
  completeBoxTxt: {...Textstyles.medium, fontSize: 15, color: '#FFFFFF', fontWeight: '500'},
  paymentHintTxt: {fontSize: 13, color: c.textSecondary, lineHeight: 18},
  // Payment mode modal (website parity)
  modalHeaderRow: {flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 2},
  modalHeaderArrow: {...Textstyles.medium, fontSize: 22, color: c.textPrimary, fontWeight: '500'},
  modalSubTitle: {...Textstyles.medium, fontSize: 13, color: c.textSecondary, marginBottom: 14, fontWeight: '600'},
  modalOptionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: c.border,
    paddingVertical: 14,
    paddingHorizontal: 14,
    backgroundColor: c.card,
    marginBottom: 10,
  },
  modalOptionRowActive: {
    borderColor: '#1E81F2',
    backgroundColor: '#F0F7FF',
  },
  modalOptionIcon: {fontSize: 22, width: 34, textAlign: 'center'},
  modalOptionMain: {...Textstyles.medium, fontSize: 15, fontWeight: '500', color: c.textPrimary, marginBottom: 2},
  modalOptionSub: {...Textstyles.medium, fontSize: 13, color: c.textSecondary, fontWeight: '600'},
  modalOptionChevron: {...Textstyles.medium, fontSize: 20, color: c.textPrimary, fontWeight: '500', marginLeft: 8},
  modalContinuePrimaryBtn: {
    backgroundColor: '#1E81F2',
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  modalContinuePrimaryTxt: {...Textstyles.medium, fontSize: 16, color: '#FFFFFF', fontWeight: '500'},
  modalBackRow: {flexDirection: 'row', alignItems: 'center', marginBottom: 10},
  modalBackIcon: {width: 18, height: 18, marginRight: 6, tintColor: c.textPrimary},
  modalBackTxt: {...Textstyles.medium, fontSize: 15, color: '#1E81F2', fontWeight: '500'},
  modalCloseBtn: {
    position: 'absolute',
    top: 10,
    right: 10,
    zIndex: 2,
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(0,0,0,0.04)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalCloseTxt: {...Textstyles.medium, fontSize: 16, fontWeight: '500', color: c.textPrimary},
  paymentModeCard: {
    backgroundColor: '#F1F5F9',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: c.border,
    marginBottom: 12,
  },
  paymentModeTitle: {...Textstyles.heading, fontSize: 16, fontWeight: '700', color: c.textPrimary, marginBottom: 6},
  paymentModeHint: {...Textstyles.medium, fontSize: 13, color: c.textSecondary, fontWeight: '500', marginBottom: 8},
  utrInput: {
    borderWidth: 1,
    borderColor: c.border,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 12,
    fontSize: 14,
    backgroundColor: c.card,
    color: c.textPrimary,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
    alignItems: 'stretch',
    padding: 0,
  },
  modalSheet: {
    backgroundColor: c.card,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
    padding: 16,
    paddingTop: 42, // room for top-right close button
    width: '100%',
  },
  modalSheetInner: {
    paddingTop: 8,
  },
  modalTitle: {...Textstyles.heading, fontSize: 15, fontWeight: '700', color: c.textPrimary, marginBottom: 12},
  modalSection: {marginTop: 12, marginBottom: 6},
  modalHintTxt: {...Textstyles.medium, fontSize: 12, color: c.textSecondary, marginBottom: 8, fontWeight: '600'},
  upiInput: {
    borderWidth: 1,
    borderColor: c.border,
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    fontSize: 14,
    backgroundColor: '#F9FAFB',
  },
  modalOptionBtn: {
    borderWidth: 1,
    borderColor: c.border,
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 12,
    alignItems: 'center',
    marginBottom: 10,
    backgroundColor: c.card,
  },
  modalOptionBtnActive: {
    borderColor: '#1E81F2',
    backgroundColor: '#EAF3FF',
  },
  modalOptionTxt: {...Textstyles.medium, fontSize: 15, fontWeight: '500', color: c.textPrimary},
  modalActions: {flexDirection: 'row', marginTop: 10},
  modalSecondaryBtn: {
    flex: 1,
    backgroundColor: isDark ? c.border : '#F3F4F6',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    marginRight: 12,
  },
  modalSecondaryTxt: {fontSize: 14, fontWeight: '500', color: '#374151'},
  modalPrimaryBtn: {
    flex: 1,
    backgroundColor: '#1E81F2',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
  },
  modalPrimaryTxt: {fontSize: 14, fontWeight: '500', color: '#FFFFFF'},
  kvCard: {
    backgroundColor: c.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: c.border,
    padding: 4,
    marginBottom: 16,
  },
  kvRow: {
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    backgroundColor: isDark ? c.border : '#F3F4F6',
  },
  kvLabel: {fontSize: 12, color: c.textSecondary, marginBottom: 4},
  kvVal: {fontSize: 15, fontWeight: '600', color: c.textPrimary},
  helpRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: c.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: c.border,
    padding: 14,
  },
  helpIconWrap: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: isDark ? '#2C2C2C' : '#E5E7EB',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  helpIconTxt: {fontSize: 14, fontWeight: '500', color: c.textSecondary},
  helpTxt: {flex: 1, fontSize: 15, color: c.primary},
  missing: {flex: 1, justifyContent: 'center', alignItems: 'center'},
  missingTxt: {color: c.textSecondary},
});
}
