import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {View, Text, StyleSheet, TouchableOpacity, TextInput, FlatList, ActivityIndicator, Image, InteractionManager} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useFocusEffect, useNavigation, useRoute} from '@react-navigation/native';

import {useAllFunds} from '../../hooks/useAllFunds';
import {navigateToFundDetail} from '../../navigation/navigationRef';
import {pickSchemeCode} from '../../utils/schemeCode';

import FilterBar from './components/FilterBar';
import FundListItem from './components/FundListItem';
import Textstyles from '../../utils/text';
import Icons from '../../utils/icons';
import {useAppTheme} from '../../theme/useAppTheme';
import {SEARCH_FIELD} from '../../theme/searchField';
import AppBackButton from '../../components/AppBackButton';
const LOAD_MORE_STEP = 10;

function buildStableFundId(scheme) {
  const code = pickSchemeCode(scheme);
  if (code) {
    return String(code);
  }
  if (scheme?.scheme_id != null) {
    return String(scheme.scheme_id);
  }
  if (scheme?.scheme_master_id != null) {
    return String(scheme.scheme_master_id);
  }
  // Fallback is based on immutable content, never list index.
  const name = String(scheme?.base_scheme_name || scheme?.name || 'fund').trim().toLowerCase();
  const amc = String(scheme?.amc_name || '').trim().toLowerCase();
  const cat = String(scheme?.scheme_type || '').trim().toLowerCase();
  return `${name}::${amc}::${cat}`;
}

