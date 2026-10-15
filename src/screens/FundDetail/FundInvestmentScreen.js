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
  Switch,
  Animated,
  Easing,
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
  getPaymentProcessErrorMessage,
} from '../../services/ordersService';
import {addToCart, selectCartItemCount} from '../../store/slices/cartSlice';
import {selectCanPostToBse} from '../../store/slices/authSlice';
import {navigateToCart} from '../../navigation/navigationRef';
import AppModal from '../../components/AppModal';
import AppBackButton from '../../components/AppBackButton';
import Icons from '../../utils/icons';
import Textstyles from '../../utils/text';
import {useAppTheme} from '../../theme/useAppTheme';
import {
  buildQuickAmounts,
  pickMaxPurchaseAmountOrNull,
  pickMaxSipInvestmentOrNull,
  pickMinLumpsumAmount,
  pickMinSipInvestment,
} from '../../utils/schemeLimits';
import {typeScale} from '../../theme/typography';
import {appAlert} from '../../utils/appAlert';
import {fetchCompanyProfileSettings, normalizeSipPlaceOrderDayDiff} from '../../services/companyService';
import {filterActiveMandatesForOrders} from '../Mandate/mandateFieldUtils';
import AppTourOverlay from '../../components/AppTour/AppTourOverlay';
import {INVEST_TOUR_STEPS, TOUR_SCREEN} from '../../tour/tourSteps';
import {useScreenTour} from '../../tour/useScreenTour';

function normalizeFolioNumberList(raw, fallback) {
  const list = [];
  const add = value => {
    const s = value != null ? String(value).trim() : '';
    if (s && !list.includes(s)) {
      list.push(s);
    }
  };
  if (Array.isArray(raw)) {
    raw.forEach(add);
  } else {
    add(raw);
  }
  add(fallback);
  return list;
}

function safeInr(v) {
  if (v === null || v === undefined || Number.isNaN(Number(v))) {
    return '—';
  }
  return `₹${Number(v).toLocaleString('en-IN')}`;
}

function digitsOnlyAmount(value) {
  return String(value || '')
    .replace(/[^0-9]/g, '')
    .replace(/^0+(?=\d)/, '')
    .slice(0, 12);
}

/** Keep only digits in state parsing; show en-IN grouped value in the field. */
function formatAmountInput(value) {
  const digits = digitsOnlyAmount(value);
  if (!digits) {
    return '';
  }
  return Number(digits).toLocaleString('en-IN');
}

function FundInvestHeader({logoUrl, displayName, tags, styles, isDark, colors}) {
  const initial = String(displayName || 'F').trim().charAt(0).toUpperCase() || 'F';
  return (
    <View style={styles.fundHeader}>
      {logoUrl ? (
        <Image source={{uri: logoUrl}} style={styles.fundLogo} resizeMode="contain" />
      ) : (
        <View style={[styles.fundLogo, styles.fundLogoPh]}>
          <Text style={styles.fundLogoLetter}>{initial}</Text>
        </View>
      )}
      <View style={styles.fundHeaderText}>
        <Text style={styles.fundHeaderTitle} numberOfLines={3}>
          {displayName}
        </Text>
        {Array.isArray(tags) && tags.length > 0 ? (
          <View style={styles.fundTagsRow}>
            {tags.map(t => (
              <View
                key={t.key}
                style={[
                  styles.fundTag,
                  {
                    backgroundColor: isDark ? 'rgba(30, 129, 242, 0.16)' : 'rgba(30, 129, 242, 0.08)',
                    borderColor: colors.primary,
                  },
                ]}>
                <Text style={[styles.fundTagTxt, {color: colors.primary}]}>{t.label}</Text>
              </View>
            ))}
          </View>
        ) : null}
      </View>
    </View>
  );
}

function AmountErrorRow({message, styles}) {
  if (!message) {
    return null;
  }
  return (
    <View style={styles.amountErrRow}>
      <View style={styles.amountErrIcon}>
        <Text style={styles.amountErrIconTxt}>!</Text>
      </View>
      <Text style={styles.amountErrTxt}>{message}</Text>
    </View>
  );
}

function InvestScreenLoader({colors, isDark, styles}) {
  const pulse = useRef(new Animated.Value(0.45)).current;

  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1,
          duration: 700,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 0.45,
          duration: 700,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ]),
    );
    anim.start();
    return () => anim.stop();
  }, [pulse]);

  const boneStyle = {
    backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(15,23,42,0.07)',
    opacity: pulse,
  };

  return (
    <View style={styles.loaderCard}>
      <View style={styles.loaderTabs}>
        <Animated.View style={[styles.loaderTabBone, boneStyle]} />
        <Animated.View style={[styles.loaderTabBone, boneStyle]} />
      </View>
      <Animated.View style={[styles.loaderLabelBone, boneStyle]} />
      <Animated.View style={[styles.loaderInputBone, boneStyle]} />
      <View style={styles.loaderChipsRow}>
        <Animated.View style={[styles.loaderChipBone, boneStyle]} />
        <Animated.View style={[styles.loaderChipBone, boneStyle]} />
        <Animated.View style={[styles.loaderChipBone, boneStyle]} />
      </View>
      <Animated.View style={[styles.loaderFieldBone, {marginTop: 18}, boneStyle]} />
      <Animated.View style={[styles.loaderInputBone, boneStyle]} />
      <View style={styles.loaderFooterRow}>
        <ActivityIndicator size="small" color={colors.primary} />
        <Text style={styles.loaderHint}>Loading fund details…</Text>
      </View>
    </View>
  );
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

function startOfDay(d) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function addCalendarDays(base, days) {
  const x = startOfDay(base);
  x.setDate(x.getDate() + Number(days));
  return x;
}

