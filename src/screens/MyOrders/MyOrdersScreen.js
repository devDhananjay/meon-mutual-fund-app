import React, {useCallback, useMemo, useState} from 'react';
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
  Modal,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useNavigation} from '@react-navigation/native';
import {useOrdersData} from '../../hooks/useOrdersData';
import {Colors} from '../../utils/AppConstant';
import Textstyles from '../../utils/text';
import {
  pickOrderTitle,
  pickOrderAmountRaw,
  pickOrderStatus,
  pickOrderType,
  pickOrderDate,
  formatOrderTypeLabel,
  normalizeStatusKey,
} from './orderHelpers';

const PAGE_BG = '#F0F2F5';
const CARD_BORDER = '#E8E8E8';
const THEME_BLUE = '#1A73E8';
const EMPTY_ORDERS = [];

const STATUS_OPTIONS = [
  {key: 'all', label: 'All'},
  {key: 'IN_PROGRESS', label: 'InProgress'},
  {key: 'FAILED', label: 'Failed'},
  {key: 'SUCCESS', label: 'Success'},
];

const TYPE_OPTIONS = [
  {key: 'all', label: 'All'},
  {key: 'redeem', label: 'Redeem'},
  {key: 'lumpsum', label: 'One-time'},
  {key: 'sip', label: 'SIP'},
];

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
      <View style={[styles.filterBar, styles.filterBarWide]} />
      <View style={[styles.filterBar, styles.filterBarNarrow]} />
      <View style={[styles.filterBar, styles.filterBarWide]} />
    </View>
  );
}

function OrderCard({item, onPressOrder}) {
  const name = pickOrderTitle(item);
  const typeLabel = formatOrderTypeLabel(pickOrderType(item));
  const amount = formatInr(pickOrderAmountRaw(item));
  const investDate = formatDate(pickOrderDate(item));
  const status = pickOrderStatus(item);
  const logo = item.logo_url ?? item.logo;

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
    </TouchableOpacity>
  );
}

function matchesStatusFilter(item, filterKey) {
  if (filterKey === 'all') {
    return true;
  }
  const s = normalizeStatusKey(pickOrderStatus(item));
  if (filterKey === 'IN_PROGRESS') {
    return s.includes('PROGRESS') || s.includes('PENDING') || s.includes('PROCESS');
  }
  if (filterKey === 'SUCCESS') {
    return s.includes('SUCCESS') || s.includes('COMPLETE') || s.includes('EXECUTED');
  }
  if (filterKey === 'FAILED') {
    return s.includes('FAIL') || s.includes('REJECT');
  }
  return true;
}

function matchesTypeFilter(item, filterKey) {
  if (filterKey === 'all') {
    return true;
  }
  const t = pickOrderType(item).toLowerCase();
  if (filterKey === 'sip') {
    return t.includes('sip');
  }
  if (filterKey === 'redeem') {
    return t.includes('redeem') || t.includes('redemption') || t === 'sell';
  }
  if (filterKey === 'lumpsum') {
    return (
      (t.includes('one') || t.includes('lump') || t.includes('purchase') || t === 'buy') && !t.includes('sip')
    );
  }
  return true;
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
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.filterModalRoot}>
        <TouchableOpacity style={styles.filterDim} activeOpacity={1} onPress={onClose} />
        <View style={styles.filterSheet}>
          <View style={styles.filterGrabber} />
          <View style={styles.filterHead}>
            <Text style={styles.filterTitle}>Filter</Text>
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

          <View style={styles.filterActions}>
            <TouchableOpacity style={styles.filterBtnCancel} onPress={onClose} activeOpacity={0.85}>
              <Text style={styles.filterBtnCancelTxt}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.filterBtnApply} onPress={onApply} activeOpacity={0.9}>
              <Text style={styles.filterBtnApplyTxt}>Apply</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

export default function MyOrdersScreen() {
  const navigation = useNavigation();
  const showBack = navigation.canGoBack();
  const {data, isPending, error, refreshing, refetch} = useOrdersData();
  const orders = data?.results ?? EMPTY_ORDERS;
  const totalCount = data?.count ?? orders.length;

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');

  const [filterOpen, setFilterOpen] = useState(false);
  const [draftStatus, setDraftStatus] = useState('all');
  const [draftType, setDraftType] = useState('all');

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
  }, [draftStatus, draftType]);

  const filteredOrders = useMemo(() => {
    const q = search.trim().toLowerCase();
    return orders.filter(o => {
      if (!matchesStatusFilter(o, statusFilter)) {
        return false;
      }
      if (!matchesTypeFilter(o, typeFilter)) {
        return false;
      }
      if (!q) {
        return true;
      }
      const title = pickOrderTitle(o).toLowerCase();
      return title.includes(q);
    });
  }, [orders, search, statusFilter, typeFilter]);

  const onPressOrder = useCallback(
    item => {
      navigation.navigate('OrderDetail', {order: item});
    },
    [navigation],
  );

  const renderItem = useCallback(
    ({item}) => <OrderCard item={item} onPressOrder={onPressOrder} />,
    [onPressOrder],
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
          {filteredOrders.length === 0
            ? '0 orders'
            : `Showing ${filteredOrders.length}${totalCount > filteredOrders.length ? ` of ${totalCount}` : ''}`}
        </Text>
      </View>
    ),
    [search, filteredOrders.length, totalCount],
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
        data={filteredOrders}
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
  filterIcon: {alignItems: 'flex-end', justifyContent: 'center', paddingVertical: 4},
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
    elevation: 2,
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
    elevation: 2,
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
  fundLogoLetter: {fontSize: 16, fontWeight: '800', color: THEME_BLUE},
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
  cellAmt: {fontSize: 14, fontWeight: '700', color: '#111827', marginTop: 2},
  cellVal: {fontSize: 13, fontWeight: '600', color: '#111827'},
  statusPill: {
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 8,
    alignSelf: 'flex-start',
    maxWidth: '100%',
  },
  statusPillTxt: {fontSize: 11, fontWeight: '700'},
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
  filterBtnCancelTxt: {fontSize: 16, fontWeight: '700', color: THEME_BLUE},
  filterBtnApply: {
    flex: 1,
    marginLeft: 8,
    paddingVertical: 14,
    borderRadius: 10,
    backgroundColor: THEME_BLUE,
    alignItems: 'center',
  },
  filterBtnApplyTxt: {fontSize: 16, fontWeight: '700', color: Colors.white},
});
