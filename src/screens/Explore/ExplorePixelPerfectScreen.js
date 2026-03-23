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
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useNavigation} from '@react-navigation/native';

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
      rating: rating == null ? 4 : Number(rating),
      riskLabel: riskLabel == null ? 'High Risk' : String(riskLabel),
      metaText: 'Commodities silver',
      return1y: returns?.['1y'],
      return3y: returns?.['3y'],
      return5y: returns?.['5y'],
    };
  });
}

export default function ExplorePixelPerfectScreen() {
  const navigation = useNavigation();

  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [sortPeriodKey, setSortPeriodKey] = useState('3y'); // 1y | 3y | 5y
  const [indexOnly, setIndexOnly] = useState(false);
  const [flexiCap, setFlexiCap] = useState(true);
  const [selectedSector, setSelectedSector] = useState('All');

  const sectorOptions = useMemo(() => ['All', 'Technology', 'Healthcare', 'Financials'], []);

  const sortLabel = useMemo(() => {
    return sortPeriodKey === '1y' ? '1Y Returns' : sortPeriodKey === '5y' ? '5Y Returns' : '3Y Returns';
  }, [sortPeriodKey]);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search.trim()), 400);
    return () => clearTimeout(t);
  }, [search]);

  const {data, isLoading} = useAllFunds({
    page: 0,
    rowsPerPage: 10,
    showMoreCount: 20,
    isMobile: true,
    debouncedSearch,
    selectedCategory: '',
    selectedRisk: '',
  });

  const apiFunds = useMemo(() => mapApiResultsToFunds(data), [data]);
  const displayFunds = apiFunds.length ? apiFunds : MOCK_ALL_FUNDS;
  const popularFunds = useMemo(() => displayFunds.slice(0, 4), [displayFunds]);
  const recentlyViewed = useMemo(() => displayFunds.slice(1, 3), [displayFunds]);
  const count = data?.count ?? 1245;

  const onPressSort = useCallback(
    key => {
      if (key === '1y' || key === '3y' || key === '5y') {
        setSortPeriodKey(key);
        return;
      }
      const order = ['1y', '3y', '5y'];
      const idx = order.indexOf(sortPeriodKey);
      const next = order[(idx + 1) % order.length];
      setSortPeriodKey(next);
    },
    [sortPeriodKey],
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

  if (isLoading && (!data || !data.results)) {
    return (
      <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
        <View style={styles.loadingBox}>
          <ActivityIndicator size="large" color="#00B386" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={[Textstyles.extraBold, styles.title]}>Explore</Text>
        </View>

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
          <Text style={[Textstyles.bold, styles.sectionTitle]}>Popular Funds</Text>
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
          <Text style={[Textstyles.bold, styles.sectionTitle]}>Recently Viewed</Text>
          <View />
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.recentScroll} contentContainerStyle={styles.recentContent}>
          {recentlyViewed.map((f, idx) => (
            <View key={f.id ?? idx} style={styles.recentItem}>
              <FundCard fund={f} variant="recent" onPress={() => onPressFund(f)} />
            </View>
          ))}
        </ScrollView>

        <Text style={[Textstyles.bold, styles.allFundsTitle]}>All Mutual Funds</Text>

        <FilterBar
          count={count}
          sortLabel={sortLabel}
          onPressSort={onPressSort}
          indexOnly={indexOnly}
          onToggleIndexOnly={() => setIndexOnly(v => !v)}
          flexiCap={flexiCap}
          onToggleFlexiCap={() => setFlexiCap(v => !v)}
          sectorOptions={sectorOptions}
          selectedSector={selectedSector}
          onSelectSector={setSelectedSector}
        />

        <View style={styles.list}>
          {displayFunds.slice(0, 10).map((f, idx) => (
            <FundListItem
              key={f.id ?? idx}
              fund={{
                ...f,
                returnPeriodKey: sortPeriodKey,
              }}
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

  header: {paddingHorizontal: 16, paddingTop: 10, paddingBottom: 8},
  title: {fontSize: 22, color: Colors.TEXT_PRIMARY},

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
  sipButtonTxt: {color: '#FFFFFF', fontSize: 15, fontWeight: '800'},

  sectionHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    marginBottom: 10,
  },
  sectionTitle: {fontSize: 16, color: Colors.TEXT_PRIMARY},
  viewAll: {color: '#00B386', fontWeight: '800'},

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

  allFundsTitle: {paddingHorizontal: 16, marginBottom: 8, fontSize: 16, color: Colors.TEXT_PRIMARY},

  list: {paddingBottom: 18},
  bottomPad: {height: 30},
});

