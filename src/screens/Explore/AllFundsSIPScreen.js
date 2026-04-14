import React, {useCallback, useEffect, useMemo, useState} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  FlatList,
  Image,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useNavigation} from '@react-navigation/native';

import {useAllFunds} from '../../hooks/useAllFunds';
import {navigateToFundDetail} from '../../navigation/navigationRef';
import {pickSchemeCode} from '../../utils/schemeCode';
import {Colors} from '../../utils/AppConstant';
import Textstyles from '../../utils/text';
import Icons from '../../utils/icons';
import AppBackButton from '../../components/AppBackButton';
import {SEARCH_FIELD} from '../../theme/searchField';

function mapResultsToFunds(data) {
  if (!data?.results?.length) {
    return [];
  }
  return data.results.map((scheme, index) => {
    const code = pickSchemeCode(scheme);
    const rowId =
      code ??
      (scheme.scheme_id != null ? String(scheme.scheme_id) : undefined) ??
      (scheme.scheme_master_id != null ? String(scheme.scheme_master_id) : undefined) ??
      String(index);

    return {
      ...scheme,
      id: rowId,
      scheme_code: code,
      name: scheme?.base_scheme_name || scheme.name || 'Unnamed Fund',
      category: scheme?.scheme_type,
      return1yr: scheme?.returns?.['1y'],
      return3yr: scheme?.returns?.['3y'],
      return5yr: scheme?.returns?.['5y'],
      logo_url: scheme?.logo_url,
      // These may or may not be present depending on API payload; we use them opportunistically for UI polish.
      groww_rating:
        scheme?.groww_rating ??
        scheme?.holdings?.groww_rating ??
        scheme?.rating ??
        scheme?.avg_rating ??
        null,
      risk_label:
        scheme?.nfo_risk ??
        scheme?.risk_label ??
        scheme?.holdings?.nfo_risk ??
        null,
    };
  });
}

function safeParsePct(raw) {
  if (raw === null || raw === undefined) {
    return null;
  }
  const s = String(raw).trim();
  if (!s) {
    return null;
  }
  const numericPart = s.replace('%', '').replace(',', '');
  const n = Number(numericPart);
  if (Number.isNaN(n)) {
    return null;
  }
  return n;
}

function formatSignedReturnPct(raw, fallback = '—') {
  const n = safeParsePct(raw);
  if (n === null) {
    return fallback;
  }
  const sign = n > 0 ? '+' : '';
  return `${sign}${n.toFixed(2)}%`;
}

function returnColor(raw) {
  const n = safeParsePct(raw);
  if (n === null) {
    return Colors.TEXT_PRIMARY;
  }
  return n >= 0 ? Colors.green : Colors.red;
}

function FundLogo({name, uri}) {
  if (uri) {
    return <Image source={{uri}} style={styles.logo} resizeMode="contain" />;
  }
  const letter = (name || '?')[0]?.toUpperCase() ?? '?';
  return (
    <View style={[styles.logo, styles.logoPlaceholder]}>
      <Text style={styles.logoLetter}>{letter}</Text>
    </View>
  );
}

function FundRow({item, sortMode, onPress}) {
  const raw =
    sortMode === '1y'
      ? item.return1yr
      : sortMode === '5y'
        ? item.return5yr
        : item.return3yr;

  const retLabel = sortMode === '1y' ? '1Y' : sortMode === '5y' ? '5Y' : '3Y';

  return (
    <TouchableOpacity style={styles.row} onPress={() => onPress(item)} activeOpacity={0.7}>
      <View style={styles.rowLeft}>
        <FundLogo name={item.name} uri={item.logo_url} />
        <View style={styles.rowText}>
          <Text style={styles.fundName} numberOfLines={1}>
            {item.name}
          </Text>
          <Text style={styles.category} numberOfLines={1}>
            {(item.category || '').toLowerCase()}
          </Text>
          <View style={styles.ratingRow}>
            <Text style={[styles.ratingVal, {color: returnColor(raw)}]}>
              {formatSignedReturnPct(raw)}
            </Text>
            <Text style={styles.ratingPeriod}>{retLabel}</Text>
          </View>
        </View>
      </View>

      <View style={styles.returnsCol}>
        <Text style={[styles.returnVal, {color: returnColor(raw)}]}>{formatSignedReturnPct(raw)}</Text>
        <Text style={styles.periodLabel}>{retLabel}</Text>
      </View>
    </TouchableOpacity>
  );
}

