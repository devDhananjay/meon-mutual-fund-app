import React, {useCallback, useEffect, useMemo, useState} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Image,
  ActivityIndicator,
  StatusBar,
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

  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
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

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search.trim()), 400);
    return () => clearTimeout(t);
  }, [search]);

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
  const {data: listData, isLoading: listLoading} = useAllFunds({
    page: 0,
    rowsPerPage: 10,
    showMoreCount: 20,
    isMobile: true,
    debouncedSearch,
    selectedCategory,
    selectedRisk,
  });

  const homeFunds = useMemo(() => mapApiResultsToFunds(homeData), [homeData]);
  const listFunds = useMemo(() => mapApiResultsToFunds(listData), [listData]);

  const popularFunds = useMemo(() => {
    const list = homeFunds.length ? homeFunds : MOCK_ALL_FUNDS;
    return list.slice(0, 4);
  }, [homeFunds]);

  const recentlyViewed = useMemo(() => {
    const list = homeFunds.length ? homeFunds : MOCK_ALL_FUNDS;
    return list.slice(4, 6);
  }, [homeFunds]);

  const sortedListFunds = useMemo(() => {
    const list = listFunds.length ? listFunds : MOCK_ALL_FUNDS;
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
  }, [listFunds, sortPeriodKey]);

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

  if (
    (!homeData && homeLoading) &&
    (!listData && listLoading)
  ) {
    return (
      <SafeAreaView style={styles.safe} edges={['left', 'right', 'bottom']}>
        <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
        <View style={styles.loadingBox}>
          <ActivityIndicator size="large" color="#00B386" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['left', 'right', 'bottom']}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <AppTabHeader title="Explore" />

        <View style={styles.searchWrap}>
          <Text style={styles.searchIcon}>⌕</Text>
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Search orders..."
            placeholderTextColor={Colors.GREY}
            style={styles.searchInput}
            autoCapitalize="none"
            autoCorrect={false}
          />
          {search.length > 0 ? (
            <TouchableOpacity onPress={() => setSearch('')} style={styles.clearBtn} hitSlop={10}>
              <Text style={styles.clearTxt}>✕</Text>
            </TouchableOpacity>
          ) : null}
        </View>

        <View style={styles.sipBanner}>
          <Image source={require('../../assets/Icons/calendarSip.png')} style={styles.sipEmoji} resizeMode="contain" />
          <View style={styles.sipTextCol}>
            <Text style={[Textstyles.medium, styles.sipTitle]}>
              Invest every month and grow your wealth with SIP
            </Text>
            <TouchableOpacity style={styles.sipButton} onPress={onStartSIP} activeOpacity={0.9}>
              <Text style={styles.sipButtonTxt}>Start a SIP</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.sectionHead}>
          <Text style={[Textstyles.heading, styles.sectionTitle]}>Popular Funds</Text>
          <Text style={styles.viewAll}>View All</Text>
        </View>

        <View style={styles.grid}>
          {popularFunds.map((f, idx) => (
            <View key={f.id ?? idx} style={styles.gridItem}>
              <FundCard fund={f} variant="popular" onPress={() => onPressFund(f)} />
            </View>
          ))}
        </View>

        <View style={styles.sectionHead}>
          <Text style={[Textstyles.heading, styles.sectionTitle]}>Recently Viewed</Text>
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
          <Text style={[Textstyles.heading, styles.allFundsTitle]}>All Mutual Funds</Text>
          <TouchableOpacity onPress={onStartSIP} hitSlop={10} activeOpacity={0.85}>
            <Text style={styles.viewAll}>View all</Text>
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

        <View style={styles.list}>
          {sortedListFunds.slice(0, 10).map((f, idx) => (
            <FundListItem
              key={f.id ?? idx}
                fund={f}
                returnPeriodKey={sortPeriodKey}
              onPress={() => onPressFund(f)}
            />
          ))}
        </View>

        <View style={styles.bottomPad} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {flex: 1, backgroundColor: '#FFFFFF'},
  scroll: {paddingBottom: 28},

  loadingBox: {flex: 1, justifyContent: 'center', alignItems: 'center'},

  searchWrap: {
    marginHorizontal: 16,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#EBECED',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  searchIcon: {fontSize: 16, color: Colors.GREY},
  searchInput: {flex: 1, fontSize: 14, color: Colors.TEXT_PRIMARY, paddingVertical: 2},
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
    backgroundColor: '#00B386',
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 18,
  },
  sipButtonTxt: {color: '#FFFFFF', fontSize: 15, fontWeight: '500'},

  sectionHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    marginBottom: 10,
  },
  sectionTitle: {fontSize: 16, color: Colors.TEXT_PRIMARY},
  viewAll: {color: '#00B386', fontWeight: '500'},

  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  gridItem: {
    width: '50%',
    paddingRight: 8,
    paddingBottom: 12,
  },

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

  list: {paddingBottom: 18},
  bottomPad: {height: 30},
});

