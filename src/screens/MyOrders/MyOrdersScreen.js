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
  ScrollView,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useNavigation} from '@react-navigation/native';
import {navigateToFundDetail} from '../../navigation/navigationRef';
import {pickSchemeCode} from '../../utils/schemeCode';
import {useOrdersData} from '../../hooks/useOrdersData';
import {Colors} from '../../utils/AppConstant';
import Textstyles from '../../utils/text';

const PAGE_BG = '#F0F2F5';
const CARD_BORDER = '#E8E8E8';
const HEADER_ROW_BG = '#F5F6F8';
const THEME_BLUE = '#1890FF';
const EMPTY_ORDERS = [];

function formatInr(value) {
  if (value === null || value === undefined || value === '') {
    return '—';
  }
  const n = Number(value);
  if (Number.isNaN(n)) {
    return String(value);
  }
  return `₹${n.toLocaleString('en-IN', {minimumFractionDigits: 2, maximumFractionDigits: 2})}`;
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

function pickOrderTitle(item) {
  return (
    item.scheme_name ??
    item.base_scheme_name ??
    item.scheme?.scheme_name ??
    item.fund_name ??
    'Order'
  );
}

function pickOrderAmount(item) {
  const v =
    item.amount ??
    item.order_amount ??
    item.total_amount ??
    item.investment_amount ??
    item.nav_amount;
  return formatInr(v);
}

function pickOrderStatus(item) {
  return String(item.status ?? item.order_status ?? item.state ?? '—').trim();
}

function pickOrderType(item) {
  return String(item.order_type ?? item.transaction_type ?? item.type ?? item.side ?? '').trim();
}

function pickOrderDate(item) {
  return (
    item.created_at ??
    item.order_date ??
    item.date ??
    item.nav_date ??
    item.updated_at
  );
}

function normalizeStatusKey(s) {
  return String(s || '').replace(/\s+/g, '_').toUpperCase();
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

function OrderRow({item, index, onPressScheme}) {
  const title = pickOrderTitle(item).toUpperCase();
  const typeLabel = pickOrderType(item) || '—';
  const amount = pickOrderAmount(item);
  const when = formatDate(pickOrderDate(item));
  const code = pickSchemeCode(item);
  const logo = item.logo_url ?? item.logo;

  return (
    <View style={styles.orderCard}>
      <View style={styles.orderRowTop}>
        <Text style={styles.serial}>{String(index + 1).padStart(2, '0')}</Text>
        <FundLogo name={title} uri={logo} />
        <View style={styles.orderNameCol}>
          <Text style={styles.fundNameCaps} numberOfLines={3}>
            {title}
          </Text>
        </View>
      </View>

      <View style={styles.orderGrid}>
        <View style={styles.orderCell}>
          <Text style={styles.cellLabel}>Type</Text>
          <Text style={styles.cellVal}>{typeLabel}</Text>
        </View>
        <View style={styles.orderCell}>
          <Text style={styles.cellLabel}>Amount</Text>
          <Text style={styles.cellVal}>{amount}</Text>
        </View>
        <View style={styles.orderCell}>
          <Text style={styles.cellLabel}>Date</Text>
          <Text style={styles.cellValSmall}>{when}</Text>
        </View>
      </View>

      <View style={styles.orderFooter}>
        <StatusBadge label={pickOrderStatus(item)} />
        {code ? (
          <TouchableOpacity onPress={() => onPressScheme(item)} hitSlop={8} activeOpacity={0.75}>
            <Text style={styles.linkTxt}>View fund</Text>
          </TouchableOpacity>
        ) : null}
      </View>
    </View>
  );
}

const STATUS_FILTERS = [
  {key: 'all', label: 'All status'},
  {key: 'IN_PROGRESS', label: 'In progress'},
  {key: 'SUCCESS', label: 'Success'},
  {key: 'FAILED', label: 'Failed'},
];

const TYPE_FILTERS = [
  {key: 'all', label: 'All type'},
  {key: 'sip', label: 'SIP'},
  {key: 'lumpsum', label: 'One time'},
];

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
  if (filterKey === 'lumpsum') {
    return t.includes('one') || t.includes('lump') || t.includes('purchase') || t === 'buy';
  }
  return true;
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

  const onOpenScheme = useCallback(
    fund => {
      const code = pickSchemeCode(fund);
      if (!code) {
        return;
      }
      navigateToFundDetail(navigation, {
        schemeCode: code,
        schemeName: pickOrderTitle(fund),
      });
    },
    [navigation],
  );

  const renderItem = useCallback(
    ({item, index}) => <OrderRow item={item} index={index} onPressScheme={onOpenScheme} />,
    [onOpenScheme],
  );

  const listHeader = useMemo(
    () => (
      <View style={styles.pageHead}>
        <Text style={styles.pageTitle}>My Orders</Text>

        <View style={styles.card}>
          <View style={styles.searchWrap}>
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

          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
            {STATUS_FILTERS.map(f => (
              <TouchableOpacity
                key={f.key}
                style={[styles.filterChip, statusFilter === f.key && styles.filterChipOn]}
                onPress={() => setStatusFilter(f.key)}
                activeOpacity={0.85}>
                <Text style={[styles.filterChipTxt, statusFilter === f.key && styles.filterChipTxtOn]}>
                  {f.label}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
            {TYPE_FILTERS.map(f => (
              <TouchableOpacity
                key={f.key}
                style={[styles.filterChip, typeFilter === f.key && styles.filterChipOn]}
                onPress={() => setTypeFilter(f.key)}
                activeOpacity={0.85}>
                <Text style={[styles.filterChipTxt, typeFilter === f.key && styles.filterChipTxtOn]}>
                  {f.label}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

        </View>

        <Text style={styles.countLine}>
          {filteredOrders.length === 0
            ? '0 orders'
            : `Showing ${filteredOrders.length}${totalCount > filteredOrders.length ? ` of ${totalCount}` : ''}`}
        </Text>
      </View>
    ),
    [search, statusFilter, typeFilter, filteredOrders.length, totalCount],
  );

  const goExplore = useCallback(() => {
    navigation.navigate('MainTabs', {screen: 'Explore'});
  }, [navigation]);

  if (isPending && !refreshing) {
    return (
      <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
        {showBack ? (
          <View style={styles.topBar}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn} hitSlop={10}>
              <Text style={styles.backChevron}>‹</Text>
              <Text style={[Textstyles.medium, styles.backLabel]}>Back</Text>
            </TouchableOpacity>
          </View>
        ) : null}
        <View style={styles.loadingBox}>
          <ActivityIndicator size="large" color={THEME_BLUE} />
          <Text style={[Textstyles.normal, styles.loadingTxt]}>Loading orders…</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      {showBack ? (
        <View style={styles.topBar}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn} hitSlop={10}>
            <Text style={styles.backChevron}>‹</Text>
            <Text style={[Textstyles.medium, styles.backLabel]}>Back</Text>
          </TouchableOpacity>
        </View>
      ) : null}
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
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {flex: 1, backgroundColor: PAGE_BG},
  topBar: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: CARD_BORDER,
    backgroundColor: PAGE_BG,
  },
  backBtn: {flexDirection: 'row', alignItems: 'center', paddingVertical: 6, paddingHorizontal: 8},
  backChevron: {fontSize: 28, color: THEME_BLUE, marginRight: 2, marginTop: -2, fontWeight: '400'},
  backLabel: {fontSize: 16, color: THEME_BLUE, fontWeight: '600'},
  loadingBox: {flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24},
  loadingTxt: {marginTop: 12, color: Colors.GREY},
  pageHead: {paddingHorizontal: 16, paddingTop: 8},
  pageTitle: {fontSize: 24, fontWeight: '700', color: Colors.TEXT_PRIMARY, marginBottom: 12},
  card: {
    backgroundColor: Colors.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: CARD_BORDER,
    overflow: 'hidden',
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 1},
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: CARD_BORDER,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  searchIcon: {fontSize: 16, color: Colors.GREY, marginRight: 8},
  searchInput: {flex: 1, fontSize: 15, color: Colors.TEXT_PRIMARY, paddingVertical: 4},
  filterScroll: {paddingVertical: 8, paddingHorizontal: 8, maxHeight: 48},
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: CARD_BORDER,
    backgroundColor: Colors.white,
    marginRight: 8,
  },
  filterChipOn: {
    backgroundColor: '#E6F4FF',
    borderColor: THEME_BLUE,
  },
  filterChipTxt: {fontSize: 12, color: '#4B5563', fontWeight: '500'},
  filterChipTxtOn: {color: THEME_BLUE, fontWeight: '600'},
  tableHeadRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: HEADER_ROW_BG,
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderTopWidth: 1,
    borderTopColor: CARD_BORDER,
  },
  th: {fontSize: 10, fontWeight: '700', color: '#374151', textTransform: 'uppercase'},
  thSm: {width: 56, textAlign: 'center'},
  thDate: {width: 76, textAlign: 'center'},
  thStat: {width: 88, textAlign: 'right'},
  countLine: {fontSize: 12, color: '#6B7280', marginBottom: 8, paddingHorizontal: 4},
  listContent: {paddingBottom: 32, paddingHorizontal: 16},
  orderCard: {
    backgroundColor: Colors.white,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: CARD_BORDER,
    padding: 12,
    marginBottom: 10,
  },
  orderRowTop: {flexDirection: 'row', alignItems: 'flex-start'},
  serial: {fontSize: 13, color: '#9CA3AF', width: 28, fontWeight: '600', marginTop: 4},
  fundLogo: {width: 36, height: 36, borderRadius: 6, marginRight: 10},
  fundLogoPh: {
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  fundLogoLetter: {fontSize: 14, fontWeight: '800', color: THEME_BLUE},
  orderNameCol: {flex: 1},
  fundNameCaps: {fontSize: 12, fontWeight: '700', color: '#111827', lineHeight: 17},
  orderGrid: {flexDirection: 'row', flexWrap: 'wrap', marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: '#F3F4F6'},
  orderCell: {width: '33%', marginBottom: 8},
  cellLabel: {fontSize: 10, color: '#9CA3AF', textTransform: 'uppercase', marginBottom: 4},
  cellVal: {fontSize: 13, fontWeight: '600', color: '#111827'},
  cellValSmall: {fontSize: 12, fontWeight: '500', color: '#374151'},
  orderFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  statusPill: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
    maxWidth: '70%',
  },
  statusPillTxt: {fontSize: 11, fontWeight: '700', textTransform: 'uppercase'},
  linkTxt: {fontSize: 14, color: THEME_BLUE, fontWeight: '600'},
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
});