export default function AllFundsSIPScreen() {
  const navigation = useNavigation();
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [sortMode, setSortMode] = useState('3y');

  const [refreshing, setRefreshing] = useState(false);
  const page = 0;
  const rowsPerPage = 10;
  const showMoreCount = 20;
  const isMobile = true;

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(searchTerm.trim()), 400);
    return () => clearTimeout(t);
  }, [searchTerm]);

  const {data, isLoading, error, refetch} = useAllFunds({
    page,
    rowsPerPage,
    showMoreCount,
    isMobile,
    debouncedSearch,
    selectedCategory: '',
    selectedRisk: '',
  });

  const allFunds = useMemo(() => mapResultsToFunds(data), [data]);
  const totalCount = data?.count ?? allFunds.length;

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await refetch();
    } finally {
      setRefreshing(false);
    }
  }, [refetch]);

  const onOpenFund = useCallback(
    fund => {
      const code = pickSchemeCode(fund);
      if (!code) {
        return;
      }
      navigateToFundDetail(navigation, {schemeCode: code, schemeName: fund.name});
    },
    [navigation],
  );

  const SORT_MODES = useMemo(
    () => [
      {key: '1y', label: '1Y Returns', sortField: 'return1yr'},
      {key: '3y', label: '3Y Returns', sortField: 'return3yr'},
      {key: '5y', label: '5Y Returns', sortField: 'return5yr'},
    ],
    [],
  );

  const activeSort = SORT_MODES.find(s => s.key === sortMode) ?? SORT_MODES[1];

  const sortedFunds = useMemo(() => {
    const field =
      sortMode === '1y' ? 'return1yr' : sortMode === '5y' ? 'return5yr' : 'return3yr';
    const list = [...allFunds];
    list.sort((a, b) => {
      const av = safeParsePct(a[field]) ?? -Infinity;
      const bv = safeParsePct(b[field]) ?? -Infinity;
      // Desc order for returns
      return bv - av;
    });
    return list;
  }, [allFunds, sortMode]);

  const listHeader = useMemo(
    () => (
      <View>
        <View style={styles.topBar}>
          <AppBackButton onPress={() => navigation.goBack()} style={styles.backBtn} hitSlop={10} />
          <Text style={styles.title}>All Funds</Text>
          <View style={styles.topRightSpacer} />
        </View>

        <View style={styles.searchWrap}>
          <Image source={Icons.SearchIcon} style={styles.searchIconImg} resizeMode="contain" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search funds..."
            placeholderTextColor={Colors.GREY}
            value={searchTerm}
            onChangeText={setSearchTerm}
            returnKeyType="search"
            autoCapitalize="none"
            autoCorrect={false}
          />
          {searchTerm.length > 0 ? (
            <TouchableOpacity onPress={() => setSearchTerm('')} hitSlop={12} style={styles.clearSearch}>
              <Text style={styles.clearText}>✕</Text>
            </TouchableOpacity>
          ) : null}
        </View>

        <View style={styles.sortHeader}>
          <Text style={styles.countText}>
            {totalCount} Funds
          </Text>

          <TouchableOpacity
            style={styles.sortBtn}
            activeOpacity={0.85}
            onPress={() => {
              // lightweight cycle for UI; keeps implementation small.
              const order = ['1y', '3y', '5y'];
              const idx = order.indexOf(sortMode);
              const next = order[(idx + 1) % order.length];
              setSortMode(next);
            }}>
            <View style={styles.sortBtnInner}>
              <Text style={styles.sortBtnTxt}>{activeSort.label}</Text>
              <Text style={styles.sortChevron}>⌄</Text>
            </View>
            <View style={styles.dottedUnderline} />
          </TouchableOpacity>
        </View>

        {error ? (
          <View style={styles.errorBanner}>
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity onPress={refetch} hitSlop={8} style={styles.retryBtn}>
              <Text style={styles.retryText}>Retry</Text>
            </TouchableOpacity>
          </View>
        ) : null}
      </View>
    ),
    [activeSort.label, error, navigation, refetch, searchTerm, sortMode, totalCount],
  );

  const initialLoading = isLoading && !data;

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      {initialLoading ? (
        <View style={styles.loadingInline}>
          <ActivityIndicator size="small" color={Colors.themeBlue} />
          <Text style={[Textstyles.normal, styles.loadingTextInline]}>Loading funds…</Text>
        </View>
      ) : null}

      <FlatList
        data={sortedFunds}
        keyExtractor={item => String(item.id ?? item.scheme_code)}
        renderItem={({item}) => <FundRow item={item} sortMode={sortMode} onPress={onOpenFund} />}
        ListHeaderComponent={listHeader}
        contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.themeBlue} />}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={[Textstyles.medium, styles.emptyTitle]}>No funds found</Text>
            <Text style={[Textstyles.normal, styles.emptySub]}>Try a different search</Text>
          </View>
        }
        showsVerticalScrollIndicator={false}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {flex: 1, backgroundColor: '#F9FAFB'},
  loadingBox: {flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24},
  loadingText: {marginTop: 12, color: Colors.GREY, fontSize: 15},
  loadingInline: {paddingHorizontal: 16, paddingBottom: 8, flexDirection: 'row', alignItems: 'center', gap: 10},
  loadingTextInline: {marginTop: 0, color: Colors.GREY, fontSize: 14},
  listContent: {paddingBottom: 24},

  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    minHeight: 44,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.BORDER_GREY,
  },
  backBtn: {width: 44, height: 44, alignItems: 'center', justifyContent: 'center'},
  title: {flex: 1, ...Textstyles.heading, fontSize: 18, color: Colors.TEXT_PRIMARY, textAlign: 'center'},
  topRightSpacer: {width: 44},

  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.BORDER_GREY,
    borderRadius: SEARCH_FIELD.borderRadius,
    marginHorizontal: 16,
    marginTop: 14,
    paddingHorizontal: SEARCH_FIELD.paddingHorizontal,
    paddingVertical: SEARCH_FIELD.paddingVertical,
    minHeight: SEARCH_FIELD.minHeight,
  },
  searchIconImg: {
    width: SEARCH_FIELD.iconSize,
    height: SEARCH_FIELD.iconSize,
    marginRight: SEARCH_FIELD.iconMarginRight,
  },
  searchInput: {
    flex: 1,
    paddingVertical: SEARCH_FIELD.inputPaddingVertical,
    fontSize: SEARCH_FIELD.inputFontSize,
    color: Colors.TEXT_PRIMARY,
  },
  clearSearch: {padding: 4},
  clearText: {fontSize: 16, color: Colors.GREY},

  sortHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginHorizontal: 16,
    marginTop: 14,
    marginBottom: 10,
  },
  countText: {fontSize: 14, color: Colors.GREY},
  sortBtn: {paddingRight: 6},
  sortBtnInner: {flexDirection: 'row', alignItems: 'center', gap: 6},
  sortBtnTxt: {...Textstyles.medium, fontSize: 14, color: Colors.TEXT_PRIMARY},
  sortChevron: {fontSize: 12, color: Colors.GREY, marginTop: 2},
  dottedUnderline: {
    marginTop: 6,
    width: 118,
    borderBottomWidth: 2,
    borderBottomColor: '#D1D5DB',
    borderStyle: 'dotted',
    alignSelf: 'flex-end',
  },

  errorBanner: {
    marginHorizontal: 16,
    marginBottom: 10,
    backgroundColor: '#FEF2F2',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#FECACA',
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  errorText: {flex: 1, color: '#B91C1C', fontSize: 13},
  retryBtn: {paddingVertical: 6, paddingHorizontal: 10},
  retryText: {...Textstyles.medium, color: Colors.themeBlue, fontWeight: '600'},

  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    backgroundColor: Colors.white,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.BORDER_GREY,
  },
  rowLeft: {flexDirection: 'row', alignItems: 'center', flex: 1, paddingRight: 10},
  rowText: {flex: 1, paddingLeft: 12},
  logo: {width: 40, height: 40, borderRadius: 10},
  logoPlaceholder: {backgroundColor: Colors.offWhite, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: Colors.BORDER_GREY},
  logoLetter: {...Textstyles.medium, fontSize: 15, color: Colors.themeBlue},
  fundName: {...Textstyles.medium, fontSize: 14, color: Colors.TEXT_PRIMARY},
  category: {fontSize: 12, color: Colors.GREY, marginTop: 4},
  ratingRow: {flexDirection: 'row', alignItems: 'center', marginTop: 6, gap: 4},
  star: {color: '#9CA3AF', fontSize: 12},
  ratingVal: {fontSize: 12, color: '#9CA3AF'},

  returnsCol: {alignItems: 'flex-end', minWidth: 90},
  returnVal: {...Textstyles.medium, fontSize: 14},
  periodLabel: {fontSize: 12, color: Colors.GREY, marginTop: 4},

  empty: {padding: 40, alignItems: 'center'},
  emptyTitle: {fontSize: 16, color: Colors.TEXT_PRIMARY, marginBottom: 8},
  emptySub: {fontSize: 14, color: Colors.GREY, textAlign: 'center', lineHeight: 20},
});

