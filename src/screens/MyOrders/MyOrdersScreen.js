import React, {useCallback, useEffect, useMemo, useState} from 'react';
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
  Alert,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useNavigation} from '@react-navigation/native';
import {useSelector} from 'react-redux';
import {useOrdersData} from '../../hooks/useOrdersData';
import {Colors} from '../../utils/AppConstant';
import Textstyles from '../../utils/text';
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
import Icons from '../../utils/icons';
import AppModal from '../../components/AppModal';

const PAGE_BG = '#F0F2F5';
const CARD_BORDER = '#E8E8E8';
const THEME_BLUE = '#1A73E8';
const EMPTY_ORDERS = [];

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

function StatusBadge({label}) {
  const raw = label || '—';
  const key = normalizeStatusKey(raw);
  let bg = '#F3F4F6';
  let fg = '#374151';

  if (key.includes('FAIL') || key.includes('REJECT')) {
    bg = '#FEE2E2';
    fg = '#DC2626';
  } else if (key.includes('SUCCESS') || key.includes('COMPLETE') || key.includes('EXECUTED')) {
    bg = '#DCFCE7';
    fg = '#15803D';
  } else if (key.includes('PROGRESS') || key.includes('PENDING') || key.includes('PROCESS')) {
    bg = '#FEF3C7';
    fg = '#D97706';
  }

  return (
    <View style={[styles.statusPill, {backgroundColor: bg}]}>
      <Text style={[styles.statusPillTxt, {color: fg}]} numberOfLines={1}>
        {raw}
      </Text>
    </View>
  );
}

