import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  TextInput,
  ActivityIndicator,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  AppState,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useFocusEffect, useNavigation, useRoute} from '@react-navigation/native';
import DatePicker from 'react-native-date-picker';
import {useDispatch, useSelector} from 'react-redux';
import {useFundData} from '../../hooks/useFundData';
import {useMandateData} from '../../hooks/useMandateData';
import {
  authenticateOrder,
  buildOrderPlacePayload,
  buildSipRegisterPayload,
  createSipRegistration,
  createSingleOrder,
  extractOrderId,
  extractOrderAuthUrl,
  fetchOrderStatus,
  fetchOrderList,
  processOrderPayment,
  isAuthenticatedOrderState,
} from '../../services/ordersService';
import {addToCart, selectCartItemCount} from '../../store/slices/cartSlice';
import {navigateToCart} from '../../navigation/navigationRef';
import AppModal from '../../components/AppModal';
import AppBackButton from '../../components/AppBackButton';
import Icons from '../../utils/icons';
import Textstyles from '../../utils/text';
import {useAppTheme} from '../../theme/useAppTheme';
import {pickMaxSipInvestment, pickMinSipInvestment} from '../../utils/schemeLimits';
import {typeScale} from '../../theme/typography';
import {appAlert} from '../../utils/appAlert';

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

/** e.g. "29 Dec 2025" */
function formatSipDateDisplay(d) {
  if (!(d instanceof Date) || Number.isNaN(d.getTime())) {
    return '—';
  }
  return d.toLocaleDateString('en-GB', {day: 'numeric', month: 'short', year: 'numeric'});
}

