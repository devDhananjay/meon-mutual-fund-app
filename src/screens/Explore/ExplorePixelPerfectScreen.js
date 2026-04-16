import React, {useCallback, useMemo, useState} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
  ActivityIndicator,
  StatusBar,
  FlatList,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useNavigation} from '@react-navigation/native';
import AppTabHeader from '../../components/AppTabHeader';

import {navigateToFundDetail, navigateToAllFundsSIP} from '../../navigation/navigationRef';
import {useAllFunds} from '../../hooks/useAllFunds';
import {pickSchemeCode} from '../../utils/schemeCode';
import Textstyles from '../../utils/text';
import {Colors} from '../../utils/AppConstant';
import FundCard from './components/FundCard';
import FundListItem from './components/FundListItem';
import FilterBar from './components/FilterBar';
import Icons from '../../utils/icons';
import {useAppTheme} from '../../theme/useAppTheme';
import {SEARCH_FIELD} from '../../theme/searchField';
import {TAB_SCREEN_TITLE_TO_SEARCH} from '../../theme/tabScreenLayout';

// Design-first mock dataset (used to guarantee pixel-perfect layout).
const MOCK_ALL_FUNDS = [
  {
    id: 'nippon-large-cap',
    name: 'Nippon India Large Cap Fund',
    logo_url: null,
    rating: 4,
    riskLabel: 'High Risk',
    metaText: 'Commodities silver',
    return1y: 12.34,
    return3y: 34.52,
    return5y: 40.01,
    return7y: 40.01,
    scheme_code: null,
  },
  {
    id: 'motilal-midcap-direct',
    name: 'Motilal Oswal Midcap Fund Direct Growth',
    logo_url: null,
    rating: 4,
    riskLabel: 'High Risk',
    metaText: 'Commodities silver',
    return1y: 10.12,
    return3y: 34.52,
    return5y: 38.5,
    return7y: 38.5,
    scheme_code: null,
  },
  {
    id: 'sbi-bluechip',
    name: 'SBI Bluechip Fund',
    logo_url: null,
    rating: 4,
    riskLabel: 'High Risk',
    metaText: 'Commodities silver',
    return1y: 9.22,
    return3y: 34.52,
    return5y: 36.2,
    return7y: 36.2,
    scheme_code: null,
  },
  {
    id: 'kotak-bluechip',
    name: 'Kotak Bluechip Fund',
    logo_url: null,
    rating: 4,
    riskLabel: 'High Risk',
    metaText: 'Commodities silver',
    return1y: 8.66,
    return3y: 34.52,
    return5y: 35.0,
    return7y: 35.0,
    scheme_code: null,
  },
  {
    id: 'edelweiss-negative',
    name: 'Edelweiss Large Cap Fund',
    logo_url: null,
    rating: 4,
    riskLabel: 'High Risk',
    metaText: 'Commodities silver',
    return1y: -3.2,
    return3y: -34.52,
    return5y: -18.4,
    return7y: -18.4,
    scheme_code: null,
  },
  {
    id: 'hdfc-top100',
    name: 'HDFC Top 100 Fund',
    logo_url: null,
    rating: 4,
    riskLabel: 'High Risk',
    metaText: 'Commodities silver',
    return1y: 7.1,
    return3y: 34.52,
    return5y: 31.9,
    return7y: 31.9,
    scheme_code: null,
  },
  {
    id: 'canara-robo',
    name: 'Canara Robeco Bluechip Equity',
    logo_url: null,
    rating: 4,
    riskLabel: 'High Risk',
    metaText: 'Commodities silver',
    return1y: 5.5,
    return3y: 34.52,
    return5y: 28.0,
    return7y: 28.0,
    scheme_code: null,
  },
  {
    id: 'quant-mid',
    name: 'Quant Mid Cap Fund',
    logo_url: null,
    rating: 4,
    riskLabel: 'High Risk',
    metaText: 'Commodities silver',
    return1y: 4.2,
    return3y: 18.75,
    return5y: 22.7,
    return7y: 22.7,
    scheme_code: null,
  },
  {
    id: 'axis-large',
    name: 'Axis Large Cap Fund',
    logo_url: null,
    rating: 4,
    riskLabel: 'High Risk',
    metaText: 'Commodities silver',
    return1y: 3.7,
    return3y: -5.1,
    return5y: 12.3,
    return7y: 12.3,
    scheme_code: null,
  },
  {
    id: 'quant-flexi',
    name: 'Quant Flexi Cap Fund',
    logo_url: null,
    rating: 4,
    riskLabel: 'High Risk',
    metaText: 'Commodities silver',
    return1y: 6.4,
    return3y: 34.52,
    return5y: 24.0,
    return7y: 24.0,
    scheme_code: null,
  },
];

