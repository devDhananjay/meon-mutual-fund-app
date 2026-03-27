import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {View, Text, StyleSheet, TouchableOpacity, TextInput, FlatList, ActivityIndicator} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useNavigation} from '@react-navigation/native';

import {useAllFunds} from '../../hooks/useAllFunds';
import {navigateToFundDetail} from '../../navigation/navigationRef';
import {pickSchemeCode} from '../../utils/schemeCode';
import {Colors} from '../../utils/AppConstant';

import FilterBar from './components/FilterBar';
import FundListItem from './components/FundListItem';

const PRIMARY_GREEN = Colors.themeBlue;
const LOAD_MORE_STEP = 10;

function mapApiResultsToFundsForList(data) {
  if (!data?.results?.length) {
    return [];
  }

  return data.results.map((scheme, index) => {
    const code = pickSchemeCode(scheme);
    const id =
      code ??
      (scheme?.scheme_id != null ? String(scheme.scheme_id) : undefined) ??
      (scheme?.scheme_master_id != null ? String(scheme.scheme_master_id) : undefined) ??
      String(index);

    const returns = scheme?.returns ?? {};
    return {
      id,
      scheme_code: code,
      name: scheme?.base_scheme_name || scheme?.name || 'Unnamed Fund',
      logo_url: scheme?.logo_url,
      category: scheme?.scheme_type,
      rating:
        scheme?.groww_rating ??
        scheme?.rating ??
        scheme?.avg_rating ??
        scheme?.holdings?.groww_rating ??
        4,
      metaText: 'Commodities silver',
      return1y: returns?.['1y'],
      return3y: returns?.['3y'],
      return5y: returns?.['5y'],
      return7y: returns?.['7y'],
    };
  });
}

function getReturnValue(f, periodKey) {
  const raw =
    periodKey === '1y'
      ? f?.return1y
      : periodKey === '5y'
        ? f?.return5y
        : periodKey === '7y'
          ? f?.return7y
          : f?.return3y;
  const s = raw === null || raw === undefined ? '' : String(raw).trim().replace('%', '').replace(',', '');
  const n = s ? Number(s) : NaN;
  return Number.isNaN(n) ? -Infinity : n;
}