function FundLogo({name, uri}) {
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

function FilterSlidersIcon() {
  return (
    <View style={styles.filterIcon}>
      <Image resizeMode='contain' source={Icons.FilterBlack} style={styles.filterIcon} />
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

function OrderCard({item, onPressOrder, onPayNow, payingOrderId}) {
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
        <FundLogo name={name} uri={logo} />
        <Text style={styles.fundName} numberOfLines={2}>
          {name}
        </Text>
        <Text style={styles.cardChev}>›</Text>
      </View>
      <View style={styles.cardGrid}>
        <View style={styles.cardCell}>
          <Text style={styles.cellLabel}>Type & Amount</Text>
          <Text style={styles.cellType}>{typeLabel}</Text>
          <Text style={styles.cellAmt}>{amount}</Text>
        </View>
        <View style={styles.cardCell}>
          <Text style={styles.cellLabel}>Investment Date</Text>
          <Text style={styles.cellVal}>{investDate}</Text>
        </View>
        <View style={styles.cardCell}>
          <Text style={styles.cellLabel}>Status</Text>
          <StatusBadge label={status} />
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
  const orders = data?.results ?? EMPTY_ORDERS;
  const totalCount = data?.count ?? orders.length;

  const openFilter = useCallback(() => {
    setDraftStatus(statusFilter);
    setDraftType(typeFilter);
    setFilterOpen(true);
  }, [statusFilter, typeFilter]);

  const clearFilters = useCallback(() => {
    setDraftStatus('all');
    setDraftType('all');
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
        Alert.alert('Pay Now', 'Required payment fields missing for this order.');
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
          Alert.alert('Pay Now', 'Payment URL not found for this order.');
        }
      } finally {
        setPayingOrderId(null);
      }
    },
    [navigation, user],
  );

  const renderItem = useCallback(
    ({item}) => (
      <OrderCard item={item} onPressOrder={onPressOrder} onPayNow={onPayNow} payingOrderId={payingOrderId} />
    ),
    [onPressOrder, onPayNow, payingOrderId],
  );

  const listHeader = useMemo(
    () => (
      <View style={styles.pageHead}>
        <View style={styles.searchCard}>
          <Text style={styles.searchIcon}>⌕</Text>
          <TextInput
            style={styles.searchInput}
            placeholder="Search orders..."
            placeholderTextColor={Colors.GREY}
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
    [search, orders.length, totalCount],
  );

  const goExplore = useCallback(() => {
    navigation.navigate('MainTabs', {screen: 'Explore'});
  }, [navigation]);

  const headerBar = (
    <View style={styles.headerBar}>
      {showBack ? (
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn} hitSlop={10}>
          <Text style={styles.backChevron}>‹</Text>
          <Text style={[Textstyles.medium, styles.backLabel]}>Back</Text>
        </TouchableOpacity>
      ) : (
        <View style={styles.headerSide} />
      )}
      <Text style={styles.headerTitle}>My Orders</Text>
      <TouchableOpacity style={styles.headerSide} onPress={openFilter} hitSlop={12} accessibilityLabel="Filter orders">
        <FilterSlidersIcon />
      </TouchableOpacity>
    </View>
  );

  if (isPending && !refreshing) {
    return (
      <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
        {headerBar}
        <View style={styles.loadingBox}>
          <ActivityIndicator size="large" color={THEME_BLUE} />
          <Text style={[Textstyles.normal, styles.loadingTxt]}>Loading orders…</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      {headerBar}
      {error ? (
        <View style={styles.errorBanner}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity onPress={() => refetch()} hitSlop={8}>
            <Text style={styles.retry}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : null}

      <FlatList
        data={orders}
        keyExtractor={(item, index) => String(item.id ?? item.order_id ?? item.uuid ?? index)}
        renderItem={renderItem}
        ListHeaderComponent={listHeader}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={refetch} tintColor={THEME_BLUE} />
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
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {flex: 1, backgroundColor: PAGE_BG},
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: CARD_BORDER,
    backgroundColor: PAGE_BG,
  },
  headerSide: {width: 56, alignItems: 'flex-end', justifyContent: 'center', paddingRight: 4},
  headerTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: '700',
    color: Colors.TEXT_PRIMARY,
    textAlign: 'center',
  },
  backBtn: {flexDirection: 'row', alignItems: 'center', paddingVertical: 4, width: 72},
  backChevron: {fontSize: 28, color: THEME_BLUE, marginRight: 2, marginTop: -2, fontWeight: '400'},
  backLabel: {fontSize: 16, color: THEME_BLUE, fontWeight: '600'},
  filterIcon: {width: 24, height: 24, alignSelf: 'flex-end', justifyContent: 'center', paddingVertical: 4},
  filterBar: {height: 3, backgroundColor: THEME_BLUE, borderRadius: 1, marginBottom: 4},
  filterBarWide: {width: 18, alignSelf: 'flex-end'},
  filterBarNarrow: {width: 14, alignSelf: 'flex-end'},
  loadingBox: {flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24},
  loadingTxt: {marginTop: 12, color: Colors.GREY},
  pageHead: {paddingHorizontal: 16, paddingTop: 8},
  searchCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: CARD_BORDER,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 1},
    shadowOpacity: 0.06,
    shadowRadius: 3,
    // elevation: 2,
  },
  searchIcon: {fontSize: 16, color: Colors.GREY, marginRight: 8},
  searchInput: {flex: 1, fontSize: 15, color: Colors.TEXT_PRIMARY, paddingVertical: 4},
  countLine: {fontSize: 12, color: '#6B7280', marginBottom: 8, paddingHorizontal: 4},
  listContent: {paddingBottom: 32, paddingHorizontal: 16},
  orderCard: {
    backgroundColor: Colors.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: CARD_BORDER,
    padding: 14,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 1},
    shadowOpacity: 0.06,
    shadowRadius: 4,
    // elevation: 2,
  },
  cardTop: {flexDirection: 'row', alignItems: 'center'},
  fundLogo: {width: 40, height: 40, borderRadius: 8, marginRight: 12},
  fundLogoPh: {
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  fundLogoLetter: {fontSize: 16, fontWeight: '500', color: THEME_BLUE},
  fundName: {flex: 1, fontSize: 15, fontWeight: '600', color: '#111827', lineHeight: 20},
  cardChev: {fontSize: 22, color: '#9CA3AF', fontWeight: '300', marginLeft: 2},
  cardGrid: {
    flexDirection: 'row',
    marginTop: 14,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  cardCell: {flex: 1, minWidth: 0, paddingRight: 6},
  cellLabel: {fontSize: 10, color: '#9CA3AF', textTransform: 'uppercase', marginBottom: 6},
  cellType: {fontSize: 13, fontWeight: '600', color: '#111827'},
  cellAmt: {fontSize: 14, fontWeight: '500', color: '#111827', marginTop: 2},
  cellVal: {fontSize: 13, fontWeight: '600', color: '#111827'},
  statusPill: {
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 8,
    alignSelf: 'flex-start',
    maxWidth: '100%',
  },
  statusPillTxt: {fontSize: 11, fontWeight: '500'},
  payNowBtn: {
    marginTop: 12,
    backgroundColor: '#22C55E',
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
  },
  payNowTxt: {color: Colors.white, fontSize: 14, fontWeight: '500'},
  errorBanner: {
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 8,
    padding: 12,
    backgroundColor: '#FEF2F2',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FECACA',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  errorText: {flex: 1, color: '#B91C1C', fontSize: 14},
  retry: {color: THEME_BLUE, fontWeight: '600'},
  emptyCard: {
    backgroundColor: Colors.white,
    borderRadius: 12,
    padding: 28,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: CARD_BORDER,
    marginTop: 8,
  },
  emptyTitle: {fontSize: 16, color: Colors.TEXT_PRIMARY, marginBottom: 8},
  emptySub: {fontSize: 14, color: Colors.GREY, textAlign: 'center', marginBottom: 16},
  cta: {
    backgroundColor: THEME_BLUE,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 10,
  },
  ctaTxt: {color: Colors.white, fontSize: 15},
  filterModalRoot: {flex: 1, justifyContent: 'flex-end'},
  filterDim: {...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.45)'},
  filterSheet: {
    backgroundColor: Colors.white,
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
    backgroundColor: '#E5E7EB',
    marginTop: 8,
    marginBottom: 12,
  },
  filterHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  filterTitle: {fontSize: 18, fontWeight: '700', color: Colors.TEXT_PRIMARY},
  clearFilterTxt: {fontSize: 15, fontWeight: '600', color: THEME_BLUE},
  filterSectionLabel: {fontSize: 13, fontWeight: '600', color: '#6B7280', marginBottom: 10},
  chipRow: {flexDirection: 'row', flexWrap: 'wrap', marginBottom: 18},
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: CARD_BORDER,
    backgroundColor: Colors.white,
    marginRight: 8,
    marginBottom: 8,
  },
  chipOn: {
    backgroundColor: THEME_BLUE,
    borderColor: THEME_BLUE,
  },
  chipTxt: {fontSize: 12, color: '#4B5563', fontWeight: '600'},
  chipTxtOn: {color: Colors.white},
  filterActions: {flexDirection: 'row', marginTop: 8},
  filterBtnCancel: {
    flex: 1,
    marginRight: 8,
    paddingVertical: 14,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: THEME_BLUE,
    alignItems: 'center',
  },
  filterBtnCancelTxt: {fontSize: 16, fontWeight: '500', color: THEME_BLUE},
  filterBtnApply: {
    flex: 1,
    marginLeft: 8,
    paddingVertical: 14,
    borderRadius: 10,
    backgroundColor: THEME_BLUE,
    alignItems: 'center',
  },
  filterBtnApplyTxt: {fontSize: 16, fontWeight: '500', color: Colors.white},
});
