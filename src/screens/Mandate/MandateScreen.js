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
} from 'react-native';
import {SafeAreaView, useSafeAreaInsets} from 'react-native-safe-area-context';
import {useNavigation} from '@react-navigation/native';
import {useMandateData} from '../../hooks/useMandateData';
import Textstyles from '../../utils/text';
import {
  pickAmount,
  pickBank,
  pickMandateListId,
  pickStartDateDD,
  pickEndDateDD,
  pickStatus,
} from './mandateFieldUtils';
import AddMandateModal from './AddMandateModal';
import AppModal from '../../components/AppModal';
import {useAppTheme} from '../../theme/useAppTheme';
import AppBackButton from '../../components/AppBackButton';
import { Icons } from '../../utils';

const STATUS_OPTIONS = [
  {key: 'all', label: 'All'},
  {key: 'PENDING', label: 'Pending'},
  {key: 'APPROVED', label: 'Completed'},
  {key: 'EXPIRED', label: 'Expired'},
];

const EMPTY_ITEMS = [];

function mapStatusFilterToApi(statusKey) {
  if (!statusKey || statusKey === 'all') {
    return '';
  }
  return String(statusKey);
}

function normalizeSearchText(value) {
  return String(value ?? '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function mandateStatusKeywords(rawStatus) {
  const s = String(rawStatus ?? '').toUpperCase();
  if (s.includes('ACTIVE') || s.includes('APPROVED') || s.includes('SUCCESS') || s.includes('COMPLETE')) {
    return 'active approved completed success done verified';
  }
  if (s.includes('PENDING') || s.includes('PROCESS') || s.includes('WAIT')) {
    return 'pending processing waiting authentication inprogress progress';
  }
  if (s.includes('EXPIR') || s.includes('FAIL') || s.includes('ERROR') || s.includes('REJECT') || s.includes('CANCEL')) {
    return 'expired failed error rejected cancelled inactive';
  }
  return '';
}

function buildMandateSearchBlob(item) {
  const status = pickStatus(item);
  const bseStatus = item?.bse_data?.Status;
  const responseMessage = item?.bse_response_message;
  const rawAmount = item?.mandate_amount ?? item?.amount ?? '';
  const formattedAmount = pickAmount(item);
  const rawKeywords = [
    pickMandateListId(item),
    item?.mandate_id,
    item?.id,
    item?.client_code,
    pickBank(item),
    item?.bank_account_no,
    item?.ifsc_code,
    item?.account_type,
    pickStartDateDD(item),
    pickEndDateDD(item),
    status,
    bseStatus,
    responseMessage,
    rawAmount,
    formattedAmount,
    mandateStatusKeywords(status),
    mandateStatusKeywords(bseStatus),
  ];
  return normalizeSearchText(rawKeywords.join(' '));
}

function StatusBadge({ label, styles, isDark }) {
  const raw = label || '—';
  const key = raw.replace(/\s+/g, '_').toUpperCase();

  let bg = isDark ? '#2C2C2C' : '#F3F4F6';
  let fg = isDark ? '#E5E7EB' : '#374151';
  let icon = null;

  if (
    key.includes('EXPIR') ||
    key.includes('FAIL') ||
    key.includes('REJECT') ||
    key.includes('CANCEL')
  ) {
    bg = isDark ? 'rgba(229,72,77,0.22)' : '#FDEBEC';
    fg = isDark ? '#FCA5A5' : '#E5484D';
    icon = Icons.ExpiredIcon;
  } else if (
    key.includes('SUCCESS') ||
    key.includes('ACTIVE') ||
    key.includes('APPROVED') ||
    key.includes('COMPLETE')
  ) {
    bg = isDark ? 'rgba(46,182,125,0.22)' : '#E8F8EF';
    fg = isDark ? '#86EFAC' : '#2EB67D';
    icon = Icons.CompletedIcon;
  } else if (
    key.includes('PROGRESS') ||
    key.includes('PENDING') ||
    key.includes('PROCESS')
  ) {
    bg = isDark ? 'rgba(233,162,59,0.2)' : '#FFF3E5';
    fg = isDark ? '#FCD34D' : '#E9A23B';
    icon = Icons.PedingIconsFilter;
  }

  return (
    <View
      style={[
        styles.statusPill,
        {
          backgroundColor: bg,
          flexDirection: 'row',
          alignItems: 'center',
        },
      ]}
    >
      {icon && (
        <Image
          source={icon}
          style={[
            styles.statusPillIconImg,
            {marginRight: 6, width: 12, height: 12, tintColor: fg},
          ]}
          resizeMode="contain"
        />
      )}
      <Text
        style={[styles.statusPillTxt, { color: fg }]}
        numberOfLines={1}
      >
        {raw}
      </Text>
    </View>
  );
}

function MandateCard({item, onViewDetails, styles, isDark}) {
  const rawMid = pickMandateListId(item);
  const mid = String(rawMid ?? '').startsWith('#') ? rawMid : `#${rawMid}`;
  const bank = pickBank(item);
  const start = pickStartDateDD(item);
  const end = pickEndDateDD(item);
  const amount = pickAmount(item);
  const status = pickStatus(item);

  return (
    <View style={styles.card}>
      <View style={[styles.cardTop, {backgroundColor: isDark ? '#1E222B' : '#F3F4F6'}]}>
        <Text style={styles.mandateId} numberOfLines={1}>
          {mid}
        </Text>
        <StatusBadge label={status} styles={styles} isDark={isDark} />
      </View>

      <View style={styles.cardGrid}>
        <View style={styles.cardCell}>
          <Text style={styles.cardLabel}>Bank</Text>
          <Text style={styles.cardVal} numberOfLines={2}>
            {bank}
          </Text>
        </View>
        <View style={styles.cardCell}>
          <Text style={styles.cardLabel}>Start Date</Text>
          <Text style={styles.cardVal} numberOfLines={1}>
            {start}
          </Text>
        </View>
        <View style={styles.cardCell}>
          <Text style={styles.cardLabel}>End Date</Text>
          <Text style={styles.cardVal} numberOfLines={1}>
            {end}
          </Text>
        </View>
      </View>

      <View style={styles.cardBottom}>
        <Text style={styles.amountTxt}>{amount}</Text>
        <TouchableOpacity onPress={() => onViewDetails(item)} hitSlop={8} activeOpacity={0.75}>
          <View style={styles.viewDetailsRow}>
            <Text style={styles.viewDetails}>View Details</Text>
            <Image source={Icons.GoIcon} style={styles.viewDetailsIcon} resizeMode="contain" />
          </View>
        </TouchableOpacity>
      </View>
    </View>
  );
}

function MandateFilterSheet({visible, draftStatus, onChangeDraftStatus, onClose, onApply, styles}) {
  return (
    <AppModal
      visible={visible}
      onClose={onClose}
      title="Status"
      isBottomSheet
      maxHeight={'55%'}>
      <View style={styles.filterList}>
        {STATUS_OPTIONS.map((opt, index) => (
          <TouchableOpacity
            key={opt.key}
            style={[styles.filterRow, index !== STATUS_OPTIONS.length - 1 && styles.filterRowBorder]}
            onPress={() => {
              onChangeDraftStatus(opt.key);
              onApply(opt.key);
            }}
            activeOpacity={0.85}>
            <View style={styles.filterRowIcon}>
              {opt.key === 'all' ? 
              <Image source={Icons.AllIcon} style={styles.filterRowIconImg} resizeMode="contain" />
              : opt.key === 'PENDING' ? 
              <Image source={Icons.PedingIconsFilter} style={styles.filterRowIconImg} resizeMode="contain" />
              : opt.key === 'APPROVED' ? <Image source={Icons.CompletedIcon} style={styles.filterRowIconImg} resizeMode="contain" />
              : <Image source={Icons.ExpiredIcon} style={styles.filterRowIconImg} resizeMode="contain" />
              }
            </View>
            <Text style={styles.filterRowLabel}>{opt.label}</Text>
            {draftStatus === opt.key ? <Text style={styles.filterSelectedTick}>✓</Text> : null}
          </TouchableOpacity>
        ))}
      </View>
    </AppModal>
  );
}

export default function MandateScreen() {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const {colors, isDark} = useAppTheme();
  const styles = useMemo(() => createMandateStyles(colors, isDark), [colors, isDark]);
  const showBack = navigation.canGoBack();

  const [statusFilter, setStatusFilter] = useState('all');
  const [draftStatus, setDraftStatus] = useState('all');
  const [filterOpen, setFilterOpen] = useState(false);
  const [search, setSearch] = useState('');

  const listParams = useMemo(
    () => ({
      status: mapStatusFilterToApi(statusFilter),
    }),
    [statusFilter],
  );

  const {data, isPending, error, refreshing, refetch} = useMandateData(listParams);
  const items = data?.results ?? EMPTY_ITEMS;

  const [addOpen, setAddOpen] = useState(false);

  const filtered = useMemo(() => {
    const q = normalizeSearchText(search);
    if (!q) {
      return items;
    }
    const tokens = q.split(' ').filter(Boolean);
    return items.filter(it => {
      const blob = buildMandateSearchBlob(it);
      return tokens.every(token => blob.includes(token));
    });
  }, [items, search]);

  const onViewDetails = useCallback(
    m => {
      navigation.navigate('MandateDetail', {mandate: m});
    },
    [navigation],
  );

  const onOpenAddWeb = useCallback(
    uri => {
      navigation.navigate('MandateAuthWebview', {uri, title: 'Add New Mandate'});
    },
    [navigation],
  );

  const renderItem = useCallback(
    ({item}) => <MandateCard item={item} onViewDetails={onViewDetails} styles={styles} isDark={isDark} />,
    [onViewDetails, styles, isDark],
  );

  const listHeader = useMemo(
    () => (
      <View style={styles.pageHead}>
        <View style={styles.filterHeadRow}>
          <View style={styles.searchWrap}>
            <Image source={Icons.SearchIcon} style={styles.searchIconImg} resizeMode="contain" />
            <TextInput
              style={styles.searchInput}
              value={search}
              onChangeText={setSearch}
              placeholder="Search..."
              placeholderTextColor={colors.textSecondary}
              returnKeyType="search"
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>
          <TouchableOpacity
            style={styles.statusSelect}
            activeOpacity={0.85}
            onPress={() => {
              setDraftStatus(statusFilter);
              setFilterOpen(true);
            }}>
            <Text style={styles.statusSelectText}>
              {STATUS_OPTIONS.find(s => s.key === statusFilter)?.label || 'All'}
            </Text>
            <Image source={Icons.DropDown} style={styles.statusSelectCaret} resizeMode="contain" />
          </TouchableOpacity>
        </View>
      </View>
    ),
    [colors.textSecondary, search, statusFilter, styles],
  );

  const fabBottom = 16 + insets.bottom;

  const headerBar = (
    <View style={styles.headerRow}>
      {showBack ? (
        <View style={styles.headerSlot}>
          <AppBackButton onPress={() => navigation.goBack()} hitSlop={10} />
        </View>
      ) : (
        <View style={styles.headerSlot} />
      )}
      <Text style={styles.navTitle}>Mandate</Text>
      <View style={styles.headerSlot} />
    </View>
  );

  const showInlineLoader = isPending && !refreshing;

  return (
    <SafeAreaView style={[styles.safe, {backgroundColor: colors.background}]} edges={['top', 'left', 'right']}>
      {headerBar}
      {error ? (
        <View style={[styles.errorBanner, {backgroundColor: colors.card, borderColor: colors.border}]}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity onPress={() => refetch()} hitSlop={8}>
            <Text style={[styles.retry, {color: colors.primary}]}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : null}

      {showInlineLoader ? (
        <View style={styles.loadingInline}>
          <ActivityIndicator size="small" color={colors.primary} />
          <Text style={[Textstyles.normal, styles.loadingTxtInline, {color: colors.textSecondary}]}>Loading mandates…</Text>
        </View>
      ) : null}

      <FlatList
        data={filtered}
        keyExtractor={(item, index) => String(item.id ?? item.mandate_id ?? item.umrn ?? index)}
        renderItem={renderItem}
        ListHeaderComponent={listHeader}
        contentContainerStyle={[styles.listContent, {paddingBottom: 88 + insets.bottom}]}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={refetch} tintColor={colors.primary} />
        }
        ListEmptyComponent={
          <View style={[styles.emptyCard, {backgroundColor: colors.card, borderColor: colors.border}]}>
            <Text style={[Textstyles.medium, styles.emptyTitle, {color: colors.textPrimary}]}>No mandates found</Text>
            <Text style={[Textstyles.normal, styles.emptySub, {color: colors.textSecondary}]}>
              When you add a mandate, it will appear here.
            </Text>
          </View>
        }
        showsVerticalScrollIndicator={false}
      />

      <TouchableOpacity
        style={[styles.fab, {bottom: fabBottom, backgroundColor: colors.primary}]}
        onPress={() => setAddOpen(true)}
        activeOpacity={0.9}
        accessibilityLabel="Add mandate">
        <Text style={styles.fabPlus}>+</Text>
      </TouchableOpacity>

      <AddMandateModal
        visible={addOpen}
        onClose={() => setAddOpen(false)}
        onSuccess={() => refetch()}
        onOpenWeb={onOpenAddWeb}
      />

      <MandateFilterSheet
        styles={styles}
        visible={filterOpen}
        draftStatus={draftStatus}
        onChangeDraftStatus={setDraftStatus}
        onClose={() => setFilterOpen(false)}
        onApply={selectedKey => {
          setStatusFilter(selectedKey);
          setFilterOpen(false);
        }}
      />
    </SafeAreaView>
  );
}

function createMandateStyles(colors, isDark) {
  const c = colors;
  return StyleSheet.create({
  safe: {flex: 1, backgroundColor: c.background},
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    minHeight: 44,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: c.border,
    backgroundColor: c.background,
  },
  headerSlot: {width: 44, height: 44, alignItems: 'center', justifyContent: 'center'},
  navTitle: {
    flex: 1,
    fontSize: 20,
    ...Textstyles.heading,
    color: c.textPrimary,
    textAlign: 'center',
  },
  loadingBox: {flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24},
  loadingTxt: {marginTop: 12, color: c.textSecondary},
  pageHead: {paddingHorizontal: 0, paddingTop: 10, paddingBottom: 10},
  filterHeadRow: {flexDirection: 'row', gap: 10},
  searchWrap: {
    flex: 1,
    minHeight: 48,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: c.border,
    backgroundColor: c.card,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  searchIconImg: {
    width: 16,
    height: 16,
    ...(isDark ? {tintColor: c.textSecondary} : {}),
  },
  searchIconTxt: {
    fontSize: 17,
    color: c.textSecondary,
    marginRight: 8,
    lineHeight: 18,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: c.textPrimary,
    paddingVertical: 8,
  },
  statusSelect: {
    minHeight: 48,
    minWidth: 114,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: c.border,
    backgroundColor: c.card,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  statusSelectText: {
    ...Textstyles.medium,
    fontSize: 15,
    color: c.textPrimary,
    fontWeight: '600',
  },
  statusSelectCaret: {
    width: 12,
    height: 12,
    tintColor: c.textSecondary,
  },
  listContent: {paddingHorizontal: 16, paddingTop: 4},
  card: {
    backgroundColor: c.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: c.border,
    padding: 10,
    marginBottom: 14,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.08,
    shadowRadius: 7,
    // elevation: 2,
  },
  cardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 9,
    borderRadius: 10,
    paddingHorizontal: 10,
    minHeight: 40,
    paddingVertical: 7,
  },
  mandateId: {...Textstyles.medium, fontSize: 16, fontWeight: '700', color: c.textPrimary, flex: 1, marginRight: 8},
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingRight: 16,
    paddingVertical: 4,
    height: 30,
    borderRadius: 8,
    maxWidth: '48%',
  },
  statusPillIcon: {fontSize: 10, fontWeight: '700', lineHeight: 14},
  statusPillTxt: {...Textstyles.medium, fontSize: 10.5, fontWeight: '600', textTransform: 'capitalize', lineHeight: 14},
  cardGrid: {
    flexDirection: 'row',
    marginTop: 1,
    paddingTop: 10,
    paddingBottom: 2,
    borderTopWidth: 1,
    borderTopColor: isDark ? c.border : '#ECEFF3',
  },
  cardCell: {flex: 1, minWidth: 0, paddingRight: 6},
  cardLabel: {fontSize: 11.5, color: c.textSecondary, marginBottom: 3},
  cardVal: {...Textstyles.medium, fontSize: 13, fontWeight: '700', color: c.textPrimary},
  cardBottom: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 44,
    justifyContent: 'space-between',
    marginTop: 8,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: isDark ? c.border : '#ECEFF3',
  },
  amountTxt: {...Textstyles.medium, fontSize: 15, fontWeight: '700', color: c.textPrimary, lineHeight: 20},
  viewDetails: {...Textstyles.medium, fontSize: 13.5, fontWeight: '600', color: '#1E81F2'},
  viewDetailsRow: {flexDirection: 'row', alignItems: 'center'},
  viewDetailsIcon: {width: 10, height: 10, tintColor: '#1E81F2', marginLeft: 6},
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
  emptySub: {fontSize: 14, color: c.textSecondary, textAlign: 'center'},
  fab: {
    position: 'absolute',
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: c.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.25,
    shadowRadius: 4,
    // elevation: 6,
  },
  fabPlus: {...Textstyles.normal, fontSize: 32, color: '#FFFFFF', fontWeight: '300', marginTop: -2},

  headerFilterIcon: {width: 22, height: 22},

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
    backgroundColor: '#E5E7EB',
    marginTop: 8,
    marginBottom: 12,
  },
  filterHead: {flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10},
  filterTitle: {fontSize: 18, ...Textstyles.heading, fontWeight: '700', color: c.textPrimary},
  filterList: {
    marginTop: 2,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: c.border,
  },
  filterRow: {
    minHeight: 56,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
  },
  filterRowBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: c.border,
  },
  filterRowIcon: {
    width: 26,
    fontSize: 18,
    color: c.textSecondary,
    textAlign: 'center',
    marginRight: 8,
  },
  filterRowLabel: {
    ...Textstyles.medium,
    flex: 1,
    fontSize: 16,
    color: c.textPrimary,
    fontWeight: '600',
  },
  filterSelectedTick: {
    fontSize: 18,
    color: c.primary,
    fontWeight: '700',
    marginLeft: 8,
  },
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
  filterBtnCancelTxt: {fontSize: 16, ...Textstyles.medium, fontWeight: '600', color: c.primary},
  filterBtnApply: {
    flex: 1,
    marginLeft: 8,
    paddingVertical: 14,
    borderRadius: 10,
    backgroundColor: c.primary,
    alignItems: 'center',
  },
  filterBtnApplyTxt: {fontSize: 16, ...Textstyles.heading, fontWeight: '700', color: '#FFFFFF'},
  filterRowIconImg:{
    width: 18,
    height: 18,
  },
});
}