export default function AllMutualFundsScreen() {
  const navigation = useNavigation();

  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  const [sortPeriodKey, setSortPeriodKey] = useState('3y'); // 1y | 3y | 5y
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedRisk, setSelectedRisk] = useState('');

  const [showMoreCount, setShowMoreCount] = useState(10);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(searchTerm.trim()), 400);
    return () => clearTimeout(t);
  }, [searchTerm]);

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

  const {data, isLoading, error} = useAllFunds({
    page: 0,
    rowsPerPage: 10,
    showMoreCount,
    isMobile: true,
    debouncedSearch,
    selectedCategory,
    selectedRisk,
  });

  const apiFunds = useMemo(() => mapApiResultsToFundsForList(data), [data]);

  const sortedFunds = useMemo(() => {
    const list = [...apiFunds];
    list.sort((a, b) => getReturnValue(b, sortPeriodKey) - getReturnValue(a, sortPeriodKey));
    return list;
  }, [apiFunds, sortPeriodKey]);

  const sortLabel = useMemo(() => {
    return sortPeriodKey === '5y'
      ? '5Y Returns'
      : sortPeriodKey === '7y'
        ? '7Y Returns'
        : '3Y Returns';
  }, [sortPeriodKey]);

  const totalCount = data?.count ?? sortedFunds.length;
  const hasMore = showMoreCount < totalCount;

  const loadMoreLock = useRef(false);

  useEffect(() => {
    if (!isLoading) {
      loadMoreLock.current = false;
    }
  }, [isLoading]);

  const handleEndReached = useCallback(() => {
    if (!hasMore || isLoading || loadMoreLock.current) {
      return;
    }
    loadMoreLock.current = true;
    setShowMoreCount(c => Math.min(c + LOAD_MORE_STEP, totalCount));
  }, [hasMore, isLoading, totalCount]);

  const onPressFund = useCallback(
    fund => {
      const code = fund?.scheme_code || pickSchemeCode(fund);
      if (!code) {
        return;
      }
      navigateToFundDetail(navigation, {schemeCode: code, schemeName: fund?.name});
    },
    [navigation],
  );

  const onPressSort = useCallback(key => {
    if (key === '3y' || key === '5y' || key === '7y') {
      setSortPeriodKey(key);
    }
  }, []);

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn} hitSlop={10}>
          <Text style={styles.backChevron}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.title}>All Mutual Funds</Text>
        <View style={styles.topRightSpacer} />
      </View>

      <View style={styles.controlsContainer}>
        <View style={styles.searchWrap}>
          <Text style={styles.searchIcon}>⌕</Text>
          <TextInput
            style={styles.searchInput}
            value={searchTerm}
            onChangeText={setSearchTerm}
            placeholder="Search funds..."
            placeholderTextColor={Colors.GREY}
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

        {error ? (
          <View style={styles.errorBanner}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        <FilterBar
          count={totalCount}
          sortLabel={sortLabel}
          onPressSort={onPressSort}
          categoryOptions={categoryOptions}
          selectedCategory={selectedCategory}
          onSelectCategory={setSelectedCategory}
          riskOptions={riskOptions}
          selectedRisk={selectedRisk}
          onSelectRisk={setSelectedRisk}
          containerStyle={styles.filterWrap}
        />
      </View>

      {isLoading && sortedFunds.length === 0 ? (
        <View style={styles.loadingBox}>
          <ActivityIndicator size="large" color={PRIMARY_GREEN} />
        </View>
      ) : (
        <FlatList
          data={sortedFunds.slice(0, showMoreCount)}
          keyExtractor={(item, index) => String(item?.id ?? item?.scheme_code ?? index)}
          renderItem={({item}) => (
            <FundListItem fund={item} returnPeriodKey={sortPeriodKey} onPress={() => onPressFund(item)} />
          )}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.listContent}
          onEndReached={handleEndReached}
          onEndReachedThreshold={0.35}
          ListFooterComponent={
            hasMore && isLoading && sortedFunds.length > 0 ? (
              <View style={styles.footerLoading}>
                <ActivityIndicator size="small" color={PRIMARY_GREEN} />
              </View>
            ) : (
              <View style={styles.footerSpacer} />
            )
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {flex: 1, backgroundColor: Colors.offWhite},
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#EBECED',
  },
  backBtn: {width: 44, height: 44, alignItems: 'flex-start', justifyContent: 'center'},
  backChevron: {fontSize: 28, color: PRIMARY_GREEN, fontWeight: '400'},
  title: {flex: 1, textAlign: 'center', fontSize: 18, fontWeight: '700', color: Colors.TEXT_PRIMARY},
  topRightSpacer: {width: 44},

  controlsContainer: {
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  searchWrap: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#EBECED',
    borderRadius: 12,
    paddingHorizontal: 12,
    minHeight: 50,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 18,
  },
  filterWrap: {marginHorizontal: 0, marginBottom: 12},
  searchIcon: {fontSize: 16, color: Colors.GREY},
  searchInput: {flex: 1, fontSize: 15, color: Colors.TEXT_PRIMARY, paddingVertical: 2},
  clearSearch: {padding: 4},
  clearText: {fontSize: 16, color: Colors.GREY},

  errorBanner: {
    marginBottom: 12,
    backgroundColor: '#FEF2F2',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#FECACA',
    padding: 12,
  },
  errorText: {color: '#B91C1C', fontSize: 13, fontWeight: '600'},

  loadingBox: {flex: 1, justifyContent: 'center', alignItems: 'center'},
  listContent: {paddingBottom: 24},

  footerLoading: {
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  footerSpacer: {height: 24},
});