function mapApiResultsToFunds(apiData) {
  const raw = apiData?.results;
  if (!Array.isArray(raw) || raw.length === 0) {
    return [];
  }
  return raw.map((scheme, index) => {
    const code = pickSchemeCode(scheme);
    const id =
      code ??
      (scheme?.scheme_id != null ? String(scheme.scheme_id) : undefined) ??
      (scheme?.scheme_master_id != null ? String(scheme.scheme_master_id) : undefined) ??
      String(index);

    const returns = scheme?.returns ?? {};
    const riskLabel =
      scheme?.nfo_risk ??
      scheme?.risk_label ??
      scheme?.holdings?.nfo_risk ??
      scheme?.holdings?.nfoRisk ??
      null;

    const rating =
      scheme?.groww_rating ??
      scheme?.rating ??
      scheme?.avg_rating ??
      scheme?.holdings?.groww_rating ??
      null;

    return {
      id,
      scheme_code: code,
      name: scheme?.base_scheme_name || scheme?.name || 'Unnamed Fund',
      logo_url: scheme?.logo_url,
      category: scheme?.scheme_type ?? scheme?.category ?? null,
      rating: rating == null ? 4 : Number(rating),
      riskLabel: riskLabel == null ? 'High Risk' : String(riskLabel),
      metaText: 'Commodities silver',
      return1y: returns?.['1y'],
      return3y: returns?.['3y'],
      return5y: returns?.['5y'],
      return7y: returns?.['7y'],
    };
  });
}