/** Monthly SIP: calendar day 1–28 and not before minDate. */
function alignMonthlySipDate(current, minDate) {
  let d = startOfDay(new Date(Math.max(startOfDay(current).getTime(), startOfDay(minDate).getTime())));
  for (let i = 0; i < 400; i++) {
    if (d.getDate() > 28) {
      const nd = new Date(d);
      nd.setDate(28);
      d = nd;
    }
    if (d.getTime() >= startOfDay(minDate).getTime()) {
      return d;
    }
    d.setDate(d.getDate() + 1);
  }
  return startOfDay(minDate);
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
  const canPostToBse = useSelector(selectCanPostToBse);

  const schemeCode =
    route.params?.schemeCode ?? route.params?.scheme_code ?? route.params?.code;
  const paramName = route.params?.schemeName ?? route.params?.scheme_name;
  const initialOrderType = route.params?.initialOrderType === 'SIP' ? 'SIP' : 'ONE_TIME';
  const additionalPurchase = !!route.params?.additionalPurchase;
  const folioOptions = useMemo(
    () =>
      normalizeFolioNumberList(
        route.params?.folioNumbers ?? route.params?.folio_numbers,
        route.params?.initialFolioNumber ?? route.params?.folioNumber ?? route.params?.folio_number,
      ),
    [
      route.params?.folioNumbers,
      route.params?.folio_numbers,
      route.params?.initialFolioNumber,
      route.params?.folioNumber,
      route.params?.folio_number,
    ],
  );

  const {data: folioData, isLoading: loading, error, refetch: refetchFund} = useFundData(schemeCode);
  const {data: mandateData, isPending: mandateLoading} = useMandateData();
  const fundInfo = useMemo(() => folioData?.schemeData ?? null, [folioData?.schemeData]);
  const logoUrl = folioData?.logo_url || fundInfo?.logo_url;
  const displayName = useMemo(
    () => fundInfo?.scheme_name || fundInfo?.base_scheme_name || paramName || 'Fund',
    [fundInfo?.base_scheme_name, fundInfo?.scheme_name, paramName],
  );
  const fundMetaTags = useMemo(() => {
    if (!fundInfo) {
      return [];
    }
    const out = [];
    if (fundInfo.scheme_plan) {
      out.push({key: 'plan', label: String(fundInfo.scheme_plan)});
    }
    if (fundInfo.scheme_type) {
      out.push({key: 'type', label: String(fundInfo.scheme_type)});
    }
    const risk = fundInfo?.holdings?.nfo_risk;
    if (risk) {
      out.push({key: 'risk', label: `${risk} risk`});
    }
    return out;
  }, [fundInfo]);
  /** Choose Mandate modal + validations: **ACTIVE** mandates only (pehle wala behaviour). */
  const mandates = useMemo(
    () => filterActiveMandatesForOrders(mandateData?.results),
    [mandateData?.results],
  );

  const [orderType, setOrderType] = useState(initialOrderType);
  const [selectedFolioNumber, setSelectedFolioNumber] = useState(
    () =>
      String(route.params?.initialFolioNumber ?? route.params?.folioNumber ?? folioOptions[0] ?? '').trim() ||
      folioOptions[0] ||
      '',
  );
  const [folioModalVisible, setFolioModalVisible] = useState(false);
  const [orderAmount, setOrderAmount] = useState('');
  const [amountError, setAmountError] = useState(null);
  const [amountFocused, setAmountFocused] = useState(false);
  const orderTypeTourRef = useRef(null);
  const amountTourRef = useRef(null);
  const tourTargetRefs = useMemo(
    () => ({
      orderType: orderTypeTourRef,
      amount: amountTourRef,
    }),
    [],
  );
  const [sipFrequency, setSipFrequency] = useState('Monthly');
  const [sipDurationYears, setSipDurationYears] = useState('1');
  const [sipDate, setSipDate] = useState(() => new Date());
  const [dailySipStartDate, setDailySipStartDate] = useState(() => new Date());
  const [dailySipEndDate, setDailySipEndDate] = useState(() => {
    const x = new Date();
    x.setDate(x.getDate() + 30);
    return x;
  });
  const [placeFirstInstallmentToday, setPlaceFirstInstallmentToday] = useState(false);
  const [sipDayDiffSettings, setSipDayDiffSettings] = useState({
    daysWithFirst: 9,
    daysWithoutFirst: 33,
  });
  /** null | 'monthly' | 'dailyStart' | 'dailyEnd' */
  const [sipPickerKind, setSipPickerKind] = useState(null);
  const [mandateModalVisible, setMandateModalVisible] = useState(false);
  const [freqModalVisible, setFreqModalVisible] = useState(false);
  const [selectedMandate, setSelectedMandate] = useState(null);
  /** When true, include `mandate_id` (One-time + SIP — same “Use Mandate” toggle). */
  const [useMandateForPurchase, setUseMandateForPurchase] = useState(false);
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

  const tour = useScreenTour({
    screenKey: TOUR_SCREEN.invest,
    steps: INVEST_TOUR_STEPS,
    targetRefs: tourTargetRefs,
    enabled: !loading && !pendingOrderId && !!fundInfo,
    autoStartDelayMs: 520,
  });

  const minLumpsum = useMemo(
    () => pickMinLumpsumAmount(fundInfo, {additionalPurchase}),
    [fundInfo, additionalPurchase],
  );
  const maxLumpsum = useMemo(() => pickMaxPurchaseAmountOrNull(fundInfo), [fundInfo]);
  const minSip = useMemo(() => pickMinSipInvestment(fundInfo), [fundInfo]);
  const maxSipOrNull = useMemo(() => pickMaxSipInvestmentOrNull(fundInfo), [fundInfo]);
  const sipMaxUsable =
    maxSipOrNull != null && maxSipOrNull >= minSip ? maxSipOrNull : null;
  const sipLimitsInvalid = maxSipOrNull != null && maxSipOrNull < minSip;
  const minOrderAmount = orderType === 'SIP' ? minSip : minLumpsum;
  const quickAmounts = useMemo(
    () =>
      orderType === 'SIP'
        ? buildQuickAmounts(minSip, sipMaxUsable ?? undefined)
        : buildQuickAmounts(minLumpsum, maxLumpsum ?? undefined),
    [orderType, minSip, sipMaxUsable, minLumpsum, maxLumpsum],
  );

  const syncAmountErrorForType = useCallback(
    (nextType, amountStr) => {
      const raw = Number(digitsOnlyAmount(amountStr));
      if (!amountStr || !raw) {
        setAmountError(null);
        return;
      }
      if (nextType === 'SIP') {
        if (sipLimitsInvalid) {
          setAmountError('SIP limits look incorrect for this fund');
          return;
        }
        if (raw < minSip) {
          setAmountError(`Minimum investment is ${safeInr(minSip)}`);
          return;
        }
        if (sipMaxUsable != null && raw > sipMaxUsable) {
          setAmountError(`Maximum investment is ${safeInr(sipMaxUsable)}`);
          return;
        }
        setAmountError(null);
        return;
      }
      if (raw < minLumpsum) {
        setAmountError(`Minimum investment is ${safeInr(minLumpsum)}`);
        return;
      }
      if (maxLumpsum != null && raw > maxLumpsum) {
        setAmountError(`Maximum investment is ${safeInr(maxLumpsum)}`);
        return;
      }
      setAmountError(null);
    },
    [sipLimitsInvalid, minSip, sipMaxUsable, minLumpsum, maxLumpsum],
  );
  const selectedMandateLabel = selectedMandate
    ? pickMandateLabel(selectedMandate)
    : 'Select your preferred mandate option';

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetchCompanyProfileSettings();
        if (cancelled || !res?.success) {
          return;
        }
        setSipDayDiffSettings(normalizeSipPlaceOrderDayDiff(res.data));
      } catch {
        /* keep defaults */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const activeSipDaysDiff = placeFirstInstallmentToday
    ? sipDayDiffSettings.daysWithFirst
    : sipDayDiffSettings.daysWithoutFirst;
  const computedMinSipDate = useMemo(
    () => addCalendarDays(new Date(), activeSipDaysDiff),
    [activeSipDaysDiff],
  );

  const dailyEndMinimum = useMemo(() => {
    const start = startOfDay(dailySipStartDate);
    const policy = startOfDay(computedMinSipDate);
    const dayAfterStart = addCalendarDays(start, 1);
    return new Date(Math.max(dayAfterStart.getTime(), policy.getTime()));
  }, [dailySipStartDate, computedMinSipDate]);

  useEffect(() => {
    if (orderType !== 'SIP' || sipFrequency === 'Daily') {
      return;
    }
    setSipDate(prev => alignMonthlySipDate(prev, computedMinSipDate));
  }, [orderType, sipFrequency, computedMinSipDate]);

  useEffect(() => {
    if (orderType !== 'SIP' || sipFrequency !== 'Daily') {
      return;
    }
    const min = startOfDay(computedMinSipDate);
    setDailySipStartDate(prev => {
      const p = startOfDay(prev);
      return p.getTime() < min.getTime() ? new Date(min) : prev;
    });
  }, [orderType, sipFrequency, computedMinSipDate]);

  useEffect(() => {
    if (orderType !== 'SIP' || sipFrequency !== 'Daily') {
      return;
    }
    setDailySipEndDate(prev => {
      const p = startOfDay(prev);
      const minE = dailyEndMinimum;
      return p.getTime() < minE.getTime() ? new Date(minE) : prev;
    });
  }, [orderType, sipFrequency, dailyEndMinimum]);

  useEffect(() => {
    if (mandates.length === 0) {
      setSelectedMandate(null);
      setUseMandateForPurchase(false);
      return;
    }
    const selectedId = selectedMandate?.id ?? selectedMandate?.mandate_id;
    const exists = selectedMandate && mandates.some(m => (m?.id ?? m?.mandate_id) === selectedId);
    if (selectedMandate && !exists) {
      setSelectedMandate(null);
    }
  }, [mandates, selectedMandate]);

  const parseOrderAmount = useCallback(() => {
    const parsed = Number(digitsOnlyAmount(orderAmount));
    return Number.isFinite(parsed) ? Math.round(parsed) : 0;
  }, [orderAmount]);

  const validateAmountForSubmit = useCallback(() => {
    const raw = parseOrderAmount();
    if (!raw || raw <= 0) {
      setAmountError('Enter a valid amount');
      return null;
    }
    if (orderType === 'SIP') {
      if (sipLimitsInvalid) {
        setAmountError('SIP limits look incorrect for this fund');
        return null;
      }
      if (raw < minSip) {
        setAmountError(`Minimum investment is ${safeInr(minSip)}`);
        return null;
      }
      if (sipMaxUsable != null && raw > sipMaxUsable) {
        setAmountError(`Maximum investment is ${safeInr(sipMaxUsable)}`);
        return null;
      }
    } else {
      if (raw < minLumpsum) {
        setAmountError(`Minimum investment is ${safeInr(minLumpsum)}`);
        return null;
      }
      if (maxLumpsum != null && raw > maxLumpsum) {
        setAmountError(`Maximum investment is ${safeInr(maxLumpsum)}`);
        return null;
      }
    }
    setAmountError(null);
    return raw;
  }, [orderType, parseOrderAmount, minSip, sipMaxUsable, sipLimitsInvalid, minLumpsum, maxLumpsum]);

  const onTapQuickAmount = useCallback(
    v => {
      let n = Math.round(Number(v)) || 0;
      if (orderType === 'SIP') {
        n = Math.max(minSip, n);
        if (sipMaxUsable != null) {
          n = Math.min(sipMaxUsable, n);
        }
      } else {
        n = Math.max(minLumpsum, n);
        if (maxLumpsum != null) {
          n = Math.min(maxLumpsum, n);
        }
      }
      setOrderAmount(formatAmountInput(String(n)));
      setAmountError(null);
    },
    [orderType, minSip, sipMaxUsable, minLumpsum, maxLumpsum],
  );

  const openCart = useCallback(() => {
    navigateToCart(navigation);
  }, [navigation]);

  const validateSipMetaForSubmit = useCallback(() => {
    if (orderType !== 'SIP') {
      return true;
    }
    if (String(sipFrequency).toLowerCase() === 'daily') {
      const start = startOfDay(dailySipStartDate);
      const end = startOfDay(dailySipEndDate);
      const pol = startOfDay(computedMinSipDate);
      if (start.getTime() < pol.getTime()) {
        appAlert('Invalid SIP date', `Start date must be on or after ${formatSipDateDisplay(pol)}.`);
        return false;
      }
      if (end.getTime() < pol.getTime()) {
        appAlert('Invalid SIP date', `End date must be on or after ${formatSipDateDisplay(pol)}.`);
        return false;
      }
      if (end.getTime() <= start.getTime()) {
        appAlert('Invalid SIP dates', 'SIP end date must be after start date.');
        return false;
      }
      return true;
    }
    if (!isSipDateWithinAllowedRange(sipDate)) {
      appAlert('Invalid SIP date', 'SIP date must be between 1 and 28.');
      return false;
    }
    const y = Number(sipDurationYears);
    if (!Number.isFinite(y) || y < 1 || y > 25) {
      appAlert('SIP duration', 'SIP duration must be between 1 and 25 years.');
      return false;
    }
    if (startOfDay(sipDate).getTime() < startOfDay(computedMinSipDate).getTime()) {
      appAlert(
        'Invalid SIP date',
        `Choose a date on or after ${formatSipDateDisplay(computedMinSipDate)} (per policy).`,
      );
      return false;
    }
    return true;
  }, [
    orderType,
    sipFrequency,
    dailySipStartDate,
    dailySipEndDate,
    computedMinSipDate,
    sipDate,
    sipDurationYears,
  ]);

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
    if (orderType === 'SIP' && !validateSipMetaForSubmit()) {
      return;
    }
    if (useMandateForPurchase && (!selectedMandate || mandates.length === 0)) {
      appAlert('Select mandate', 'Choose a mandate or turn off Use Mandate.');
      return;
    }
    if (additionalPurchase && !String(selectedFolioNumber || '').trim()) {
      appAlert('Select folio', 'Please choose a folio number to invest more.');
      return;
    }
    const isDaily = orderType === 'SIP' && String(sipFrequency).toLowerCase() === 'daily';
    const sipDateStr = orderType === 'SIP' ? (isDaily ? formatDDMMYYYY(dailySipStartDate) : formatDDMMYYYY(sipDate)) : undefined;
    const sipEndStr = orderType === 'SIP' && isDaily ? formatDDMMYYYY(dailySipEndDate) : undefined;
    dispatch(
      addToCart({
        fund: fundInfo,
        amount,
        isSIP: orderType === 'SIP',
        sipFrequency: orderType === 'SIP' ? sipFrequency : undefined,
        sipDate: sipDateStr,
        sipEndDate: sipEndStr,
        sipDurationYears: orderType === 'SIP' && !isDaily ? sipDurationYears : undefined,
        mandateId: useMandateForPurchase
          ? selectedMandate?.id ?? selectedMandate?.mandate_id
          : undefined,
        mandateLabel: useMandateForPurchase ? selectedMandateLabel : undefined,
        useMandate: useMandateForPurchase,
        firstOrderToday: orderType === 'SIP' ? placeFirstInstallmentToday : undefined,
        logo_url: logoUrl,
        folioNumber: additionalPurchase ? String(selectedFolioNumber || '').trim() : undefined,
        additionalPurchase,
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
    validateSipMetaForSubmit,
    orderType,
    selectedMandate,
    selectedMandateLabel,
    sipDate,
    sipDurationYears,
    sipFrequency,
    dailySipStartDate,
    dailySipEndDate,
    placeFirstInstallmentToday,
    useMandateForPurchase,
    additionalPurchase,
    selectedFolioNumber,
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
    if (orderType === 'SIP' && !validateSipMetaForSubmit()) {
      return;
    }
    if (useMandateForPurchase && (!selectedMandate || mandates.length === 0)) {
      appAlert('Select mandate', 'Choose a mandate or turn off Use Mandate.');
      return;
    }
    const selectedFolio = String(selectedFolioNumber || '').trim();
    if (additionalPurchase && !selectedFolio) {
      appAlert('Select folio', 'Please choose a folio number to invest more.');
      return;
    }
    try {
      setPlacingOrder(true);
      const isDailySip = orderType === 'SIP' && String(sipFrequency).toLowerCase() === 'daily';
      const sipDateForApi =
        orderType === 'SIP' ? (isDailySip ? formatDDMMYYYY(dailySipStartDate) : formatDDMMYYYY(sipDate)) : '';
      const sipEndForApi = orderType === 'SIP' && isDailySip ? formatDDMMYYYY(dailySipEndDate) : undefined;
      const mandateIdForOrder = useMandateForPurchase
        ? selectedMandate?.id ?? selectedMandate?.mandate_id
        : undefined;
      const payload =
        orderType === 'SIP'
          ? buildSipRegisterPayload({
              schemeCode: fundInfo.scheme_code,
              amount,
              sipFrequency,
              sipDate: sipDateForApi,
              sipDurationYears: Number(sipDurationYears),
              sipEndDate: sipEndForApi,
              mandateId: mandateIdForOrder,
              firstOrderToday: placeFirstInstallmentToday,
              folioNo: selectedFolio || fundInfo?.folio_number || fundInfo?.folio_no,
              euin: user?.euin,
            })
          : buildOrderPlacePayload({
              schemeCode: fundInfo.scheme_code,
              amount,
              isSip: false,
              mandateId: mandateIdForOrder,
              useMandate: useMandateForPurchase,
              folioNumber: selectedFolio,
              buySellType: additionalPurchase || selectedFolio ? 'ADDITIONAL' : undefined,
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
    validateSipMetaForSubmit,
    selectedMandate,
    mandates.length,
    sipFrequency,
    sipDate,
    sipDurationYears,
    dailySipStartDate,
    dailySipEndDate,
    placeFirstInstallmentToday,
    user?.euin,
    useMandateForPurchase,
    additionalPurchase,
    selectedFolioNumber,
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
      const paymentError = getPaymentProcessErrorMessage(res);
      if (paymentError) {
        setPaymentModeModalVisible(false);
        setTimeout(() => {
          appAlert('Payment', paymentError);
        }, 350);
        return;
      }
      const paymentUrl = extractOrderAuthUrl(res?.data);
      if (paymentUrl) {
        setPaymentModeModalVisible(false);
        setSelectedPaymentMode(null);
        navigation.navigate('MandateAuthWebview', {
          uri: paymentUrl,
          title: 'Complete payment',
        });
      } else {
        appAlert('Payment', 'Payment gateway URL not found.');
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

  const sipPickerDate = useMemo(() => {
    if (sipPickerKind === 'monthly') {
      return sipDate;
    }
    if (sipPickerKind === 'dailyStart') {
      return dailySipStartDate;
    }
    if (sipPickerKind === 'dailyEnd') {
      return dailySipEndDate;
    }
    return new Date();
  }, [sipPickerKind, sipDate, dailySipStartDate, dailySipEndDate]);

  const sipPickerMinimumDate = useMemo(() => {
    if (sipPickerKind === 'dailyEnd') {
      return dailyEndMinimum;
    }
    return computedMinSipDate;
  }, [sipPickerKind, dailyEndMinimum, computedMinSipDate]);

  const onConfirmSipPicker = useCallback(
    date => {
      const picked = startOfDay(date);
      const pol = startOfDay(computedMinSipDate);
      if (sipPickerKind === 'monthly') {
        if (picked.getTime() < pol.getTime()) {
          setSipPickerKind(null);
          setTimeout(() => {
            appAlert(
              'Invalid SIP date',
              `Choose a date on or after ${formatSipDateDisplay(computedMinSipDate)} (per policy).`,
            );
          }, 0);
          return;
        }
        if (!isSipDateWithinAllowedRange(date)) {
          setSipPickerKind(null);
          setTimeout(() => {
            appAlert('Invalid SIP date', 'SIP date must be between 1 and 28.');
          }, 0);
          return;
        }
        setSipDate(picked);
      } else if (sipPickerKind === 'dailyStart') {
        if (picked.getTime() < pol.getTime()) {
          setSipPickerKind(null);
          setTimeout(() => {
            appAlert(
              'Invalid SIP date',
              `Choose a date on or after ${formatSipDateDisplay(computedMinSipDate)} (per policy).`,
            );
          }, 0);
          return;
        }
        setDailySipStartDate(picked);
      } else if (sipPickerKind === 'dailyEnd') {
        const minE = startOfDay(dailyEndMinimum);
        if (picked.getTime() < pol.getTime()) {
          setSipPickerKind(null);
          setTimeout(() => {
            appAlert(
              'Invalid SIP date',
              `Choose a date on or after ${formatSipDateDisplay(computedMinSipDate)} (per policy).`,
            );
          }, 0);
          return;
        }
        if (picked.getTime() < minE.getTime()) {
          setSipPickerKind(null);
          setTimeout(() => {
            appAlert(
              'Invalid SIP date',
              `End date must be after start date (on or after ${formatSipDateDisplay(minE)}).`,
            );
          }, 0);
          return;
        }
        setDailySipEndDate(picked);
      }
      setSipPickerKind(null);
    },
    [sipPickerKind, computedMinSipDate, dailyEndMinimum],
  );

  const onCancelSipPicker = useCallback(() => {
    setSipPickerKind(null);
  }, []);

  const primaryCtaLabel = useMemo(() => {
    if (placingOrder) {
      return 'Placing order...';
    }
    return orderType === 'SIP' ? 'Start SIP' : 'Continue to Invest';
  }, [orderType, placingOrder]);

  /** “Use Mandate” on (One-time or SIP) requires an active mandate pick. */
  const isPrimaryCtaDisabled =
    !canPostToBse ||
    (orderType === 'SIP' && sipLimitsInvalid) ||
    (useMandateForPurchase &&
      (mandateLoading || mandates.length === 0 || !selectedMandate));

  const onPrimaryCtaPress = useCallback(() => {
    if (!canPostToBse || placingOrder) {
      return;
    }
    console.log('[FundInvestment:primaryCta] clicked', {
      label: primaryCtaLabel,
      orderType,
      placingOrder,
      schemeCode: fundInfo?.scheme_code ?? schemeCode,
    });
    onPlaceOrder();
  }, [canPostToBse, fundInfo?.scheme_code, onPlaceOrder, orderType, placingOrder, primaryCtaLabel, schemeCode]);

  if (!schemeCode) {
    return (
      <SafeAreaView style={[styles.safe, {backgroundColor: colors.background}]} edges={['top', 'left', 'right', 'bottom']}>
        <View style={styles.errorState}>
          <View style={styles.errorIconCircle}>
            <Text style={styles.errorIconGlyph}>!</Text>
          </View>
          <Text style={styles.errorTitle}>Missing fund</Text>
          <Text style={styles.errorSubtitle}>Scheme code is missing. Go back and open the fund again.</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={() => navigation.goBack()} activeOpacity={0.85}>
            <Text style={styles.retryBtnTxt}>Go back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  if (loading && !folioData) {
    return (
      <SafeAreaView style={[styles.safe, {backgroundColor: colors.background}]} edges={['top', 'left', 'right']}>
        <View style={styles.scrollContent}>
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
          <FundInvestHeader
            logoUrl={null}
            displayName={displayName}
            tags={[]}
            styles={styles}
            isDark={isDark}
            colors={colors}
          />
          <InvestScreenLoader colors={colors} isDark={isDark} styles={styles} />
        </View>
      </SafeAreaView>
    );
  }

  if (error || !fundInfo?.scheme_code) {
    return (
      <SafeAreaView style={[styles.safe, {backgroundColor: colors.background}]} edges={['top', 'left', 'right', 'bottom']}>
        <View style={styles.scrollContent}>
          <View style={styles.headerRow}>
            <AppBackButton onPress={() => navigation.goBack()} hitSlop={14} style={styles.backHit} />
            <View style={styles.cartHit} />
          </View>
        </View>
        <View style={styles.errorState}>
          <View style={styles.errorIconCircle}>
            <Text style={styles.errorIconGlyph}>!</Text>
          </View>
          <Text style={styles.errorTitle}>Couldn’t load fund</Text>
          <Text style={styles.errorSubtitle}>{error || 'Something went wrong. Please try again.'}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={refetchFund} activeOpacity={0.85}>
            <Text style={styles.retryBtnTxt}>Retry</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.safe, {backgroundColor: colors.background}]} edges={['top', 'left', 'right']}>
      <KeyboardAvoidingView
        style={styles.flex1}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 8 : 0}>
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
          <FundInvestHeader
            logoUrl={logoUrl}
            displayName={displayName}
            tags={fundMetaTags}
            styles={styles}
            isDark={isDark}
            colors={colors}
          />

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
              <View style={styles.orderTabs} ref={orderTypeTourRef} collapsable={false}>
                <TouchableOpacity
                  style={[styles.orderTabBtn, orderType === 'ONE_TIME' && styles.orderTabBtnActive]}
                  activeOpacity={0.85}
                  onPress={() => {
                    setOrderType('ONE_TIME');
                    syncAmountErrorForType('ONE_TIME', orderAmount);
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
                    syncAmountErrorForType('SIP', orderAmount);
                  }}>
                  <Text style={[styles.orderTabTxt, orderType === 'SIP' && styles.orderTabTxtActive]}>SIP</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.amountSection} ref={amountTourRef} collapsable={false}>
                <Text style={styles.amountSectionLabel}>Enter amount</Text>
                <View
                  style={[
                    styles.amountInputWrap,
                    amountFocused && styles.amountInputWrapFocused,
                    amountError || (orderType === 'SIP' && sipLimitsInvalid)
                      ? styles.amountInputWrapErr
                      : null,
                  ]}>
                  <Text style={styles.amountCurrency}>₹</Text>
                  <TextInput
                    style={styles.amountInput}
                    value={orderAmount}
                    onChangeText={t => {
                      setOrderAmount(formatAmountInput(t));
                      setAmountError(null);
                    }}
                    onFocus={() => setAmountFocused(true)}
                    onBlur={() => setAmountFocused(false)}
                    keyboardType="number-pad"
                    maxLength={17}
                    placeholder="Enter amount"
                    placeholderTextColor="#9CA3AF"
                  />
                </View>
                <AmountErrorRow
                  styles={styles}
                  message={
                    amountError ||
                    (orderType === 'SIP' && sipLimitsInvalid
                      ? `SIP limits look incorrect (min ${safeInr(minSip)}, max ${safeInr(maxSipOrNull)})`
                      : null)
                  }
                />
                {!amountError && orderType === 'SIP' && !sipLimitsInvalid ? (
                  <Text style={styles.amountHintTxt}>
                    Min SIP {safeInr(minSip)}
                    {sipMaxUsable != null ? ` · Max ${safeInr(sipMaxUsable)}` : ''}
                  </Text>
                ) : null}
                {!amountError && orderType === 'ONE_TIME' ? (
                  <Text style={styles.amountHintTxt}>
                    Minimum {safeInr(minLumpsum)}
                    {maxLumpsum != null ? ` · Max ${safeInr(maxLumpsum)}` : ''}
                    {additionalPurchase ? ' (additional purchase)' : ''}
                  </Text>
                ) : null}

                <View
                  style={[
                    styles.quickAmountRow,
                    quickAmounts.length === 1 ? styles.quickAmountRowSolo : null,
                  ]}>
                  {quickAmounts.map(v => {
                    const selected = orderAmount !== '' && Number(digitsOnlyAmount(orderAmount)) === v;
                    return (
                      <TouchableOpacity
                        key={v}
                        style={[
                          styles.quickAmountChip,
                          quickAmounts.length === 1 && styles.quickAmountChipSolo,
                          selected && styles.quickAmountChipSelected,
                        ]}
                        onPress={() => onTapQuickAmount(v)}
                        activeOpacity={0.85}>
                        <Text
                          style={[
                            styles.quickAmountChipTxt,
                            selected && styles.quickAmountChipTxtSelected,
                          ]}>
                          {selected ? `✓ ${safeInr(v)}` : `+${safeInr(v)}`}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              {folioOptions.length > 0 ? (
                <View style={{marginTop: 10}}>
                  <Text style={styles.fieldLabel}>Folio No.</Text>
                  <TouchableOpacity
                    style={styles.dropdownField}
                    onPress={() => setFolioModalVisible(true)}
                    activeOpacity={0.85}>
                    <Text style={styles.dropdownValue} numberOfLines={1}>
                      {selectedFolioNumber || 'Select folio'}
                    </Text>
                    <Image source={Icons.DropDown} style={styles.dropdownChevron} resizeMode="contain" />
                  </TouchableOpacity>
                </View>
              ) : null}

              {mandateLoading ? (
                <View
                  style={[
                    styles.useMandateRow,
                    {borderColor: colors.border, backgroundColor: isDark ? colors.inputBg : '#F9FAFB'},
                  ]}>
                  <ActivityIndicator size="small" color={colors.primary} />
                  <Text style={[styles.useMandateLabel, {color: colors.textSecondary}]}>Loading mandates…</Text>
                </View>
              ) : (
                <View
                  style={[
                    styles.useMandateRow,
                    {borderColor: colors.border, backgroundColor: isDark ? colors.inputBg : '#F9FAFB'},
                  ]}>
                  <Text style={[styles.useMandateLabel, {color: colors.textPrimary, flex: 1}]}>Use Mandate</Text>
                  <Switch
                    value={useMandateForPurchase}
                    onValueChange={next => {
                      setUseMandateForPurchase(!!next);
                      if (!next) {
                        setSelectedMandate(null);
                      }
                    }}
                    trackColor={{false: isDark ? '#3A3A3C' : '#E5E7EB', true: '#93C5FD'}}
                    thumbColor={useMandateForPurchase ? colors.primary : isDark ? '#8E8E93' : '#F4F4F5'}
                  />
                </View>
              )}

              {useMandateForPurchase ? (
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
              ) : null}

              {orderType === 'SIP' ? (
                <View style={styles.sipDetailsBlock}>
                  <View style={styles.sipDetailsDivider} />
                  <Text style={styles.sipDetailsTitle}>SIP details</Text>

                  <Text style={styles.fieldLabel}>SIP frequency</Text>
                  <TouchableOpacity
                    style={styles.dropdownField}
                    onPress={() => setFreqModalVisible(true)}
                    activeOpacity={0.85}>
                    <Text style={styles.dropdownValue}>{sipFrequency}</Text>
                    <Image source={Icons.DropDown} style={styles.dropdownChevron} resizeMode="contain" />
                  </TouchableOpacity>

                  {String(sipFrequency).toLowerCase() === 'daily' ? (
                    <View style={styles.sipDateRow}>
                      <View style={styles.sipDateCol}>
                        <Text style={[styles.fieldLabel, styles.fieldLabelSpaced]}>SIP date</Text>
                        <TouchableOpacity
                          style={styles.dropdownField}
                          onPress={() => setSipPickerKind('dailyStart')}
                          activeOpacity={0.85}>
                          <Text style={styles.dropdownValue}>{formatSipDateDisplay(dailySipStartDate)}</Text>
                          <Image source={Icons.CalendarOthers} style={styles.calendarIcon} resizeMode="contain" />
                        </TouchableOpacity>
                      </View>
                      <View style={styles.sipDateCol}>
                        <Text style={[styles.fieldLabel, styles.fieldLabelSpaced]}>SIP end date</Text>
                        <TouchableOpacity
                          style={styles.dropdownField}
                          onPress={() => setSipPickerKind('dailyEnd')}
                          activeOpacity={0.85}>
                          <Text style={styles.dropdownValue}>{formatSipDateDisplay(dailySipEndDate)}</Text>
                          <Image source={Icons.CalendarOthers} style={styles.calendarIcon} resizeMode="contain" />
                        </TouchableOpacity>
                      </View>
                    </View>
                  ) : (
                    <>
                      <Text style={[styles.fieldLabel, styles.fieldLabelSpaced]}>SIP date</Text>
                      <TouchableOpacity
                        style={styles.dropdownField}
                        onPress={() => setSipPickerKind('monthly')}
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
                            <Text style={[styles.inlineChipTxt, sipDurationYears === y && styles.inlineChipTxtOn]}>
                              {y}
                            </Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    </>
                  )}

                  <View style={styles.firstOrderRow}>
                    <Text style={styles.firstOrderLabel}>Place first order installment today</Text>
                    <Switch
                      value={placeFirstInstallmentToday}
                      onValueChange={setPlaceFirstInstallmentToday}
                      trackColor={{false: isDark ? '#3A3A3C' : '#E5E7EB', true: '#86EFAC'}}
                      thumbColor={placeFirstInstallmentToday ? '#16A34A' : isDark ? '#8E8E93' : '#F4F4F5'}
                    />
                  </View>
                </View>
              ) : null}

            </View>
          )}

          <View style={styles.scrollBottomPad} />
        </ScrollView>

        {!pendingOrderId ? (
          <View style={styles.footer}>
            <TouchableOpacity style={styles.footerViewCart} onPress={openCart} activeOpacity={0.85}>
              <Text style={styles.footerViewCartTxt}>
                View cart{cartCount > 0 ? ` (${cartCount > 99 ? '99+' : cartCount})` : ''} →
              </Text>
            </TouchableOpacity>
            <View style={styles.footerActions}>
              <TouchableOpacity style={styles.addCartLink} onPress={onAddToCart} activeOpacity={0.85}>
                <Text style={styles.addCartLinkTxt}>Add to cart</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.primaryCta,
                  (placingOrder || isPrimaryCtaDisabled) && styles.primaryCtaDisabled,
                ]}
                onPress={onPrimaryCtaPress}
                activeOpacity={0.92}
                disabled={placingOrder || isPrimaryCtaDisabled}>
                {placingOrder ? (
                  <View style={styles.primaryCtaLoadingRow}>
                    <ActivityIndicator size="small" color="#FFFFFF" />
                    <Text style={[styles.primaryCtaTxt, Textstyles.medium]}>Placing order…</Text>
                  </View>
                ) : (
                  <Text style={[styles.primaryCtaTxt, Textstyles.medium]}>{primaryCtaLabel}</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        ) : null}
      </KeyboardAvoidingView>

      <AppModal
        visible={folioModalVisible}
        onClose={() => setFolioModalVisible(false)}
        title="Select folio number"
        isBottomSheet
        maxHeight={'55%'}>
        {folioOptions.map(folio => {
          const active = folio === selectedFolioNumber;
          return (
            <TouchableOpacity
              key={folio}
              style={[styles.modalRow, active && styles.modalRowActive]}
              onPress={() => {
                setSelectedFolioNumber(folio);
                setFolioModalVisible(false);
              }}
              activeOpacity={0.9}>
              <Text style={[styles.modalRowTxt, active && styles.modalRowTxtActive]}>{folio}</Text>
            </TouchableOpacity>
          );
        })}
      </AppModal>

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
        {['Monthly', 'Daily'].map(freq => (
          <TouchableOpacity
            key={freq}
            style={[styles.modalRow, sipFrequency === freq && styles.modalRowActive]}
            onPress={() => {
              setSipFrequency(freq);
              if (freq === 'Daily') {
                const minD = startOfDay(computedMinSipDate);
                setDailySipStartDate(new Date(minD));
                setDailySipEndDate(addCalendarDays(minD, 30));
              }
              setFreqModalVisible(false);
              setSipPickerKind(null);
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

      {sipPickerKind ? (
        <DatePicker
          modal
          open={!!sipPickerKind}
          date={sipPickerDate}
          mode="date"
          minimumDate={sipPickerMinimumDate}
          onConfirm={onConfirmSipPicker}
          onCancel={onCancelSipPicker}
        />
      ) : null}
      <AppTourOverlay
        visible={tour.visible}
        step={tour.step}
        stepIndex={tour.stepIndex}
        stepCount={tour.stepCount}
        layout={tour.layout}
        onNext={tour.onNext}
        onBack={tour.onBack}
        onSkip={tour.onSkip}
        onRequestRemeasure={tour.onRequestRemeasure}
      />
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
    backgroundColor: c.primary,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  badgeTxt: {...Textstyles.medium, color: '#fff', fontSize: 10, fontWeight: '700'},
  fundHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: 8,
    marginBottom: 14,
  },
  fundLogo: {
    width: 48,
    height: 48,
    borderRadius: 10,
    marginRight: 12,
    backgroundColor: isDark ? '#2C2C2C' : '#F3F4F6',
  },
  fundLogoPh: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: c.border,
  },
  fundLogoLetter: {
    ...Textstyles.medium,
    fontSize: typeScale.bodyLg,
    fontWeight: '700',
    color: c.primary,
  },
  fundHeaderText: {flex: 1, minWidth: 0},
  fundHeaderTitle: {
    ...Textstyles.heading,
    fontSize: typeScale.title,
    lineHeight: 22,
    color: c.textPrimary,
  },
  fundTagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 8,
    gap: 8,
  },
  fundTag: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
    borderWidth: 1,
  },
  fundTagTxt: {
    ...Textstyles.normal,
    fontSize: 12,
    fontWeight: '500',
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
    borderRadius: 12,
    backgroundColor: isDark ? '#2C2C2C' : '#F1F3F5',
    padding: 4,
    marginBottom: 0,
    overflow: 'hidden',
  },
  orderTabBtn: {flex: 1, alignItems: 'center', paddingVertical: 11, borderRadius: 10},
  orderTabBtnActive: {
    backgroundColor: isDark ? 'rgba(226, 231, 237, 0.15)' : '#FFFFFF',
    shadowColor: isDark ? 'transparent' : '#000',
    shadowOpacity: isDark ? 0 : 0.06,
    shadowRadius: 4,
    shadowOffset: {width: 0, height: 1},
  },
  orderTabTxt: {...Textstyles.medium, fontSize: typeScale.bodyMd, color: c.textSecondary, fontWeight: '600'},
  orderTabTxtActive: {color: c.primary},
  amountSection: {
    marginTop: 18,
  },
  amountSectionLabel: {
    ...Textstyles.medium,
    fontSize: 14,
    color: c.textSecondary,
    fontWeight: '600',
    marginBottom: 8,
  },
  amountInputWrap: {
    borderWidth: 1,
    borderColor: c.border,
    borderRadius: 12,
    minHeight: 56,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    backgroundColor: c.inputBg,
  },
  amountInputWrapFocused: {
    borderColor: c.primary,
    shadowColor: c.primary,
    shadowOpacity: isDark ? 0.25 : 0.18,
    shadowRadius: 8,
    shadowOffset: {width: 0, height: 0},
    elevation: 2,
  },
  amountInputWrapErr: {
    borderColor: '#DC2626',
    backgroundColor: isDark ? 'rgba(248,113,113,0.08)' : '#FFFBFB',
    shadowOpacity: 0,
    elevation: 0,
  },
  amountCurrency: {
    ...Textstyles.medium,
    fontSize: typeScale.amountCurrency,
    lineHeight: typeScale.amountInput,
    color: c.textSecondary,
    marginRight: 8,
    fontWeight: '600',
    ...(Platform.OS === 'android' ? {includeFontPadding: false, textAlignVertical: 'center'} : null),
  },
  amountInput: {
    flex: 1,
    fontSize: typeScale.amountInput,
    lineHeight: typeScale.amountInput,
    color: c.textPrimary,
    paddingVertical: Platform.OS === 'ios' ? 10 : 0,
    textAlignVertical: 'center',
    ...(Platform.OS === 'android' ? {includeFontPadding: false} : null),
  },
  amountErrRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginTop: 8,
  },
  amountErrIcon: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#DC2626',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  amountErrIconTxt: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '800',
    lineHeight: 13,
  },
  amountErrTxt: {
    flex: 1,
    color: '#DC2626',
    fontSize: 13,
    lineHeight: 18,
  },
  amountHintTxt: {
    fontSize: 12,
    color: c.textSecondary,
    marginTop: 8,
    marginLeft: 2,
  },
  quickAmountRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
  },
  quickAmountRowSolo: {
    justifyContent: 'flex-start',
  },
  quickAmountChip: {
    flex: 1,
    borderWidth: 1,
    borderColor: c.border,
    borderRadius: 10,
    paddingVertical: 11,
    alignItems: 'center',
    backgroundColor: isDark ? c.inputBg : '#F8FAFC',
  },
  quickAmountChipSolo: {
    flex: 0,
    minWidth: '31%',
    paddingHorizontal: 16,
  },
  quickAmountChipSelected: {
    borderColor: c.primary,
    backgroundColor: isDark ? 'rgba(30, 129, 242, 0.16)' : '#EAF4FF',
  },
  quickAmountChipTxt: {
    ...Textstyles.medium,
    fontSize: typeScale.bodyMd,
    color: c.textPrimary,
    fontWeight: '600',
  },
  quickAmountChipTxtSelected: {
    color: c.primary,
  },
  fieldLabel: {...Textstyles.medium, fontSize: 14, color: c.textSecondary, fontWeight: '600', marginTop: 6, marginBottom: 8},
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
  useMandateRow: {
    marginTop: 16,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    gap: 12,
    alignSelf: 'stretch',
  },
  useMandateLabel: {...Textstyles.medium, fontSize: 15, fontWeight: '600'},
  sipDetailsBlock: {
    marginTop: 8,
  },
  sipDetailsDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: c.border,
    marginTop: 16,
    marginBottom: 14,
  },
  sipDetailsTitle: {
    ...Textstyles.heading,
    fontSize: 15,
    color: c.textPrimary,
    fontWeight: '700',
    marginBottom: 10,
  },
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
  sipDateRow: {flexDirection: 'row', gap: 10, marginTop: 4},
  sipDateCol: {flex: 1, minWidth: 0},
  firstOrderRow: {
    marginTop: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    paddingVertical: 4,
  },
  firstOrderLabel: {...Textstyles.medium, flex: 1, fontSize: 14, color: c.textPrimary, fontWeight: '600'},
  scrollBottomPad: {height: 28},
  footer: {
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 16,
    backgroundColor: c.card,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: c.border,
    shadowColor: isDark ? 'transparent' : '#0F172A',
    shadowOpacity: isDark ? 0 : 0.08,
    shadowRadius: 12,
    shadowOffset: {width: 0, height: -4},
    elevation: 10,
  },
  footerViewCart: {
    alignSelf: 'center',
    paddingVertical: 4,
    marginBottom: 8,
  },
  footerViewCartTxt: {
    ...Textstyles.medium,
    color: c.primary,
    fontSize: 14,
    fontWeight: '600',
  },
  footerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  addCartLink: {
    flex: 1,
    minHeight: 48,
    borderRadius: 12,
    backgroundColor: c.card,
    borderWidth: 1,
    borderColor: c.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOpacity: 0,
    elevation: 0,
  },
  addCartLinkTxt: {...Textstyles.medium, fontSize: typeScale.bodyLg, color: c.primary, fontWeight: '500'},
  primaryCta: {
    minHeight: 48,
    borderRadius: 12,
    backgroundColor: '#1E81F2',
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 8,
    shadowOffset: {width: 0, height: 3},
    elevation: 4,
  },
  primaryCtaDisabled: {opacity: 0.65, shadowOpacity: 0, elevation: 0},
  primaryCtaLoadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  primaryCtaTxt: {...Textstyles.heading, fontSize: typeScale.bodyLg, color: '#FFFFFF'},
  errorState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    paddingBottom: 48,
  },
  errorIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: isDark ? 'rgba(248,113,113,0.16)' : '#FEE2E2',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  errorIconGlyph: {
    color: '#DC2626',
    fontSize: 28,
    fontWeight: '800',
  },
  errorTitle: {
    ...Textstyles.heading,
    fontSize: typeScale.title,
    color: c.textPrimary,
    marginBottom: 8,
    textAlign: 'center',
  },
  errorSubtitle: {
    fontSize: 14,
    color: c.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
  },
  retryBtn: {
    minHeight: 44,
    paddingHorizontal: 28,
    borderRadius: 12,
    backgroundColor: c.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  retryBtnTxt: {
    ...Textstyles.medium,
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },
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
  loaderCard: {
    backgroundColor: c.card,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: c.border,
    shadowColor: isDark ? 'transparent' : '#000',
    shadowOpacity: isDark ? 0 : 0.06,
    shadowRadius: 12,
    shadowOffset: {width: 0, height: 4},
  },
  loaderTabs: {
    flexDirection: 'row',
    gap: 8,
    padding: 4,
    borderRadius: 12,
    backgroundColor: isDark ? '#2C2C2C' : '#F1F3F5',
    marginBottom: 18,
  },
  loaderTabBone: {
    flex: 1,
    height: 40,
    borderRadius: 10,
  },
  loaderLabelBone: {
    width: 96,
    height: 12,
    borderRadius: 6,
    marginBottom: 10,
  },
  loaderInputBone: {
    height: 56,
    borderRadius: 12,
    marginBottom: 12,
  },
  loaderChipsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  loaderChipBone: {
    flex: 1,
    height: 42,
    borderRadius: 10,
  },
  loaderFieldBone: {
    width: 72,
    height: 12,
    borderRadius: 6,
    marginBottom: 10,
  },
  loaderFooterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    marginTop: 22,
    paddingTop: 16,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: c.border,
  },
  loaderHint: {
    ...Textstyles.medium,
    fontSize: 13,
    color: c.textSecondary,
    fontWeight: '500',
  },
});
}