function isSipDateWithinAllowedRange(d) {
  if (!(d instanceof Date) || Number.isNaN(d.getTime())) {
    return false;
  }
  const day = d.getDate();
  return day >= 1 && day <= 28;
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

function stringifyApiValidationError(err) {
  const body = err?.data;
  const msg = err?.message;
  const skipped = new Set(['validation failed', 'validation error', 'bad request']);
  const keyMap = {
    amount: 'Amount',
    investment_amount: 'Amount',
    order_amount: 'Amount',
    sip_amount: 'SIP Amount',
    order_type: 'Order Type',
    frequency: 'SIP Frequency',
    sip_frequency: 'SIP Frequency',
    sip_date: 'SIP Date',
    installment_day: 'SIP Date',
    mandate: 'Mandate',
    mandate_id: 'Mandate',
    scheme: 'Fund',
    scheme_code: 'Fund',
    non_field_errors: 'Details',
    detail: 'Details',
  };

  const toFriendlyField = key => {
    const raw = String(key || '').trim();
    if (!raw) {
      return 'Details';
    }
    const byMap = keyMap[raw.toLowerCase()];
    if (byMap) {
      return byMap;
    }
    return raw
      .replace(/\./g, ' ')
      .replace(/_/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .replace(/\b\w/g, ch => ch.toUpperCase());
  };

  const normalizeText = value => String(value ?? '').replace(/\s+/g, ' ').trim();
  const toLine = (field, value) => `${toFriendlyField(field)}: ${normalizeText(value)}`;

  const collect = value => {
    if (!value) {
      return [];
    }
    if (Array.isArray(value)) {
      return value
        .map(v => normalizeText(v))
        .filter(Boolean)
        .filter(v => !skipped.has(v.toLowerCase()));
    }
    if (typeof value === 'string') {
      const cleaned = normalizeText(value);
      if (!cleaned || skipped.has(cleaned.toLowerCase())) {
        return [];
      }
      return [cleaned];
    }
    if (typeof value === 'object') {
      const out = [];
      Object.entries(value).forEach(([field, raw]) => {
        if (Array.isArray(raw)) {
          raw.forEach(item => {
            const cleaned = normalizeText(item);
            if (cleaned) {
              out.push(toLine(field, cleaned));
            }
          });
        } else if (raw && typeof raw === 'object') {
          Object.entries(raw).forEach(([sub, subRaw]) => {
            if (Array.isArray(subRaw)) {
              subRaw.forEach(item => {
                const cleaned = normalizeText(item);
                if (cleaned) {
                  out.push(toLine(`${field}.${sub}`, cleaned));
                }
              });
            } else if (subRaw != null) {
              const cleaned = normalizeText(subRaw);
              if (cleaned) {
                out.push(toLine(`${field}.${sub}`, cleaned));
              }
            }
          });
        } else if (raw != null) {
          const cleaned = normalizeText(raw);
          if (cleaned) {
            out.push(toLine(field, cleaned));
          }
        }
      });
      return out;
    }
    const cleaned = normalizeText(value);
    if (!cleaned || skipped.has(cleaned.toLowerCase())) {
      return [];
    }
    return [cleaned];
  };

  const details = Array.from(
    new Set([
      ...collect(body?.errors),
      ...collect(body?.error),
      ...collect(body?.detail),
      ...collect(body?.message && body?.message !== msg ? body.message : null),
      ...collect(body),
    ]),
  );

  if (details.length > 0) {
    return `Please fix:\n${details.join('\n')}`;
  }

  const cleanMsg = normalizeText(msg);
  if (cleanMsg && !skipped.has(cleanMsg.toLowerCase())) {
    return cleanMsg;
  }
  return 'Validation failed. Please check amount, SIP details, or mandate and try again.';
}

function extractStatusLookupId(resData) {
  if (resData == null) {
    return null;
  }
  const root = resData?.data ?? resData;
  const inner = root?.data ?? root;
  const id = inner?.id ?? root?.id;
  if (id == null || String(id).trim() === '') {
    return null;
  }
  return id;
}

function extractTransactionNumber(resData) {
  if (resData == null) {
    return null;
  }
  const root = resData?.data ?? resData;
  const inner = root?.data ?? root;
  const txn =
    inner?.transaction_number ??
    inner?.transactionNumber ??
    root?.transaction_number ??
    root?.transactionNumber;
  if (txn == null || String(txn).trim() === '') {
    return null;
  }
  return String(txn);
}

export default function FundInvestmentScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const dispatch = useDispatch();
  const {colors, isDark} = useAppTheme();
  const styles = useMemo(() => getFundInvestmentStyles(colors, isDark), [colors, isDark]);
  const cartCount = useSelector(selectCartItemCount);
  const user = useSelector(s => s.auth.user);

  const schemeCode =
    route.params?.schemeCode ?? route.params?.scheme_code ?? route.params?.code;
  const paramName = route.params?.schemeName ?? route.params?.scheme_name;
  const initialOrderType = route.params?.initialOrderType === 'SIP' ? 'SIP' : 'ONE_TIME';

  const {data: folioData, isLoading: loading, error} = useFundData(schemeCode);
  const {data: mandateData, isPending: mandateLoading} = useMandateData();
  const fundInfo = useMemo(() => folioData?.schemeData ?? null, [folioData?.schemeData]);
  const logoUrl = folioData?.logo_url || fundInfo?.logo_url;
  const displayName = useMemo(
    () => fundInfo?.scheme_name || fundInfo?.base_scheme_name || paramName || 'Fund',
    [fundInfo?.base_scheme_name, fundInfo?.scheme_name, paramName],
  );
  const mandates = useMemo(
    () =>
      (mandateData?.results ?? []).filter(item => {
        const status = String(item?.status ?? '').toUpperCase();
        return status === 'ACTIVE';
      }),
    [mandateData?.results],
  );

  const [orderType, setOrderType] = useState(initialOrderType);
  const [orderAmount, setOrderAmount] = useState('');
  const [amountError, setAmountError] = useState(null);
  const [sipFrequency, setSipFrequency] = useState('Monthly');
  const [sipDurationYears, setSipDurationYears] = useState('1');
  const [sipDate, setSipDate] = useState(() => new Date());
  const [showSipDatePicker, setShowSipDatePicker] = useState(false);
  const [mandateModalVisible, setMandateModalVisible] = useState(false);
  const [freqModalVisible, setFreqModalVisible] = useState(false);
  const [selectedMandate, setSelectedMandate] = useState(null);
  const [pendingOrderId, setPendingOrderId] = useState(null);
  const [pendingStatusLookupId, setPendingStatusLookupId] = useState(null);
  const [pendingTransactionNumber, setPendingTransactionNumber] = useState(null);
  const [pendingOrderAmount, setPendingOrderAmount] = useState(null);
  const [pendingGatewayUrl, setPendingGatewayUrl] = useState('');
  const [placingOrder, setPlacingOrder] = useState(false);
  const [authLoading, setAuthLoading] = useState(false);
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [readyForPayment, setReadyForPayment] = useState(false);
  const [paymentModeModalVisible, setPaymentModeModalVisible] = useState(false);
  const [selectedPaymentMode, setSelectedPaymentMode] = useState(null);
  const [upiVpa, setUpiVpa] = useState('');
  const [neftUtr, setNeftUtr] = useState('');
  const waitingAuthReturnRef = useRef(false);

  const minLumpsum = Number(fundInfo?.min_purchase_amount) || 500;
  const minSip = useMemo(() => pickMinSipInvestment(fundInfo), [fundInfo]);
  const maxSip = useMemo(() => pickMaxSipInvestment(fundInfo), [fundInfo]);
  const minOrderAmount = orderType === 'SIP' ? minSip : minLumpsum;
  const selectedMandateLabel = selectedMandate
    ? pickMandateLabel(selectedMandate)
    : 'Select your preferred mandate option';

  useEffect(() => {
    if (mandates.length === 0) {
      setSelectedMandate(null);
      return;
    }
    const selectedId = selectedMandate?.id ?? selectedMandate?.mandate_id;
    const exists = mandates.some(m => (m?.id ?? m?.mandate_id) === selectedId);
    if (!exists) {
      setSelectedMandate(mandates[0]);
    }
  }, [mandates, selectedMandate]);

  const parseOrderAmount = useCallback(() => {
    const parsed = Number(String(orderAmount).replace(/[^0-9]/g, ''));
    return Number.isFinite(parsed) ? Math.round(parsed) : 0;
  }, [orderAmount]);

  const validateAmountForSubmit = useCallback(() => {
    const raw = parseOrderAmount();
    if (!raw || raw <= 0) {
      setAmountError('Enter a valid amount');
      return null;
    }
    if (orderType === 'SIP') {
      if (raw < minSip) {
        setAmountError(`Minimum investment is ${safeInr(minSip)}`);
        return null;
      }
      if (raw > maxSip) {
        setAmountError(`Maximum investment is ${safeInr(maxSip)}`);
        return null;
      }
    } else if (raw < minLumpsum) {
      setAmountError(`Minimum investment is ${safeInr(minLumpsum)}`);
      return null;
    }
    setAmountError(null);
    return raw;
  }, [orderType, parseOrderAmount, minSip, maxSip, minLumpsum]);

  const onTapQuickAmount = useCallback(
    v => {
      let n = v;
      if (orderType === 'SIP') {
        n = Math.min(maxSip, Math.max(minSip, v));
      }
      setOrderAmount(String(n));
      setAmountError(null);
    },
    [orderType, minSip, maxSip],
  );

  const openCart = useCallback(() => {
    navigateToCart(navigation);
  }, [navigation]);

  const onAddToCart = useCallback(() => {
    if (!fundInfo?.scheme_code) {
      appAlert('Error', 'Fund data not loaded');
      return;
    }
    const raw = validateAmountForSubmit();
    if (raw == null) {
      return;
    }
    const amount = raw;
    if (orderType === 'SIP' && !isSipDateWithinAllowedRange(sipDate)) {
      appAlert('Invalid SIP date', 'SIP date must be between 1 and 28.');
      return;
    }
    if (orderType === 'SIP' && !selectedMandate && mandates.length > 0) {
      appAlert('Select mandate', 'Please choose a mandate for SIP.');
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
    appAlert('Cart', `${displayName} added to cart`);
  }, [
    dispatch,
    displayName,
    fundInfo,
    logoUrl,
    mandates.length,
    validateAmountForSubmit,
    orderType,
    selectedMandate,
    selectedMandateLabel,
    sipDate,
    sipDurationYears,
    sipFrequency,
  ]);

  const onPlaceOrder = useCallback(async () => {
    if (!fundInfo?.scheme_code) {
      appAlert('Order', 'Fund details not available.');
      return;
    }
    const raw = validateAmountForSubmit();
    if (raw == null) {
      return;
    }
    const amount = raw;
    if (orderType === 'SIP' && !isSipDateWithinAllowedRange(sipDate)) {
      appAlert('Invalid SIP date', 'SIP date must be between 1 and 28.');
      return;
    }
    if (orderType === 'SIP' && !selectedMandate && mandates.length > 0) {
      appAlert('Select mandate', 'Please choose a mandate for SIP.');
      return;
    }
    try {
      setPlacingOrder(true);
      const payload =
        orderType === 'SIP'
          ? buildSipRegisterPayload({
              schemeCode: fundInfo.scheme_code,
              amount,
              sipFrequency,
              sipDate: formatDDMMYYYY(sipDate),
              sipDurationYears: Number(sipDurationYears),
            })
          : buildOrderPlacePayload({
              schemeCode: fundInfo.scheme_code,
              amount,
              isSip: false,
              mandateId: selectedMandate?.id ?? selectedMandate?.mandate_id,
            });
      console.log('[FundInvestment:onPlaceOrder] request payload', payload);
      const res =
        orderType === 'SIP'
          ? await createSipRegistration(payload)
          : await createSingleOrder(payload);
      console.log('[FundInvestment:onPlaceOrder] raw response', res);
      const orderId = extractOrderId(res?.data);
      const statusLookupId = extractStatusLookupId(res?.data);
      const transactionNumber = extractTransactionNumber(res?.data);
      const directAuthUrl = extractOrderAuthUrl(res?.data);
      console.log('[FundInvestment:onPlaceOrder] parsed result', {
        orderId,
        statusLookupId,
        transactionNumber,
        directAuthUrl,
        responseData: res?.data,
      });
      if (directAuthUrl) {
        setPendingGatewayUrl(directAuthUrl);
      }
      if (orderId) {
        setPendingOrderId(orderId);
        setPendingStatusLookupId(statusLookupId);
        setPendingTransactionNumber(transactionNumber);
        setPendingOrderAmount(amount);
        setReadyForPayment(false);
        appAlert('Order placed', 'Please tap "Authenticate & Continue" to complete payment.');
      } else {
        const fallbackAuthUrl = extractOrderAuthUrl(res?.data);
        if (fallbackAuthUrl) {
          navigation.navigate('MandateAuthWebview', {
            uri: fallbackAuthUrl,
            title: 'Authenticate order',
          });
        } else {
          appAlert(
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
      console.error('[FundInvestment:onPlaceOrder] error', {
        message: e?.message,
        status: e?.status,
        endpoint: e?.endpoint,
        method: e?.method,
        data: e?.data,
      });
      appAlert('Order failed', stringifyApiValidationError(e));
    } finally {
      console.log('[FundInvestment:onPlaceOrder] finished');
      setPlacingOrder(false);
    }
  }, [
    fundInfo,
    navigation,
    orderType,
    validateAmountForSubmit,
    selectedMandate,
    mandates.length,
    sipFrequency,
    sipDate,
    sipDurationYears,
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
        waitingAuthReturnRef.current = true;
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
        setReadyForPayment(true);
        waitingAuthReturnRef.current = true;
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
      appAlert('Authenticate failed', msg || 'Could not start authentication.');
    } finally {
      setAuthLoading(false);
    }
  }, [navigation, pendingGatewayUrl, pendingOrderId]);

  const checkOrderStatusAfterAuthReturn = useCallback(async () => {
    let lookupId = pendingStatusLookupId;
    if (!lookupId && (pendingOrderId || pendingTransactionNumber)) {
      try {
        const listRes = await fetchOrderList({page: 1, page_size: 50});
        const rows = listRes?.data?.results ?? listRes?.data?.data?.results ?? [];
        const matched = rows.find(row => {
          const byOrderId = pendingOrderId != null && String(row?.order_id) === String(pendingOrderId);
          const byTxn =
            pendingTransactionNumber != null &&
            String(row?.transaction_number ?? '') === String(pendingTransactionNumber);
          return byOrderId || byTxn;
        });
        if (matched?.id != null && String(matched.id).trim() !== '') {
          lookupId = matched.id;
          setPendingStatusLookupId(matched.id);
          console.log('[FundInvestment:statusCheck] resolved lookup id from order list', {
            id: matched.id,
            order_id: matched?.order_id,
            transaction_number: matched?.transaction_number,
          });
        }
      } catch (listErr) {
        console.log('[FundInvestment:statusCheck] list resolve failed', {
          message: listErr?.message,
          status: listErr?.status,
        });
      }
    }
    if (!lookupId) {
      appAlert('Status check failed', 'Could not find order id for status check. Please open My Orders.');
      return false;
    }
    try {
      console.log('[FundInvestment:statusCheck] request', {id: lookupId});
      const res = await fetchOrderStatus(lookupId);
      const root = res?.data?.data ?? res?.data ?? {};
      const detail = root?.order ?? root?.result ?? root?.data ?? root;
      const statusRaw =
        detail?.status ??
        detail?.order_status ??
        detail?.orderStatus ??
        root?.status ??
        root?.order_status ??
        root?.message;
      console.log('[FundInvestment:statusCheck] response', {
        id: lookupId,
        statusRaw,
        detail,
      });
      if (isAuthenticatedOrderState(statusRaw)) {
        setReadyForPayment(true);
        return true;
      }
      setReadyForPayment(false);
      appAlert(
        'Authentication pending',
        'Order is not authenticated yet. Please check in My Orders.',
        [
          {text: 'My Orders', onPress: () => navigation.navigate('MyOrders')},
          {text: 'OK'},
        ],
      );
      return false;
    } catch (e) {
      console.error('[FundInvestment:statusCheck] error', {
        id: lookupId,
        message: e?.message,
        status: e?.status,
        endpoint: e?.endpoint,
        data: e?.data,
      });
      appAlert('Status Check', 'Please check this order in My Orders.', [
        {text: 'My Orders', onPress: () => navigation.navigate('MyOrders')},
        {text: 'OK'},
      ]);
      return false;
    }
  }, [navigation, pendingOrderId, pendingStatusLookupId, pendingTransactionNumber]);

  useEffect(() => {
    const sub = AppState.addEventListener('change', nextState => {
      if (nextState !== 'active') {
        return;
      }
      if (!waitingAuthReturnRef.current) {
        return;
      }
      checkOrderStatusAfterAuthReturn().finally(() => {
        waitingAuthReturnRef.current = false;
      });
    });
    return () => {
      sub.remove();
    };
  }, [checkOrderStatusAfterAuthReturn]);

  useFocusEffect(
    useCallback(() => {
      if (!waitingAuthReturnRef.current) {
        return undefined;
      }
      console.log('[FundInvestment:statusCheck] triggered by screen focus');
      checkOrderStatusAfterAuthReturn().finally(() => {
        waitingAuthReturnRef.current = false;
      });
      return undefined;
    }, [checkOrderStatusAfterAuthReturn]),
  );

  const onPaymentConfirmationPress = useCallback(async () => {
    if (paymentLoading) {
      return;
    }
    setPaymentLoading(true);
    try {
      const ok = await checkOrderStatusAfterAuthReturn();
      if (ok) {
        setPaymentModeModalVisible(true);
      }
    } finally {
      setPaymentLoading(false);
    }
  }, [checkOrderStatusAfterAuthReturn, paymentLoading]);

  const onPayNow = useCallback(async (mode, neftReferenceOverride = '') => {
    const orderNumber = pendingOrderId;
    const totalAmount = Number(pendingOrderAmount ?? parseOrderAmount() ?? 0);
    const clientCode = user?.client_code ?? user?.ucc_code ?? user?.ucc;
    if (!orderNumber || !clientCode || !totalAmount || !mode) {
      appAlert('Pay now', 'Payment details are incomplete.');
      return;
    }
    try {
      setPaymentLoading(true);
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
      const paymentUrl = extractOrderAuthUrl(res?.data);
      if (apiStatus === 'pending') {
        appAlert('Payment', responseString || 'Payment is pending. Please try again.');
        return;
      }
      if (paymentUrl) {
        setPaymentModeModalVisible(false);
        setSelectedPaymentMode(null);
        navigation.navigate('MandateAuthWebview', {
          uri: paymentUrl,
          title: 'Complete payment',
        });
      } else {
        appAlert('Payment', responseString || 'Payment gateway URL not found.');
      }
    } catch (e) {
      appAlert('Payment failed', String(e?.message || 'Could not start payment.'));
    } finally {
      setPaymentLoading(false);
    }
  }, [navigation, parseOrderAmount, pendingOrderAmount, pendingOrderId, upiVpa, user]);

  const onContinuePaymentMode = useCallback(async () => {
    if (!selectedPaymentMode) {
      appAlert('Payment', 'Please select a payment mode.');
      return;
    }
    if (selectedPaymentMode === 'UPI') {
      const v = String(upiVpa || '').trim();
      if (!v.includes('@') || v.length < 5) {
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
    await onPayNow(selectedPaymentMode, selectedPaymentMode === 'NEFT' ? neftUtr : '');
  }, [neftUtr, onPayNow, selectedPaymentMode, upiVpa]);

  const onConfirmSipDate = useCallback(date => {
    if (!isSipDateWithinAllowedRange(date)) {
      setShowSipDatePicker(false);
      setTimeout(() => {
        appAlert('Invalid SIP date', 'SIP date must be between 1 and 28.');
      }, 0);
      return;
    }
    setSipDate(date);
    setShowSipDatePicker(false);
  }, []);

  const onCancelSipDate = useCallback(() => {
    setShowSipDatePicker(false);
  }, []);

  const primaryCtaLabel = useMemo(() => {
    if (placingOrder) {
      return 'Placing order...';
    }
    return orderType === 'SIP' ? 'Start SIP' : 'Continue to Invest';
  }, [orderType, placingOrder]);

  const onPrimaryCtaPress = useCallback(() => {
    console.log('[FundInvestment:primaryCta] clicked', {
      label: primaryCtaLabel,
      orderType,
      placingOrder,
      schemeCode: fundInfo?.scheme_code ?? schemeCode,
    });
    onPlaceOrder();
  }, [fundInfo?.scheme_code, onPlaceOrder, orderType, placingOrder, primaryCtaLabel, schemeCode]);

  if (!schemeCode) {
    return (
      <SafeAreaView style={[styles.safe, {backgroundColor: colors.background}]} edges={['top', 'left', 'right', 'bottom']}>
        <View style={styles.center}>
          <Text style={styles.err}>Missing scheme code</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (loading && !folioData) {
    return (
      <SafeAreaView style={[styles.safe, {backgroundColor: colors.background}]} edges={['top', 'left', 'right', 'bottom']}>
        <View style={styles.center}>
          <ActivityIndicator size="small" color={colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  if (error || !fundInfo?.scheme_code) {
    return (
      <SafeAreaView style={[styles.safe, {backgroundColor: colors.background}]} edges={['top', 'left', 'right', 'bottom']}>
        <View style={styles.center}>
          <Text style={styles.err}>{error || 'Could not load fund'}</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.safe, {backgroundColor: colors.background}]} edges={['top', 'left', 'right', 'bottom']}>
      <KeyboardAvoidingView
        style={styles.flex1}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          bounces={false}>
          <View style={styles.headerRow}>
            <AppBackButton onPress={() => navigation.goBack()} hitSlop={14} style={styles.backHit} />
            <TouchableOpacity onPress={openCart} hitSlop={12} style={styles.cartHit}>
              <View style={styles.cartWrap}>
                <Image source={Icons.CartIcon} style={styles.cartIconImg} resizeMode="contain" />
                {cartCount > 0 ? (
                  <View style={styles.badge}>
                    <Text style={styles.badgeTxt}>{cartCount > 99 ? '99+' : cartCount}</Text>
                  </View>
                ) : null}
              </View>
            </TouchableOpacity>
          </View>
          <Text style={styles.screenTitle} numberOfLines={3}>
            {displayName}
          </Text>

          {pendingOrderId ? (
            <View style={styles.card}>
              <View style={styles.authSummaryWrap}>
                <Text style={styles.authSummaryLabel}>Order Amount</Text>
                <Text style={styles.authSummaryAmount}>{safeInr(pendingOrderAmount ?? minOrderAmount)}</Text>
                {!readyForPayment ? (
                  <TouchableOpacity
                    style={styles.authContinueBtn}
                    onPress={onAuthenticateAndContinue}
                    activeOpacity={0.9}
                    disabled={authLoading}>
                    <Text style={styles.authContinueTxt}>
                      {authLoading ? 'Authenticating...' : 'Authenticate & Continue'}
                    </Text>
                  </TouchableOpacity>
                ) : null}
                {readyForPayment ? (
                  <TouchableOpacity
                    style={styles.payNowPrimaryBtn}
                    onPress={onPaymentConfirmationPress}
                    activeOpacity={0.9}
                    disabled={paymentLoading}>
                    <Text style={styles.payNowPrimaryTxt}>
                      {paymentLoading ? 'Starting payment...' : 'Payment Confirmation'}
                    </Text>
                  </TouchableOpacity>
                ) : null}
              </View>
            </View>
          ) : (
            <View style={styles.card}>
              <View style={styles.orderTabs}>
                <TouchableOpacity
                  style={[styles.orderTabBtn, orderType === 'ONE_TIME' && styles.orderTabBtnActive]}
                  activeOpacity={0.85}
                  onPress={() => {
                    setOrderType('ONE_TIME');
                    setAmountError(null);
                  }}>
                  <Text style={[styles.orderTabTxt, orderType === 'ONE_TIME' && styles.orderTabTxtActive]}>
                    One-time
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.orderTabBtn, orderType === 'SIP' && styles.orderTabBtnActive]}
                  activeOpacity={0.85}
                  onPress={() => {
                    setOrderType('SIP');
                    setAmountError(null);
                  }}>
                  <Text style={[styles.orderTabTxt, orderType === 'SIP' && styles.orderTabTxtActive]}>SIP</Text>
                </TouchableOpacity>
              </View>

              <View style={[styles.amountInputWrap, amountError ? styles.amountInputWrapErr : null]}>
                <Text style={styles.amountCurrency}>₹</Text>
                <TextInput
                  style={styles.amountInput}
                  value={orderAmount}
                  onChangeText={t => {
                    setOrderAmount(t.replace(/[^0-9]/g, '').slice(0, 12));
                    setAmountError(null);
                  }}
                  keyboardType="number-pad"
                  maxLength={12}
                  placeholder="Enter Amount"
                  placeholderTextColor="#9CA3AF"
                />
              </View>
              {amountError ? <Text style={styles.amountErrTxt}>{amountError}</Text> : null}
              {!amountError && orderType === 'SIP' ? (
                <Text style={styles.amountHintTxt}>
                  SIP amount: {safeInr(minSip)} – {safeInr(maxSip)}
                </Text>
              ) : null}
              {!amountError && orderType === 'ONE_TIME' ? (
                <Text style={styles.amountHintTxt}>Minimum one-time: {safeInr(minLumpsum)}</Text>
              ) : null}

              <View style={[styles.quickAmountRow, amountError ? styles.quickRowAfterErr : null]}>
                {[500, 1000, 2000].map(v => (
                  <TouchableOpacity
                    key={v}
                    style={styles.quickAmountChip}
                    onPress={() => onTapQuickAmount(v)}
                    activeOpacity={0.85}>
                    <Text style={styles.quickAmountChipTxt}>₹{v}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              {orderType === 'SIP' ? (
                <>
                <View style={{marginTop:10}}>
                  <Text style={styles.fieldLabel}>SIP frequency</Text>
                  <TouchableOpacity
                    style={styles.dropdownField}
                      onPress={() => setFreqModalVisible(true)}
                      activeOpacity={0.85}>
                      <Text style={styles.dropdownValue}>{sipFrequency}</Text>
                      <Image source={Icons.DropDown} style={styles.dropdownChevron} resizeMode="contain" />
                    </TouchableOpacity>
                  </View>

                  <Text style={[styles.fieldLabel, styles.fieldLabelSpaced]}>SIP date</Text>
                  <TouchableOpacity
                    style={styles.dropdownField}
                    onPress={() => setShowSipDatePicker(true)}
                    activeOpacity={0.85}>
                    <Text style={styles.dropdownValue}>{formatSipDateDisplay(sipDate)}</Text>
                    <Image source={Icons.CalendarOthers} style={styles.calendarIcon} resizeMode="contain" />
                  </TouchableOpacity>

                  <Text style={[styles.fieldLabel, styles.fieldLabelSpaced]}>SIP Duration (Years)</Text>
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

                  <TouchableOpacity
                    style={styles.mandateSelectCard}
                    activeOpacity={0.85}
                    onPress={() => setMandateModalVisible(true)}>
                    <View style={styles.mandateTextWrap}>
                      <Text style={styles.mandateTitle}>Choose Mandate Method</Text>
                      <Text style={styles.mandateSub} numberOfLines={2}>
                        {selectedMandateLabel}
                      </Text>
                    </View>
                    <Image source={Icons.GoIcon} style={styles.mandateArrow} resizeMode="contain" />
                  </TouchableOpacity>
                </>
              ) : null}

              <Text style={styles.minAmtHint}>
                {orderType === 'SIP'
                  ? `SIP range: ${safeInr(minSip)} – ${safeInr(maxSip)}`
                  : `Min amount: ${safeInr(minLumpsum)}`}
              </Text>
            </View>
          )}

          <TouchableOpacity style={styles.viewCart} onPress={openCart} activeOpacity={0.85}>
            <Text style={styles.viewCartTxt}>View cart →</Text>
          </TouchableOpacity>
          <View style={styles.scrollBottomPad} />
        </ScrollView>

        {!pendingOrderId ? (
          <View style={styles.footer}>
            <TouchableOpacity style={styles.addCartLink} onPress={onAddToCart} activeOpacity={0.85}>
              <Text style={styles.addCartLinkTxt}>Add to cart</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.primaryCta, placingOrder && styles.primaryCtaDisabled]}
              onPress={onPrimaryCtaPress}
              activeOpacity={0.92}
              disabled={placingOrder}>
              <Text style={[styles.primaryCtaTxt, Textstyles.medium]}>{primaryCtaLabel}</Text>
            </TouchableOpacity>
          </View>
        ) : null}
      </KeyboardAvoidingView>

      <AppModal
        visible={mandateModalVisible}
        onClose={() => setMandateModalVisible(false)}
        title="Select mandate"
        isBottomSheet
        maxHeight={'72%'}>
        {mandateLoading ? <ActivityIndicator color={colors.primary} style={styles.modalLoader} /> : null}
        {!mandateLoading && mandates.length === 0 ? (
          <Text style={styles.modalEmpty}>No active mandate found. Please add/activate mandate from Mandate screen.</Text>
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
      </AppModal>

      <AppModal
        visible={freqModalVisible}
        onClose={() => setFreqModalVisible(false)}
        title="SIP frequency"
        isBottomSheet={false}
        maxHeight={'55%'}>
        {['Monthly', 'Quarterly'].map(freq => (
          <TouchableOpacity
            key={freq}
            style={[styles.modalRow, sipFrequency === freq && styles.modalRowActive]}
            onPress={() => {
              setSipFrequency(freq);
              setFreqModalVisible(false);
            }}
            activeOpacity={0.9}>
            <Text style={[styles.modalRowTxt, sipFrequency === freq && styles.modalRowTxtActive]}>{freq}</Text>
          </TouchableOpacity>
        ))}
      </AppModal>

      <AppModal
        visible={paymentModeModalVisible}
        onClose={() => setPaymentModeModalVisible(false)}
        title="Payment Confirmation"
        isBottomSheet={false}
        maxHeight={'74%'}>
        <Text style={styles.paymentModeHint}>Select payment mode</Text>
        <TouchableOpacity
          style={[styles.modalRow, selectedPaymentMode === 'UPI' && styles.modalRowActive]}
          onPress={() => setSelectedPaymentMode('UPI')}
          activeOpacity={0.9}>
          <Text style={[styles.modalRowTxt, selectedPaymentMode === 'UPI' && styles.modalRowTxtActive]}>
            Send Payment Link via UPI
          </Text>
        </TouchableOpacity>
        {selectedPaymentMode === 'UPI' ? (
          <View style={styles.paymentInputWrap}>
            <TextInput
              value={upiVpa}
              onChangeText={setUpiVpa}
              autoCapitalize="none"
              keyboardType="email-address"
              placeholder="Enter UPI ID (name@bank)"
              placeholderTextColor={colors.textSecondary}
              style={styles.paymentInput}
            />
          </View>
        ) : null}

        <TouchableOpacity
          style={[styles.modalRow, selectedPaymentMode === 'NEFT' && styles.modalRowActive]}
          onPress={() => setSelectedPaymentMode('NEFT')}
          activeOpacity={0.9}>
          <Text style={[styles.modalRowTxt, selectedPaymentMode === 'NEFT' && styles.modalRowTxtActive]}>
            Send Payment Link via NEFT
          </Text>
        </TouchableOpacity>
        {selectedPaymentMode === 'NEFT' ? (
          <View style={styles.paymentInputWrap}>
            <TextInput
              value={neftUtr}
              onChangeText={setNeftUtr}
              autoCapitalize="characters"
              placeholder="Enter NEFT UTR / Reference"
              placeholderTextColor={colors.textSecondary}
              style={styles.paymentInput}
            />
          </View>
        ) : null}

        <TouchableOpacity
          style={[styles.modalRow, selectedPaymentMode === 'DIRECT' && styles.modalRowActive]}
          onPress={() => setSelectedPaymentMode('DIRECT')}
          activeOpacity={0.9}>
          <Text style={[styles.modalRowTxt, selectedPaymentMode === 'DIRECT' && styles.modalRowTxtActive]}>
            Pay Now (Gateway)
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.paymentPrimaryBtn, paymentLoading && styles.primaryCtaDisabled]}
          onPress={onContinuePaymentMode}
          activeOpacity={0.9}
          disabled={paymentLoading}>
          <Text style={styles.paymentPrimaryBtnTxt}>{paymentLoading ? 'Processing...' : 'Continue'}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.paymentCancelBtn}
          onPress={() => {
            setPaymentModeModalVisible(false);
            setSelectedPaymentMode(null);
          }}
          activeOpacity={0.85}>
          <Text style={styles.paymentCancelBtnTxt}>Close</Text>
        </TouchableOpacity>
      </AppModal>

      {showSipDatePicker ? (
        <DatePicker
          modal
          open={showSipDatePicker}
          date={sipDate}
          mode="date"
          minimumDate={new Date()}
          onConfirm={onConfirmSipDate}
          onCancel={onCancelSipDate}
        />
      ) : null}
    </SafeAreaView>
  );
}

function getFundInvestmentStyles(colors, isDark) {
  const c = colors;
  return StyleSheet.create({
  flex1: {flex: 1},
  safe: {flex: 1, backgroundColor: c.background},
  scrollContent: {paddingHorizontal: 16, paddingBottom: 8},
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4,
    minHeight: 44,
  },
  backHit: {width: 44, height: 44, alignItems: 'center', justifyContent: 'center'},
  cartHit: {width: 44, height: 44, alignItems: 'center', justifyContent: 'center'},
  iconBtn: {fontSize: typeScale.chevron + 2},
  cartWrap: {position: 'relative'},
  cartIconImg: {width: 22, height: 22, tintColor: isDark ? '#FFFFFF' : '#000000'},
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
  badgeTxt: {...Textstyles.medium, color: '#fff', fontSize: 10},
  screenTitle: {
    ...Textstyles.heading,
    fontSize: typeScale.title,
    lineHeight: 22,
    color: c.textPrimary,
    marginTop: 8,
    marginBottom: 16,
  },
  card: {
    backgroundColor: c.card,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: c.border,
    shadowColor: isDark ? 'transparent' : '#000',
    shadowOpacity: isDark ? 0 : 0.06,
    shadowRadius: 12,
    shadowOffset: {width: 0, height: 4},
    // elevation: 3,
  },
  orderTabs: {
    flexDirection: 'row',
    borderRadius: 15,
    backgroundColor: isDark ? '#2C2C2C' : '#E8EAED',
    padding: 4,
    marginBottom: 4,
    overflow: 'hidden',
  },
  orderTabBtn: {flex: 1, alignItems: 'center', paddingVertical: 12, borderRadius: 15},
  orderTabBtnActive: {backgroundColor: isDark ? 'rgba(226, 231, 237, 0.15)' : 'white'},
  orderTabTxt: {...Textstyles.medium, fontSize: typeScale.bodyMd, color: c.textSecondary, fontWeight: '600'},
  orderTabTxtActive: {color: c.primary},
  amountInputWrap: {
    marginTop: 16,
    borderWidth: 1,
    borderColor: c.border,
    borderRadius: 12,
    minHeight: 56,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    backgroundColor: c.inputBg,
  },
  amountInputWrapErr: {
    borderColor: '#DC2626',
    backgroundColor: isDark ? 'rgba(248,113,113,0.08)' : '#FFFBFB',
  },
  amountCurrency: {
    ...Textstyles.medium,
    fontSize: typeScale.amountCurrency,
    color: c.textSecondary,
    marginRight: 8,
    fontWeight: '600',
  },
  amountInput: {flex: 1, fontSize: typeScale.amountInput, color: c.textPrimary, paddingVertical: 10},
  amountErrTxt: {
    color: '#DC2626',
    fontSize: 13,
    marginTop: 8,
    marginLeft: 2,
  },
  amountHintTxt: {
    fontSize: 12,
    color: c.textSecondary,
    marginTop: 8,
    marginLeft: 2,
  },
  quickAmountRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
  },
  quickRowAfterErr: {
    marginTop: 12,
  },
  quickAmountChip: {
    borderWidth: 1,
    borderColor: c.primary,
    borderRadius: 10,
    paddingVertical: 12,
    width: '31%',
    alignItems: 'center',
    backgroundColor: c.card,
  },
  quickAmountChipTxt: {...Textstyles.medium, fontSize: typeScale.bodyMd, color: c.primary, fontWeight: '600'},
  fieldLabel: {...Textstyles.medium, fontSize: 14, color: c.textSecondary, fontWeight: '600', top:6, marginBottom: 8},
  fieldLabelSpaced: {marginTop: 16},
  dropdownField: {
    borderWidth: 1,
    borderColor: c.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    minHeight: 50,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: c.inputBg,
  },
  dropdownValue: {...Textstyles.medium, fontSize: typeScale.bodyLg, color: c.textPrimary, fontWeight: '500'},
  dropdownChevron: {width: 12, height: 12, tintColor: c.textSecondary},
  calendarIcon: {width: 18, height: 18, tintColor: c.textSecondary},
  sipOptionRow: {flexDirection: 'row', gap: 8, flexWrap: 'wrap'},
  inlineChip: {
    borderWidth: 1,
    borderColor: c.border,
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: c.inputBg,
    minWidth: 56,
    alignItems: 'center',
  },
  inlineChipOn: {backgroundColor: isDark ? 'rgba(96,165,250,0.12)' : '#EAF4FF', borderColor: c.primary},
  inlineChipTxt: {...Textstyles.medium, fontSize: 14, color: c.textPrimary, fontWeight: '600'},
  inlineChipTxtOn: {color: c.primary},
  mandateSelectCard: {
    marginTop: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: c.border,
    minHeight: 72,
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: c.inputBg,
  },
  mandateTitle: {...Textstyles.heading, fontSize: 15, color: c.textPrimary, fontWeight: '700'},
  mandateTextWrap: {flex: 1},
  mandateSub: {fontSize: 13, color: c.textSecondary, marginTop: 4},
  mandateArrow: {width: 12, height: 12, tintColor: c.textSecondary, marginLeft: 8},
  minAmtHint: {marginTop: 14, color: c.textSecondary, fontSize: 13},
  viewCart: {marginTop: 18, alignItems: 'center', paddingVertical: 8},
  viewCartTxt: {...Textstyles.medium, color: c.primary, fontSize: 16, fontWeight: '600'},
  scrollBottomPad: {height: 24},
  footer: {
    paddingHorizontal: 16,
    paddingTop: 10,
    backgroundColor: c.background,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: c.border,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    bottom:10
  },
  addCartLink: {
    flex: 1,
    minHeight: 54,
    borderRadius: 14,
    backgroundColor: c.card,
    borderWidth: 1,
    borderColor: c.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addCartLinkTxt: {...Textstyles.medium, fontSize: 16, color: c.primary, fontWeight: '600'},
  primaryCta: {
    minHeight: 54,
    borderRadius: 12,
    backgroundColor: '#22C55E',
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  },
  primaryCtaDisabled: {opacity: 0.65},
  primaryCtaTxt: {...Textstyles.heading, fontSize: typeScale.bodyLg, color: '#FFFFFF'},
  authSummaryWrap: {paddingVertical: 4},
  authSummaryLabel: {fontSize: 13, color: c.textSecondary, marginBottom: 6},
  authSummaryAmount: {
    ...Textstyles.medium,
    fontSize: typeScale.amountInput,
    color: c.textPrimary,
    fontWeight: '600',
    marginBottom: 16,
  },
  authContinueBtn: {
    borderRadius: 12,
    backgroundColor: c.primary,
    minHeight: 52,
    alignItems: 'center',
    justifyContent: 'center',
  },
  authContinueTxt: {...Textstyles.medium, fontSize: 16, color: '#FFFFFF', fontWeight: '600'},
  payNowPrimaryBtn: {
    marginTop: 12,
    borderRadius: 12,
    backgroundColor: '#22C55E',
    minHeight: 52,
    alignItems: 'center',
    justifyContent: 'center',
  },
  payNowPrimaryTxt: {...Textstyles.medium, fontSize: 16, color: '#FFFFFF', fontWeight: '600'},
  modalRoot: {flex: 1, justifyContent: 'flex-end'},
  modalDim: {...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.45)'},
  modalSheet: {
    backgroundColor: c.card,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    padding: 16,
    maxHeight: '70%',
  },
  modalTitle: {...Textstyles.heading, fontSize: 16, fontWeight: '700', color: c.textPrimary, marginBottom: 10},
  modalEmpty: {fontSize: 13, color: c.textSecondary, marginVertical: 10},
  modalRow: {paddingVertical: 12, paddingHorizontal: 10, borderRadius: 10, marginBottom: 6},
  modalRowActive: {backgroundColor: isDark ? 'rgba(96,165,250,0.12)' : '#EAF4FF'},
  modalRowTxt: {fontSize: 14, color: c.textPrimary},
  modalRowTxtActive: {...Textstyles.medium, color: c.primary, fontWeight: '600'},
  paymentModeHint: {fontSize: 13, color: c.textSecondary, marginBottom: 10},
  paymentInputWrap: {
    borderWidth: 1,
    borderColor: c.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    marginTop: -2,
    marginBottom: 10,
    backgroundColor: c.inputBg,
  },
  paymentInput: {minHeight: 42, color: c.textPrimary, fontSize: 14},
  paymentPrimaryBtn: {
    marginTop: 10,
    minHeight: 44,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: c.primary,
  },
  paymentPrimaryBtnTxt: {...Textstyles.medium, color: '#fff', fontSize: 14, fontWeight: '600'},
  paymentCancelBtn: {
    marginTop: 8,
    minHeight: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  paymentCancelBtnTxt: {...Textstyles.medium, color: c.textSecondary, fontSize: 14},
  modalLoader: {marginVertical: 12},
  center: {flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24},
  err: {color: '#B91C1C', textAlign: 'center', padding: 16},
});
}