export default function ExplorePixelPerfectScreen() {
  const navigation = useNavigation();
  const {colors} = useAppTheme();

  const [sortPeriodKey, setSortPeriodKey] = useState('3y'); // 1y | 3y | 5y
  const [selectedCategory, setSelectedCategory] = useState(''); // '' means All categories
  const [selectedRisk, setSelectedRisk] = useState(''); // '' means All risks

  const sortLabel = useMemo(() => {
    return sortPeriodKey === '5y'
      ? '5Y Returns'
      : sortPeriodKey === '7y'
        ? '7Y Returns'
        : '3Y Returns';
  }, [sortPeriodKey]);

  const categoryOptions = useMemo(
    () => [
      {label: 'All categories', value: ''},
      {label: 'Small Cap', value: 'Small Cap'},
      {label: 'Mid Cap', value: 'Mid Cap'},
      {label: 'Large Cap', value: 'Large Cap'},
    ],
    [],
  );

  const riskOptions = useMemo(
    () => [
      {label: 'All risks', value: ''},
      {label: 'Low', value: 'low'},
      {label: 'Moderate', value: 'Moderate'},
      {label: 'High', value: 'High'},
      {label: 'Very High', value: 'Very High'},
    ],
    [],
  );

  // Home query (Popular/Recent) - ONLY unfiltered (so category/risk filters don't affect these sections).
  const {data: homeData, isLoading: homeLoading} = useAllFunds({
    page: 0,
    rowsPerPage: 10,
    showMoreCount: 10,
    isMobile: true,
    debouncedSearch: '',
    selectedCategory: '',
    selectedRisk: '',
  });

  // List query (All Mutual Funds) - filtered by category/risk from website.
  const {data: listData, isLoading: listLoading, error: listError, refetch: refetchList} = useAllFunds({
    page: 0,
    rowsPerPage: 10,
    showMoreCount: 20,
    isMobile: true,
    debouncedSearch: '',
    selectedCategory,
    selectedRisk,
  });

  const homeFunds = useMemo(() => mapApiResultsToFunds(homeData), [homeData]);
  const listFunds = useMemo(() => mapApiResultsToFunds(listData), [listData]);

  const hasActiveListQuery = Boolean(selectedCategory) || Boolean(selectedRisk);

  const popularFunds = useMemo(() => {
    const list = homeFunds.length ? homeFunds : MOCK_ALL_FUNDS;
    return list.slice(0, 4);
  }, [homeFunds]);

  const recentlyViewed = useMemo(() => {
    const list = homeFunds.length ? homeFunds : MOCK_ALL_FUNDS;
    return list.slice(4, 6);
  }, [homeFunds]);

  const sortedListFunds = useMemo(() => {
    // Never substitute mock data when the user is searching or filtering — empty API = empty list.
    const list =
      listFunds.length > 0
        ? listFunds
        : hasActiveListQuery || listLoading
          ? []
          : MOCK_ALL_FUNDS;
  const getVal = item => {
      const raw =
        sortPeriodKey === '1y'
          ? item?.return1y
          : sortPeriodKey === '5y'
            ? item?.return5y
            : sortPeriodKey === '7y'
              ? item?.return7y
              : item?.return3y;
      const s = raw === null || raw === undefined ? '' : String(raw).trim().replace('%', '').replace(',', '');
      const n = s ? Number(s) : NaN;
      return Number.isNaN(n) ? -Infinity : n;
    };
    const copy = [...list];
    copy.sort((a, b) => getVal(b) - getVal(a));
    return copy;
  }, [listFunds, sortPeriodKey, hasActiveListQuery, listLoading]);

  const count = listData?.count ?? sortedListFunds.length;

  const onPressSort = useCallback(
    key => {
      if (key === '3y' || key === '5y' || key === '7y') {
        setSortPeriodKey(key);
      }
    },
    [],
  );

  const onPressFund = useCallback(
    fund => {
      if (!fund?.scheme_code) {
        return;
      }
      navigateToFundDetail(navigation, {
        schemeCode: fund.scheme_code,
        schemeName: fund.name,
      });
    },
    [navigation],
  );

  const onStartSIP = useCallback(() => {
    navigateToAllFundsSIP(navigation);
  }, [navigation]);

  const onPressSearchBar = useCallback(() => {
    navigateToAllFundsSIP(navigation, {focusSearch: true});
  }, [navigation]);

  const listRows = useMemo(() => sortedListFunds.slice(0, 20), [sortedListFunds]);

  const renderFundRow = useCallback(
    ({item}) => (
      <View style={styles.allFundsItemWrap}>
        <FundListItem fund={item} returnPeriodKey={sortPeriodKey} onPress={() => onPressFund(item)} />
      </View>
    ),
    [sortPeriodKey, onPressFund],
  );

  const keyExtractor = useCallback((item, index) => String(item.id ?? item.scheme_code ?? `fund-${index}`), []);

  const exploreListHeader = useMemo(
    () => (
      <>
        <TouchableOpacity
          style={[styles.searchWrap, {backgroundColor: colors.inputBg, borderColor: colors.border}]}
          onPress={onPressSearchBar}
          activeOpacity={0.85}
          accessibilityRole="button"
          accessibilityLabel="Search mutual funds">
          <Image source={Icons.SearchIcon} style={styles.searchIconImg} resizeMode="contain" />
          <Text style={[styles.searchPlaceholder, {color: colors.textSecondary}]} numberOfLines={1}>
            Search funds...
          </Text>
        </TouchableOpacity>

        {listError ? (
          <View style={[styles.errorBanner, {borderColor: colors.border, backgroundColor: colors.card}]}>
            <Text style={[Textstyles.normal, {color: colors.danger, flex: 1}]}>{listError}</Text>
            <TouchableOpacity onPress={() => refetchList()} hitSlop={8}>
              <Text style={[Textstyles.medium, {color: colors.primary}]}>Retry</Text>
            </TouchableOpacity>
          </View>
        ) : null}

        <View style={[styles.sipBanner, {backgroundColor: colors.card, borderColor: colors.border}]}>
          <Image source={require('../../assets/Icons/calendarSip.png')} style={styles.sipEmoji} resizeMode="contain" />
          <View style={styles.sipTextCol}>
            <Text style={[Textstyles.medium, styles.sipTitle, {color: colors.textPrimary}]}>
              Invest every month and grow your wealth with SIP
            </Text>
            <TouchableOpacity style={styles.sipButton} onPress={onStartSIP} activeOpacity={0.9}>
              <Text style={[styles.sipButtonTxt, Textstyles.normal]}>Start SIP</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.sectionHead}>
          <Text style={[Textstyles.heading, styles.sectionTitle, {color: colors.textPrimary}]}>Popular Funds</Text>
          <TouchableOpacity onPress={onStartSIP} hitSlop={10} activeOpacity={0.85} style={styles.viewAllHit}>
            <Text style={[styles.viewAll, {color: colors.primary}]}>View All</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.grid}>
          {popularFunds.map((f, idx) => (
            <View
              key={f.id ?? idx}
              style={[
                styles.gridItemBase,
                idx % 2 === 0 ? styles.gridItemLeft : styles.gridItemRight,
              ]}>
              <FundCard fund={f} variant="popular" onPress={() => onPressFund(f)} />
            </View>
          ))}
        </View>

        <View style={styles.sectionHead}>
          <Text style={[Textstyles.heading, styles.sectionTitle, {color: colors.textPrimary}]}>Recently Viewed</Text>
          <View />
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.recentScroll} contentContainerStyle={styles.recentContent}>
          {recentlyViewed.map((f, idx) => (
            <View key={f.id ?? idx} style={styles.recentItem}>
              <FundCard fund={f} variant="recent" onPress={() => onPressFund(f)} />
            </View>
          ))}
        </ScrollView>

        <View style={styles.allFundsHeadRow}>
          <Text style={[Textstyles.heading, styles.allFundsTitle, {color: colors.textPrimary}]}>All Mutual Funds</Text>
          <TouchableOpacity onPress={onStartSIP} hitSlop={10} activeOpacity={0.85}>
            <Text style={[styles.viewAll, {color: colors.primary}]}>View all</Text>
          </TouchableOpacity>
        </View>

        <FilterBar
          count={count}
          sortLabel={sortLabel}
          onPressSort={onPressSort}
          categoryOptions={categoryOptions}
          selectedCategory={selectedCategory}
          onSelectCategory={setSelectedCategory}
          riskOptions={riskOptions}
          selectedRisk={selectedRisk}
          onSelectRisk={setSelectedRisk}
        />

        {listLoading && hasActiveListQuery ? (
          <View style={styles.listStatusBox}>
            <ActivityIndicator size="small" color={colors.primary} />
            <Text style={[Textstyles.medium, styles.listStatusTxt, {color: colors.textSecondary}]}>
              Searching funds…
            </Text>
          </View>
        ) : null}

        <View style={styles.listSectionTitleRow}>
          <Text style={[Textstyles.medium, {color: colors.textSecondary, fontSize: 13}]}>Showing {listRows.length} funds</Text>
        </View>
      </>
    ),
    [
      colors,
      listError,
      popularFunds,
      recentlyViewed,
      count,
      sortLabel,
      onPressSort,
      categoryOptions,
      selectedCategory,
      riskOptions,
      selectedRisk,
      listLoading,
      hasActiveListQuery,
      listRows.length,
      refetchList,
      onStartSIP,
      onPressSearchBar,
      onPressFund,
    ],
  );

  const renderListEmpty = useCallback(() => {
    if (listLoading || !hasActiveListQuery) {
      return null;
    }
    if (sortedListFunds.length > 0) {
      return null;
    }
    return (
      <View style={styles.listEmptyBox}>
        <Text style={[Textstyles.medium, styles.listEmptyTitle, {color: colors.textPrimary}]}>No funds found</Text>
        <Text style={[Textstyles.normal, styles.listEmptySub, {color: colors.textSecondary}]}>
          Adjust category / risk filters, or search from All Mutual Funds.
        </Text>
      </View>
    );
  }, [colors.textPrimary, colors.textSecondary, hasActiveListQuery, listLoading, sortedListFunds.length]);

  const initialLoading = (!homeData && homeLoading) && (!listData && listLoading);

  return (
    <SafeAreaView style={[styles.safe, {backgroundColor: colors.background}]} edges={['left', 'right']}>
      <StatusBar barStyle={colors.statusBar} backgroundColor={colors.background} />
      <View style={[styles.fixedHeaderWrap, {backgroundColor: colors.background}]}>
        <AppTabHeader title="Explore" />
      </View>
      {initialLoading ? (
        <View style={styles.loadingInline}>
          <ActivityIndicator size="small" color={colors.primary} />
          <Text style={[Textstyles.normal, styles.loadingInlineText, {color: colors.textSecondary}]}>Loading funds…</Text>
        </View>
      ) : null}
      <FlatList
        style={styles.scrollView}
        data={listRows}
        keyExtractor={keyExtractor}
        renderItem={renderFundRow}
        ListHeaderComponent={exploreListHeader}
        ListEmptyComponent={renderListEmpty}
        extraData={{
          listLoading,
          sortPeriodKey,
          listError,
          listRowsLen: listRows.length,
        }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
        initialNumToRender={12}
        windowSize={8}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {flex: 1, backgroundColor: Colors.offWhite},
  scroll: {paddingBottom: 32},
  scrollView: {flex: 1},
  stickyHeaderWrap: {backgroundColor: Colors.offWhite},

  loadingBox: {flex: 1, justifyContent: 'center', alignItems: 'center'},
  loadingInline: {paddingHorizontal: 16, paddingVertical: 10, flexDirection: 'row', alignItems: 'center', gap: 10},
  loadingInlineText: {marginTop: 0, fontSize: 14},

  searchWrap: {
    marginHorizontal: 16,
    marginTop: TAB_SCREEN_TITLE_TO_SEARCH,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#EBECED',
    borderRadius: SEARCH_FIELD.borderRadius,
    paddingHorizontal: SEARCH_FIELD.paddingHorizontal,
    paddingVertical: SEARCH_FIELD.paddingVertical,
    minHeight: SEARCH_FIELD.minHeight,
    flexDirection: 'row',
    alignItems: 'center',
  },
  searchIconImg: {
    width: SEARCH_FIELD.iconSize,
    height: SEARCH_FIELD.iconSize,
    marginRight: SEARCH_FIELD.iconMarginRight,
  },
  searchPlaceholder: {
    flex: 1,
    fontSize: SEARCH_FIELD.inputFontSize,
    paddingVertical: SEARCH_FIELD.inputPaddingVertical,
  },
  searchInput: {
    flex: 1,
    fontSize: SEARCH_FIELD.inputFontSize,
    color: Colors.TEXT_PRIMARY,
    paddingVertical: SEARCH_FIELD.inputPaddingVertical,
  },
  clearBtn: {padding: 4},
  clearTxt: {color: Colors.GREY, fontSize: 16},

  sipBanner: {
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 18,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#EBECED',
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  sipEmoji: {width: 38, height: 38},
  sipTextCol: {flex: 1},
  sipTitle: {color: Colors.TEXT_PRIMARY, lineHeight: 20, marginBottom: 12},
  sipButton: {
    alignSelf: 'flex-start',
    backgroundColor: '#1E81F2',
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 18,
  },
  sipButtonTxt: {...Textstyles.medium, color: '#FFFFFF', fontSize: 15,},

  sectionHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    marginBottom: 10,
  },
  sectionTitle: {fontSize: 16, color: Colors.TEXT_PRIMARY},
  viewAll: {...Textstyles.medium, color: Colors.themeBlue, fontWeight: '500'},
  viewAllHit: {paddingVertical: 8, paddingHorizontal: 8},

  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  gridItemBase: {
    width: '50%',
    paddingBottom: 12,
  },
  gridItemLeft: {paddingRight: 4},
  gridItemRight: {paddingRight: 0},

  recentScroll: {marginTop: 4, marginBottom: 18},
  recentContent: {paddingHorizontal: 16, gap: 12},
  recentItem: {width: 220},

  allFundsHeadRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  allFundsTitle: {fontSize: 16, color: Colors.TEXT_PRIMARY},

  listContent: {paddingBottom: 32, flexGrow: 1},
  errorBanner: {
    marginHorizontal: 16,
    marginBottom: 8,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  listSectionTitleRow: {
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  allFundsItemWrap: {
    marginHorizontal: 16,
    marginBottom: 10,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.BORDER_GREY,
    backgroundColor: Colors.white,
  },
  listStatusBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 20,
    paddingHorizontal: 16,
  },
  listStatusTxt: {fontSize: 14},
  listEmptyBox: {
    paddingHorizontal: 24,
    paddingVertical: 24,
    alignItems: 'center',
  },
  listEmptyTitle: {fontSize: 16, fontWeight: '600', marginBottom: 8},
  listEmptySub: {fontSize: 14, textAlign: 'center'},
});

