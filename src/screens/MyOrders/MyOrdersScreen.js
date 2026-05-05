import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  TextInput,
  Image,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useFocusEffect, useNavigation} from '@react-navigation/native';
import {useSelector} from 'react-redux';
import {useOrdersData} from '../../hooks/useOrdersData';
import Textstyles from '../../utils/text';
import Icons from '../../utils/icons';
import {
  extractOrderAuthUrl,
  isAuthenticatedOrderState,
  processOrderPayment,
} from '../../services/ordersService';
import {
  pickOrderTitle,
  pickOrderAmountRaw,
  pickOrderStatus,
  pickOrderType,
  pickOrderDate,
  formatOrderTypeLabel,
  normalizeStatusKey,
} from './orderHelpers';
import AppModal from '../../components/AppModal';
import {useAppTheme} from '../../theme/useAppTheme';
import AppBackButton from '../../components/AppBackButton';
import {typeScale} from '../../theme/typography';
import {SEARCH_FIELD} from '../../theme/searchField';
import {appAlert} from '../../utils/appAlert';

const EMPTY_ORDERS = [];

function createMyOrdersStyles(colors, isDark) {
  const c = colors;
  return StyleSheet.create({
    safe: {flex: 1, backgroundColor: c.background},
    headerBar: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingVertical: 8,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: c.border,
      backgroundColor: c.background,
      minHeight: 44,
    },
    headerSlot: {width: 44, height: 44, alignItems: 'center', justifyContent: 'center'},
    headerTitle: {
      flex: 1,
      fontSize: typeScale.title,
      ...Textstyles.heading,
      color: c.textPrimary,
      textAlign: 'center',
    },
    filterIconWrap: {width: 44, height: 44, alignItems: 'center', justifyContent: 'center'},
    filterIcon: {width: 22, height: 22},
    filterBar: {height: 3, backgroundColor: c.primary, borderRadius: 1, marginBottom: 4},
    filterBarWide: {width: 18, alignSelf: 'flex-end'},
    filterBarNarrow: {width: 14, alignSelf: 'flex-end'},
    loadingBox: {flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24},
    loadingInline: {paddingHorizontal: 16, paddingVertical: 10, flexDirection: 'row', alignItems: 'center', gap: 10},
    loadingTxt: {marginTop: 12, color: c.textSecondary},
    loadingTxtInline: {marginTop: 0, color: c.textSecondary},
    pageHead: {paddingHorizontal: 0, paddingTop: 8},
    searchCard: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: c.inputBg,
      borderRadius: SEARCH_FIELD.borderRadius,
      borderWidth: 1,
      borderColor: c.border,
      paddingHorizontal: SEARCH_FIELD.paddingHorizontal,
      paddingVertical: SEARCH_FIELD.paddingVertical,
      minHeight: SEARCH_FIELD.minHeight,
      marginBottom: 8,
      shadowColor: isDark ? 'transparent' : '#000',
      shadowOffset: {width: 0, height: 1},
      shadowOpacity: isDark ? 0 : 0.06,
      shadowRadius: 3,
    },
    searchIconImg: {
      width: SEARCH_FIELD.iconSize,
      height: SEARCH_FIELD.iconSize,
      marginRight: SEARCH_FIELD.iconMarginRight,
      ...(isDark ? {tintColor: c.textSecondary} : {}),
    },
    searchInput: {
      flex: 1,
      fontSize: SEARCH_FIELD.inputFontSize,
      color: c.textPrimary,
      paddingVertical: SEARCH_FIELD.inputPaddingVertical,
    },
    countLine: {fontSize: 12, color: c.textSecondary, marginBottom: 8, paddingHorizontal: 4},
    listContent: {paddingBottom: 32, paddingHorizontal: 16},
    orderCard: {
      backgroundColor: c.card,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: c.border,
      padding: 14,
      marginBottom: 12,
      shadowColor: isDark ? 'transparent' : '#000',
      shadowOffset: {width: 0, height: 1},
      shadowOpacity: isDark ? 0 : 0.06,
      shadowRadius: 4,
    },
    cardTop: {flexDirection: 'row', alignItems: 'center'},
    fundLogo: {width: 40, height: 40, borderRadius: 8, marginRight: 12},
    fundLogoPh: {
      backgroundColor: isDark ? '#1E3A5F' : '#EFF6FF',
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: isDark ? c.border : '#BFDBFE',
    },
    fundLogoLetter: {...Textstyles.medium, fontSize: 16, fontWeight: '500', color: c.primary},
    fundName: {flex: 1, fontSize: 15, ...Textstyles.medium, fontWeight: '600', color: c.textPrimary, lineHeight: 20},
    cardChev: {width: 12, height: 12, tintColor: c.textSecondary, marginLeft: 4},
    cardGrid: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      justifyContent: 'space-between',
      marginTop: 14,
      paddingTop: 14,
      borderTopWidth: 1,
      borderTopColor: c.border,
    },
    cardColLeft: {flex: 1, minWidth: 0, alignItems: 'flex-start', paddingRight: 6},
    cardColCenter: {flex: 1, minWidth: 0, alignItems: 'center', paddingHorizontal: 4},
    cardColRight: {flex: 1, minWidth: 0, alignItems: 'flex-end', paddingLeft: 6},
    cellLabel: {fontSize: 10, color: c.textSecondary, textTransform: 'uppercase', marginBottom: 6},
    cellLabelCenter: {textAlign: 'center', alignSelf: 'center'},
    cellLabelRight: {textAlign: 'right', alignSelf: 'stretch'},
    cellType: {fontSize: 13, ...Textstyles.medium, fontWeight: '600', color: c.textPrimary},
    cellAmt: {fontSize: 14, ...Textstyles.medium, fontWeight: '500', color: c.textPrimary, marginTop: 2},
    cellVal: {fontSize: 13, ...Textstyles.medium, fontWeight: '600', color: c.textPrimary},
    cellValCenter: {textAlign: 'center'},
    statusBadgeWrap: {width: '100%', alignItems: 'flex-end', marginTop: 0},
    statusPill: {
      paddingHorizontal: 8,
      paddingVertical: 5,
      borderRadius: 8,
      maxWidth: '100%',
    },
    statusPillTxt: {...Textstyles.medium, fontSize: 11, fontWeight: '500'},
    payNowBtn: {
      marginTop: 12,
      backgroundColor: c.success,
      borderRadius: 10,
      paddingVertical: 10,
      alignItems: 'center',
    },
    payNowTxt: {...Textstyles.medium, color: '#FFFFFF', fontSize: 14, fontWeight: '500'},
    errorBanner: {
      marginHorizontal: 16,
      marginTop: 8,
      marginBottom: 8,
      padding: 12,
      backgroundColor: isDark ? 'rgba(248,113,113,0.12)' : '#FEF2F2',
      borderRadius: 8,
      borderWidth: 1,
      borderColor: isDark ? 'rgba(248,113,113,0.35)' : '#FECACA',
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    errorText: {flex: 1, color: c.danger, fontSize: 14},
    retry: {...Textstyles.medium, color: c.primary, fontWeight: '600'},
    emptyCard: {
      backgroundColor: c.card,
      borderRadius: 12,
      padding: 28,
      alignItems: 'center',
      borderWidth: 1,
      borderColor: c.border,
      marginTop: 8,
    },
    emptyTitle: {fontSize: 16, color: c.textPrimary, marginBottom: 8},
    emptySub: {fontSize: 14, color: c.textSecondary, textAlign: 'center', marginBottom: 16},
    cta: {
      backgroundColor: c.primary,
      paddingVertical: 12,
      paddingHorizontal: 24,
      borderRadius: 10,
    },
    ctaTxt: {...Textstyles.medium, color: '#FFFFFF', fontSize: 15},
    filterModalRoot: {flex: 1, justifyContent: 'flex-end'},
    filterDim: {...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.45)'},
    filterSheet: {
      backgroundColor: c.card,
      borderTopLeftRadius: 16,
      borderTopRightRadius: 16,
      paddingBottom: 28,
      paddingHorizontal: 16,
    },
    filterGrabber: {
      alignSelf: 'center',
      width: 40,
      height: 4,
      borderRadius: 2,
      backgroundColor: c.border,
      marginTop: 8,
      marginBottom: 12,
    },
    filterHead: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 16,
    },
    filterTitle: {...Textstyles.heading, fontSize: typeScale.title, fontWeight: '700', color: c.textPrimary},
    clearFilterTxt: {...Textstyles.medium, fontSize: 15, fontWeight: '600', color: c.primary},
    filterSectionLabel: {...Textstyles.medium, fontSize: 13, fontWeight: '600', color: c.textSecondary, marginBottom: 10},
    chipRow: {flexDirection: 'row', flexWrap: 'wrap', marginBottom: 18},
    chip: {
      paddingHorizontal: 14,
      paddingVertical: 10,
      borderRadius: 22,
      borderWidth: 1,
      borderColor: c.border,
      backgroundColor: c.inputBg,
      marginRight: 8,
      marginBottom: 8,
    },
    chipOn: {
      backgroundColor: c.primary,
      borderColor: c.primary,
    },
    chipTxt: {...Textstyles.medium, fontSize: 12, color: c.textSecondary, fontWeight: '600'},
    chipTxtOn: {color: '#FFFFFF'},
    filterActions: {flexDirection: 'row', marginTop: 8},
    filterBtnCancel: {
      flex: 1,
      marginRight: 8,
      paddingVertical: 14,
      borderRadius: 10,
      borderWidth: 1.5,
      borderColor: c.primary,
      alignItems: 'center',
    },
    filterBtnCancelTxt: {...Textstyles.medium, fontSize: typeScale.bodyLg, fontWeight: '500', color: c.primary},
    filterBtnApply: {
      flex: 1,
      marginLeft: 8,
      paddingVertical: 14,
      borderRadius: 10,
      backgroundColor: c.primary,
      alignItems: 'center',
    },
    filterBtnApplyTxt: {...Textstyles.medium, fontSize: typeScale.bodyLg, fontWeight: '500', color: '#FFFFFF'},
  });
}

