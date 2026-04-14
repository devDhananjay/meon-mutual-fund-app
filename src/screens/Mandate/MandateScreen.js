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
import Icons from '../../utils/icons';
import {
  pickAmount,
  pickBank,
  pickMandateListId,
  pickSchemeTitle,
  pickStartDateDD,
  pickEndDateDD,
  pickStatus,
} from './mandateFieldUtils';
import AddMandateModal from './AddMandateModal';
import AppModal from '../../components/AppModal';
import {useAppTheme} from '../../theme/useAppTheme';
import AppBackButton from '../../components/AppBackButton';
import {SEARCH_FIELD} from '../../theme/searchField';

const STATUS_OPTIONS = [
  {key: 'all', label: 'All Status'},
  {key: 'APPROVED', label: 'APPROVED'},
  {key: 'PENDING', label: 'PENDING'},
  {key: 'EXPIRED', label: 'EXPIRED'},
];

const EMPTY_ITEMS = [];

function mapStatusFilterToApi(statusKey) {
  if (!statusKey || statusKey === 'all') {
    return '';
  }
  return String(statusKey);
}

function StatusBadge({label, styles, isDark}) {
  const raw = label || '—';
  const key = raw.replace(/\s+/g, '_').toUpperCase();
  let bg = isDark ? '#2C2C2C' : '#F3F4F6';
  let fg = isDark ? '#E5E7EB' : '#374151';
  if (key.includes('EXPIR') || key.includes('FAIL') || key.includes('REJECT') || key.includes('CANCEL')) {
    bg = isDark ? 'rgba(248,113,113,0.2)' : '#FEE2E2';
    fg = isDark ? '#FCA5A5' : '#DC2626';
  } else if (key.includes('SUCCESS') || key.includes('ACTIVE') || key.includes('APPROVED') || key.includes('COMPLETE')) {
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

function MandateCard({item, onViewDetails, styles, isDark}) {
  const mid = pickMandateListId(item);
  const bank = pickBank(item);
  const start = pickStartDateDD(item);
  const end = pickEndDateDD(item);
  const amount = pickAmount(item);
  const status = pickStatus(item);

  return (
    <View style={styles.card}>
      <View style={styles.cardTop}>
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
          <Text style={styles.viewDetails}>View Details &gt;</Text>
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
      title="Filter"
      isBottomSheet
      showActions
      onCancel={onClose}
      onApply={onApply}>
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

  const listParams = useMemo(
    () => ({
      status: mapStatusFilterToApi(statusFilter),
    }),
    [statusFilter],
  );

  const {data, isPending, error, refreshing, refetch} = useMandateData(listParams);
  const items = data?.results ?? EMPTY_ITEMS;
  const totalCount = data?.count ?? items.length;

  const [search, setSearch] = useState('');
  const [addOpen, setAddOpen] = useState(false);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) {
      return items;
    }
    return items.filter(it => {
      const blob = [
        pickSchemeTitle(it),
        pickBank(it),
        pickMandateListId(it),
        pickStatus(it),
        String(it.umrn ?? ''),
        String(it.id ?? ''),
      ]
        .join(' ')
        .toLowerCase();
      return blob.includes(q);
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
        <View style={styles.searchCard}>
          <Image source={Icons.SearchIcon} style={styles.searchIconImg} resizeMode="contain" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search mandates…"
            placeholderTextColor={colors.muted}
            value={search}
            onChangeText={setSearch}
            returnKeyType="search"
            autoCapitalize="none"
            autoCorrect={false}
          />
        </View>
        <Text style={styles.countLine}>
          {filtered.length === 0
            ? '0 mandates'
            : `Showing ${filtered.length}${totalCount > filtered.length ? ` of ${totalCount}` : ''}`}
        </Text>
      </View>
    ),
    [search, filtered.length, totalCount, styles, colors.muted],
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
      <TouchableOpacity
        style={styles.headerSlot}
        onPress={() => {
          setDraftStatus(statusFilter);
          setFilterOpen(true);
        }}
        hitSlop={12}
        accessibilityLabel="Filter mandates">
        <Image
          source={Icons.FilterBlack}
          style={[styles.headerFilterIcon, {tintColor: colors.textPrimary}]}
          resizeMode="contain"
        />
      </TouchableOpacity>
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
              {search.trim()
                ? 'Try a different search.'
                : 'When you add a mandate, it will appear here.'}
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
        onApply={() => {
          setStatusFilter(draftStatus);
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
  pageHead: {paddingHorizontal: 0, paddingTop: 8},
  searchCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: c.card,
    borderRadius: SEARCH_FIELD.borderRadius,
    borderWidth: 1,
    borderColor: c.border,
    paddingHorizontal: SEARCH_FIELD.paddingHorizontal,
    paddingVertical: SEARCH_FIELD.paddingVertical,
    minHeight: SEARCH_FIELD.minHeight,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 1},
    shadowOpacity: 0.06,
    shadowRadius: 3,
    // elevation: 2,
  },
  searchIconImg: {
    width: SEARCH_FIELD.iconSize,
    height: SEARCH_FIELD.iconSize,
    marginRight: SEARCH_FIELD.iconMarginRight,
  },
  searchInput: {
    flex: 1,
    fontSize: SEARCH_FIELD.inputFontSize,
    color: c.textPrimary,
    paddingVertical: SEARCH_FIELD.inputPaddingVertical,
  },
  countLine: {fontSize: 12, color: c.textSecondary, marginBottom: 8, paddingHorizontal: 4},
  listContent: {paddingHorizontal: 16, paddingTop: 4},
  card: {
    backgroundColor: c.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: c.border,
    padding: 14,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 1},
    shadowOpacity: 0.06,
    shadowRadius: 4,
    // elevation: 2,
  },
  cardTop: {flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12},
  mandateId: {...Textstyles.medium, fontSize: 16, fontWeight: '500', color: c.textPrimary, flex: 1, marginRight: 8},
  statusPill: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    maxWidth: '48%',
  },
  statusPillTxt: {...Textstyles.medium, fontSize: 11, fontWeight: '500', textTransform: 'capitalize'},
  cardGrid: {flexDirection: 'row', marginTop: 4, paddingTop: 12, borderTopWidth: 1, borderTopColor: isDark ? c.border : '#F3F4F6'},
  cardCell: {flex: 1, minWidth: 0, paddingRight: 6},
  cardLabel: {fontSize: 10, color: c.textSecondary, textTransform: 'uppercase', marginBottom: 4},
  cardVal: {...Textstyles.medium, fontSize: 13, fontWeight: '600', color: c.textPrimary},
  cardBottom: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: isDark ? c.border : '#F3F4F6',
  },
  amountTxt: {...Textstyles.medium, fontSize: 20, fontWeight: '500', color: c.textPrimary},
  viewDetails: {...Textstyles.medium, fontSize: 15, fontWeight: '600', color: c.primary},
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
  filterSectionLabel: {fontSize: 13, ...Textstyles.medium, fontWeight: '600', color: c.textSecondary, marginBottom: 10},
  chipRow: {flexDirection: 'row', flexWrap: 'wrap', marginBottom: 18},
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: c.border,
    backgroundColor: c.card,
    marginRight: 8,
    marginBottom: 8,
  },
  chipOn: {
    backgroundColor: c.primary,
    borderColor: c.primary,
  },
  chipTxt: {fontSize: 12, ...Textstyles.medium, color: '#4B5563', fontWeight: '600'},
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
});
}