function mapApiResultsToFundsForList(data) {
  if (!data?.results?.length) {
    return [];
  }

  return data.results.map(scheme => {
    const code = pickSchemeCode(scheme);
    const id = buildStableFundId(scheme);

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

function createStyles(colors, isDark) {
  return StyleSheet.create({
    safe: {flex: 1, backgroundColor: colors.background},
    topBar: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingVertical: 8,
      minHeight: 44,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.border,
      backgroundColor: colors.background,
    },
    backBtn: {width: 44, height: 44, alignItems: 'center', justifyContent: 'center'},
    title: {...Textstyles.heading, flex: 1, textAlign: 'center', fontSize: 18, color: colors.textPrimary},
    topRightSpacer: {width: 44},

    controlsContainer: {
      paddingTop: 12,
      paddingHorizontal: 16,
    },
    searchWrap: {
      backgroundColor: colors.inputBg,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: SEARCH_FIELD.borderRadius,
      paddingHorizontal: SEARCH_FIELD.paddingHorizontal,
      paddingVertical: SEARCH_FIELD.paddingVertical,
      minHeight: SEARCH_FIELD.minHeight,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      marginBottom: 18,
    },
    filterWrap: {marginHorizontal: 0, marginBottom: 12},
    searchIconImg: {
      width: SEARCH_FIELD.iconSize,
      height: SEARCH_FIELD.iconSize,
      tintColor: isDark ? colors.textSecondary : undefined,
    },
    searchInput: {
      flex: 1,
      fontSize: SEARCH_FIELD.inputFontSize,
      color: colors.textPrimary,
      paddingVertical: SEARCH_FIELD.inputPaddingVertical,
    },
    clearSearch: {padding: 4},
    clearText: {fontSize: 16, color: colors.textSecondary},

    errorBanner: {
      marginBottom: 12,
      backgroundColor: isDark ? 'rgba(248,113,113,0.12)' : '#FEF2F2',
      borderRadius: 10,
      borderWidth: 1,
      borderColor: isDark ? 'rgba(248,113,113,0.35)' : '#FECACA',
      padding: 12,
    },
    errorText: {...Textstyles.medium, color: colors.danger, fontSize: 13, fontWeight: '600'},

    loadingBox: {flex: 1, justifyContent: 'center', alignItems: 'center'},
    listContent: {paddingBottom: 24, paddingHorizontal: 16},
    fundItemWrap: {
      borderRadius: 12,
      overflow: 'hidden',
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.border,
      backgroundColor: colors.card,
      marginBottom: 10,
    },

    footerLoading: {
      paddingVertical: 16,
      alignItems: 'center',
      justifyContent: 'center',
    },
    footerSpacer: {height: 24},
  });
}

export default function AllMutualFundsScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const {colors, isDark} = useAppTheme();
  const styles = useMemo(() => createStyles(colors, isDark), [colors, isDark]);

  const searchInputRef = useRef(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  const [sortPeriodKey, setSortPeriodKey] = useState('none'); // none | 3y | 5y | 7y
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedRisk, setSelectedRisk] = useState('');

  const [showMoreCount, setShowMoreCount] = useState(10);
  const [fetchCount, setFetchCount] = useState(30);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(searchTerm.trim()), 400);
    return () => clearTimeout(t);
  }, [searchTerm]);

  useFocusEffect(
    useCallback(() => {
      if (!route.params?.focusSearch) {
        return undefined;
      }
      let timeoutId;
      const handle = InteractionManager.runAfterInteractions(() => {
        timeoutId = setTimeout(() => {
          searchInputRef.current?.focus();
          navigation.setParams({focusSearch: undefined});
        }, 120);
      });
      return () => {
        handle.cancel?.();
        if (timeoutId) {
          clearTimeout(timeoutId);
        }
      };
    }, [navigation, route.params?.focusSearch]),
  );

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
    showMoreCount: fetchCount,
    isMobile: true,
    debouncedSearch,
    selectedCategory,
    selectedRisk,
  });

  const apiFunds = useMemo(() => mapApiResultsToFundsForList(data), [data]);

  const sortedFunds = useMemo(() => {
    if (sortPeriodKey === 'none') {
      return apiFunds;
    }
    const list = [...apiFunds];
    list.sort((a, b) => getReturnValue(b, sortPeriodKey) - getReturnValue(a, sortPeriodKey));
    return list;
  }, [apiFunds, sortPeriodKey]);

  const sortLabel = useMemo(() => {
    if (sortPeriodKey === 'none') {
      return 'Sort';
    }
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

  useEffect(() => {
    setShowMoreCount(10);
    setFetchCount(30);
    loadMoreLock.current = false;
  }, [debouncedSearch, selectedCategory, selectedRisk]);

  const handleEndReached = useCallback(() => {
    if (!hasMore || isLoading || loadMoreLock.current) {
      return;
    }
    loadMoreLock.current = true;
    const nextVisible = Math.min(showMoreCount + LOAD_MORE_STEP, totalCount);
    setShowMoreCount(nextVisible);

    if (nextVisible + LOAD_MORE_STEP > apiFunds.length && fetchCount < totalCount) {
      setFetchCount(c => Math.min(c + 20, totalCount));
    }
  }, [hasMore, isLoading, totalCount, showMoreCount, apiFunds.length, fetchCount]);

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

  const returnPeriodKey = sortPeriodKey === 'none' ? '1y' : sortPeriodKey;

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <View style={styles.topBar}>
        <AppBackButton onPress={() => navigation.goBack()} style={styles.backBtn} hitSlop={10} />
        <Text style={[styles.title, Textstyles.heading]}>All Mutual Funds</Text>
        <View style={styles.topRightSpacer} />
      </View>

      <View style={styles.controlsContainer}>
        <View style={styles.searchWrap}>
          <Image source={Icons.SearchIcon} style={styles.searchIconImg} resizeMode="contain" />
          <TextInput
            ref={searchInputRef}
            style={styles.searchInput}
            value={searchTerm}
            onChangeText={setSearchTerm}
            placeholder="Search funds..."
            placeholderTextColor={colors.muted}
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
          <ActivityIndicator size="small" color={colors.primary} />
        </View>
      ) : (
        <FlatList
          data={sortedFunds.slice(0, showMoreCount)}
          keyExtractor={item => String(item?.id ?? item?.scheme_code ?? item?.name)}
          renderItem={({item}) => (
            <View style={styles.fundItemWrap}>
              <FundListItem fund={item} returnPeriodKey={returnPeriodKey} onPress={() => onPressFund(item)} />
            </View>
          )}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.listContent}
          onMomentumScrollBegin={() => {
            loadMoreLock.current = false;
          }}
          onEndReached={handleEndReached}
          onEndReachedThreshold={0.35}
          ListFooterComponent={
            hasMore && isLoading && sortedFunds.length > 0 ? (
              <View style={styles.footerLoading}>
                <ActivityIndicator size="small" color={colors.primary} />
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