const STATUS_OPTIONS = [
  {key: 'all', label: 'All'},
  {key: 'IN_PROGRESS', label: 'InProgress'},
  {key: 'FAILED', label: 'Failed'},
  {key: 'COMPLETED', label: 'Completed'},
  {key: 'CANCELLED', label: 'Cancelled'},
];

const TYPE_OPTIONS = [
  {key: 'all', label: 'All'},
  {key: 'redeem', label: 'Redeem'},
  {key: 'lumpsum', label: 'One-time'},
  {key: 'sip', label: 'SIP'},
];

/** Maps UI order-type keys to API `type` query (website list endpoint). */
function mapTypeFilterToApi(typeFilter) {
  if (!typeFilter || typeFilter === 'all') {
    return '';
  }
  const map = {sip: 'SIP', redeem: 'REDEEM', lumpsum: 'LUMPSUM'};
  return map[typeFilter] ?? String(typeFilter).toUpperCase();
}

/** Client-side guard when the list API ignores filter params. */
function orderMatchesStatusFilter(item, statusFilter) {
  if (statusFilter === 'all') {
    return true;
  }
  const status = pickOrderStatus(item);
  const key = normalizeStatusKey(status);
  const hay = normalizeStatusKey(
    [status, item?.order_status, item?.payment_status, item?.state, item?.auth_status].filter(Boolean).join(' '),
  );
  const blob = `${key} ${hay}`;
  if (statusFilter === 'IN_PROGRESS') {
    return (
      blob.includes('IN_PROGRESS') ||
      blob.includes('PROGRESS') ||
      blob.includes('PENDING') ||
      blob.includes('PROCESS') ||
      blob.includes('AUTH') ||
      blob.includes('NEW')
    );
  }
  if (statusFilter === 'FAILED') {
    return blob.includes('FAIL') || blob.includes('REJECT');
  }
  if (statusFilter === 'COMPLETED') {
    return (
      blob.includes('COMPLETE') ||
      blob.includes('SUCCESS') ||
      blob.includes('EXECUTED') ||
      blob.includes('SETTLED') ||
      blob.includes('PAID')
    );
  }
  if (statusFilter === 'CANCELLED') {
    return blob.includes('CANCEL');
  }
  return key.includes(statusFilter);
}

function orderMatchesTypeFilter(item, typeFilter) {
  if (typeFilter === 'all') {
    return true;
  }
  const label = formatOrderTypeLabel(pickOrderType(item));
  if (typeFilter === 'sip') {
    return label === 'SIP';
  }
  if (typeFilter === 'redeem') {
    return label === 'Redeem';
  }
  if (typeFilter === 'lumpsum') {
    return label === 'One-time';
  }
  return true;
}

function formatInr(value) {
  if (value === null || value === undefined || value === '') {
    return '—';
  }
  const n = Number(value);
  if (Number.isNaN(n)) {
    return String(value);
  }
  return `₹ ${n.toLocaleString('en-IN', {minimumFractionDigits: 0, maximumFractionDigits: 2})}`;
}

function formatDate(raw) {
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

function StatusBadge({label, styles, isDark}) {
  const raw = label || '—';
  const key = normalizeStatusKey(raw);
  let bg = isDark ? '#2C2C2C' : '#F3F4F6';
  let fg = isDark ? '#E5E7EB' : '#374151';

  if (key.includes('FAIL') || key.includes('REJECT')) {
    bg = isDark ? 'rgba(248,113,113,0.2)' : '#FEE2E2';
    fg = isDark ? '#FCA5A5' : '#DC2626';
  } else if (key.includes('SUCCESS') || key.includes('COMPLETE') || key.includes('EXECUTED')) {
    bg = isDark ? 'rgba(34,197,94,0.2)' : '#DCFCE7';
    fg = isDark ? '#86EFAC' : '#15803D';
  } else if (key.includes('PROGRESS') || key.includes('PENDING') || key.includes('PROCESS')) {
    bg = isDark ? 'rgba(251,191,36,0.15)' : '#FEF3C7';
    fg = isDark ? '#FCD34D' : '#D97706';
  }

  return (
    <View style={[styles.statusPill, {backgroundColor: bg}]}>
      <Text style={[styles.statusPillTxt, {color: fg}]} numberOfLines={1}>
        {raw}
      </Text>
    </View>
  );
}

function FundLogo({name, uri, styles}) {
  if (uri) {
    return <Image source={{uri}} style={styles.fundLogo} resizeMode="contain" />;
  }
  const letter = (name || '?')[0]?.toUpperCase() ?? '?';
  return (
    <View style={[styles.fundLogo, styles.fundLogoPh]}>
      <Text style={styles.fundLogoLetter}>{letter}</Text>
    </View>
  );
}

function FilterSlidersIcon({styles, tintColor}) {
  return (
    <View style={styles.filterIconWrap}>
      <Image resizeMode="contain" source={Icons.FilterBlack} style={[styles.filterIcon, tintColor ? {tintColor} : null]} />
    </View>
  );
}

function pickOrderNumber(item) {
  return (
    item?.bse_order_id ??
    item?.order_id ??
    item?.order_number ??
    item?.order_no ??
    item?.transaction_number ??
    item?.id
  );
}

function canShowPayNow(item) {
  const status = pickOrderStatus(item);
  const completionSignals = [status, item?.order_status, item?.state, item?.payment_status]
    .filter(Boolean)
    .join(' ');
  const completeKey = normalizeStatusKey(completionSignals);
  const paymentKey = normalizeStatusKey(
    [status, item?.payment_status, item?.payment_state, item?.payment_required].filter(Boolean).join(' '),
  );
  const isAlreadyComplete =
    completeKey.includes('SUCCESS') ||
    completeKey.includes('COMPLETE') ||
    completeKey.includes('EXECUTED') ||
    completeKey.includes('SETTLED') ||
    completeKey.includes('PAID');

  const statusSignals = [
    status,
    item?.remarks,
    item?.order_status,
    item?.state,
    item?.payment_status,
    item?.auth_status,
  ]
    .filter(Boolean)
    .join(' ');

  const hasAuthMarker =
    !!item?.authenticated_at ||
    !!item?.auth_date ||
    !!item?.verified_at ||
    item?.is_authenticated === true ||
    String(item?.auth_status ?? '').toUpperCase() === 'Y';

  return (
    pickOrderNumber(item) != null &&
    !isAlreadyComplete &&
    !paymentKey.includes('PAYMENT_CONFIRMED') &&
    !paymentKey.includes('PAID') &&
    (isAuthenticatedOrderState(statusSignals) || hasAuthMarker)
  );
}

function OrderCard({item, onPressOrder, onPayNow, payingOrderId, styles, isDark}) {
  const name = pickOrderTitle(item);
  const typeLabel = formatOrderTypeLabel(pickOrderType(item));
  const amount = formatInr(pickOrderAmountRaw(item));
  const investDate = formatDate(pickOrderDate(item));
  const status = pickOrderStatus(item);
  const logo = item.logo_url ?? item.logo;
  const orderId = pickOrderNumber(item);
  const canPayNow = canShowPayNow(item);

  return (
    <TouchableOpacity style={styles.orderCard} onPress={() => onPressOrder(item)} activeOpacity={0.75}>
      <View style={styles.cardTop}>
        <FundLogo name={name} uri={logo} styles={styles} />
        <Text style={styles.fundName} numberOfLines={2}>
          {name}
        </Text>
        <Image source={Icons.GoIcon} style={styles.cardChev} resizeMode="contain" />
      </View>
      <View style={styles.cardGrid}>
        <View style={styles.cardColLeft}>
          <Text style={styles.cellLabel}>Type & Amount</Text>
          <Text style={styles.cellType}>{typeLabel}</Text>
          <Text style={styles.cellAmt}>{amount}</Text>
        </View>
        <View style={styles.cardColCenter}>
          <Text style={[styles.cellLabel, styles.cellLabelCenter]}>Investment Date</Text>
          <Text style={[styles.cellVal, styles.cellValCenter]}>{investDate}</Text>
        </View>
        <View style={styles.cardColRight}>
          <Text style={[styles.cellLabel, styles.cellLabelRight]}>Status</Text>
          <View style={styles.statusBadgeWrap}>
            <StatusBadge label={status} styles={styles} isDark={isDark} />
          </View>
        </View>
      </View>
      {canPayNow ? (
        <TouchableOpacity
          style={styles.payNowBtn}
          onPress={() => onPayNow(item)}
          activeOpacity={0.9}
          disabled={String(payingOrderId) === String(orderId)}>
          <Text style={styles.payNowTxt}>
            {String(payingOrderId) === String(orderId) ? 'Processing...' : 'Pay Now'}
          </Text>
        </TouchableOpacity>
      ) : null}
    </TouchableOpacity>
  );
}

function FilterSheet({
  visible,
  onClose,
  draftStatus,
  draftType,
  onChangeDraftStatus,
  onChangeDraftType,
  onApply,
  onClear,
  styles,
}) {
  return (
    <AppModal
      visible={visible}
      onClose={onClose}
      title="Filter"
      isBottomSheet
      showActions
      onCancel={onClose}
      onApply={onApply}>
      <View style={styles.filterHead}>
        <View />
        <TouchableOpacity onPress={onClear} hitSlop={10}>
          <Text style={styles.clearFilterTxt}>Clear Filter</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.filterSectionLabel}>Status</Text>
      <View style={styles.chipRow}>
        {STATUS_OPTIONS.map(opt => (
          <TouchableOpacity
            key={opt.key}
            style={[styles.chip, draftStatus === opt.key && styles.chipOn]}
            onPress={() => onChangeDraftStatus(opt.key)}
            activeOpacity={0.85}>
            <Text style={[styles.chipTxt, draftStatus === opt.key && styles.chipTxtOn]}>{opt.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={styles.filterSectionLabel}>Order Type</Text>
      <View style={styles.chipRow}>
        {TYPE_OPTIONS.map(opt => (
          <TouchableOpacity
            key={opt.key}
            style={[styles.chip, draftType === opt.key && styles.chipOn]}
            onPress={() => onChangeDraftType(opt.key)}
            activeOpacity={0.85}>
            <Text style={[styles.chipTxt, draftType === opt.key && styles.chipTxtOn]}>{opt.label}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </AppModal>
  );
}

export default function MyOrdersScreen() {
  const navigation = useNavigation();
  const {colors, isDark} = useAppTheme();
  const styles = useMemo(() => createMyOrdersStyles(colors, isDark), [colors, isDark]);
  const showBack = navigation.canGoBack();
  const user = useSelector(s => s.auth.user);

  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');

  const [filterOpen, setFilterOpen] = useState(false);
  const [draftStatus, setDraftStatus] = useState('all');
  const [draftType, setDraftType] = useState('all');
  const [payingOrderId, setPayingOrderId] = useState(null);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search.trim()), 400);
    return () => clearTimeout(t);
  }, [search]);

  const listParams = useMemo(
    () => ({
      page: 1,
      page_size: 50,
      search: debouncedSearch,
      status: statusFilter === 'all' ? '' : statusFilter,
      type: mapTypeFilterToApi(typeFilter),
    }),
    [debouncedSearch, statusFilter, typeFilter],
  );

  const {data, isPending, error, refreshing, refetch} = useOrdersData(listParams);

  const skipFocusRefetchOnceRef = useRef(true);
  useFocusEffect(
    useCallback(() => {
      if (skipFocusRefetchOnceRef.current) {
        skipFocusRefetchOnceRef.current = false;
        return;
      }
      refetch();
    }, [refetch]),
  );

  const rawOrders = data?.results ?? EMPTY_ORDERS;
  const orders = useMemo(
    () =>
      rawOrders.filter(
        o => orderMatchesStatusFilter(o, statusFilter) && orderMatchesTypeFilter(o, typeFilter),
      ),
    [rawOrders, statusFilter, typeFilter],
  );
  const totalCount = data?.count ?? rawOrders.length;

  const openFilter = useCallback(() => {
    setDraftStatus(statusFilter);
    setDraftType(typeFilter);
    setFilterOpen(true);
  }, [statusFilter, typeFilter]);

  const clearFilters = useCallback(() => {
    setDraftStatus('all');
    setDraftType('all');
    setStatusFilter('all');
    setTypeFilter('all');
    setFilterOpen(false);
  }, []);

  const applyFilters = useCallback(() => {
    setStatusFilter(draftStatus);
    setTypeFilter(draftType);
    setFilterOpen(false);
    if (__DEV__) {
      console.log('[MyOrders] filter apply → list refetch', {
        status: draftStatus === 'all' ? '' : draftStatus,
        type: mapTypeFilterToApi(draftType),
        search: debouncedSearch,
        listEndpoint: '/api/journey/mf/order/list/',
      });
    }
  }, [draftStatus, draftType, debouncedSearch]);

  useEffect(() => {
    if (!__DEV__) {
      return;
    }
    const sample = orders.slice(0, 8).map(o => ({
      id: pickOrderNumber(o),
      status: pickOrderStatus(o),
      order_status: o?.order_status,
      payment_status: o?.payment_status,
      auth_status: o?.auth_status,
      authenticated_at: o?.authenticated_at,
      canPayNow: canShowPayNow(o),
    }));
    // console.log('[MyOrders] pay-now snapshot', sample);
  }, [orders]);

  const onPressOrder = useCallback(
    item => {
      navigation.navigate('OrderDetail', {order: item});
    },
    [navigation],
  );

  const onPayNow = useCallback(
    async item => {
      const orderNumber = pickOrderNumber(item);
      const totalAmount = Number(String(pickOrderAmountRaw(item)).replace(/,/g, '')) || 0;
      const clientCode = user?.client_code ?? user?.ucc_code ?? user?.ucc;
      if (!orderNumber || !clientCode || !totalAmount) {
        appAlert('Pay Now', 'Required payment fields missing for this order.');
        return;
      }
      try {
        setPayingOrderId(orderNumber);
        if (__DEV__) {
          console.log('[MyOrders] pay-now request', {
            orderNumber,
            totalAmount,
            status: pickOrderStatus(item),
            order_status: item?.order_status,
            payment_status: item?.payment_status,
            auth_status: item?.auth_status,
          });
        }
        const res = await processOrderPayment({
          clientCode,
          modeOfPayment: 'DIRECT',
          orderNumber,
          totalAmount,
        });
        const url = extractOrderAuthUrl(res?.data);
        if (__DEV__) {
          console.log('[MyOrders] pay-now response', {orderNumber, hasUrl: !!url, data: res?.data});
        }
        if (url) {
          navigation.navigate('MandateAuthWebview', {uri: url, title: 'Complete payment'});
        } else {
          appAlert('Pay Now', 'Payment URL not found for this order.');
        }
      } finally {
        setPayingOrderId(null);
      }
    },
    [navigation, user],
  );

  const renderItem = useCallback(
    ({item}) => (
      <OrderCard
        item={item}
        onPressOrder={onPressOrder}
        onPayNow={onPayNow}
        payingOrderId={payingOrderId}
        styles={styles}
        isDark={isDark}
      />
    ),
    [onPressOrder, onPayNow, payingOrderId, styles, isDark],
  );

  const listHeader = useMemo(
    () => (
      <View style={styles.pageHead}>
        <View style={styles.searchCard}>
          <Image source={Icons.SearchIcon} style={styles.searchIconImg} resizeMode="contain" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search orders..."
            placeholderTextColor={colors.muted}
            value={search}
            onChangeText={setSearch}
            returnKeyType="search"
            autoCapitalize="none"
            autoCorrect={false}
          />
        </View>
        <Text style={styles.countLine}>
          {orders.length === 0
            ? '0 orders'
            : `Showing ${orders.length}${totalCount > orders.length ? ` of ${totalCount}` : ''}`}
        </Text>
      </View>
    ),
    [search, orders.length, totalCount, styles, colors.muted],
  );

  const goExplore = useCallback(() => {
    navigation.navigate('MainTabs', {screen: 'Explore'});
  }, [navigation]);

  const headerBar = (
    <View style={styles.headerBar}>
      {showBack ? (
        <View style={styles.headerSlot}>
          <AppBackButton onPress={() => navigation.goBack()} hitSlop={10} />
        </View>
      ) : (
        <View style={styles.headerSlot} />
      )}
      <Text style={styles.headerTitle}>My Orders</Text>
      <TouchableOpacity style={styles.headerSlot} onPress={openFilter} hitSlop={12} accessibilityLabel="Filter orders">
        <FilterSlidersIcon styles={styles} tintColor={colors.textPrimary} />
      </TouchableOpacity>
    </View>
  );

  const showInlineLoader = isPending && !refreshing;

  return (
    <SafeAreaView style={[styles.safe, {backgroundColor: colors.background}]} edges={['top', 'left', 'right']}>
      {headerBar}
      {error ? (
        <View style={styles.errorBanner}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity onPress={() => refetch()} hitSlop={8}>
            <Text style={[styles.retry, {color: colors.primary}]}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : null}

      {showInlineLoader ? (
        <View style={styles.loadingInline}>
          <ActivityIndicator size="small" color={colors.primary} />
          <Text style={[Textstyles.normal, styles.loadingTxtInline, {color: colors.textSecondary}]}>Loading orders…</Text>
        </View>
      ) : null}

      <FlatList
        data={orders}
        keyExtractor={(item, index) => String(item.id ?? item.order_id ?? item.uuid ?? index)}
        renderItem={renderItem}
        ListHeaderComponent={listHeader}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={refetch} tintColor={colors.primary} />
        }
        ListEmptyComponent={
          <View style={styles.emptyCard}>
            <Text style={[Textstyles.medium, styles.emptyTitle]}>No orders</Text>
            <Text style={[Textstyles.normal, styles.emptySub]}>
              {search || statusFilter !== 'all' || typeFilter !== 'all'
                ? 'Try changing search or filters.'
                : 'Buy or SIP from Explore or fund detail.'}
            </Text>
            <TouchableOpacity style={styles.cta} onPress={goExplore} activeOpacity={0.85}>
              <Text style={[Textstyles.medium, styles.ctaTxt]}>Explore funds</Text>
            </TouchableOpacity>
          </View>
        }
        showsVerticalScrollIndicator={false}
      />

      <FilterSheet
        visible={filterOpen}
        onClose={() => setFilterOpen(false)}
        draftStatus={draftStatus}
        draftType={draftType}
        onChangeDraftStatus={setDraftStatus}
        onChangeDraftType={setDraftType}
        onApply={applyFilters}
        onClear={clearFilters}
        styles={styles}
      />
    </SafeAreaView>
  );
}
