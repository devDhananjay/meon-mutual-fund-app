import React, {useCallback, useEffect, useMemo, useState} from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Image,
  ActivityIndicator,
  ScrollView,
  RefreshControl,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useNavigation} from '@react-navigation/native';
import {useAllFunds} from '../../hooks/useAllFunds';
import {navigateToFundDetail} from '../../navigation/navigationRef';
import {pickSchemeCode} from '../../utils/schemeCode';
import {Colors} from '../../utils/AppConstant';
import Textstyles from '../../utils/text';

const CATEGORIES = [
  {label: 'All categories', value: ''},
  {label: 'Small Cap', value: 'Small Cap'},
  {label: 'Mid Cap', value: 'Mid Cap'},
  {label: 'Large Cap', value: 'Large Cap'},
];

const RISKS = [
  {label: 'All risks', value: ''},
  {label: 'Low', value: 'low'},
  {label: 'Moderate', value: 'Moderate'},
  {label: 'High', value: 'High'},
  {label: 'Very High', value: 'Very High'},
];

function mapResultsToFunds(data) {
  if (!data?.results?.length) {
    return [];
  }
  return data.results.map((scheme, index) => {
    const code = pickSchemeCode(scheme);
    if (__DEV__ && !code) {
      console.warn('[Explore] list row missing scheme id — keys:', Object.keys(scheme || {}), scheme);
    }
    const rowId =
      code ??
      (scheme.scheme_id != null ? String(scheme.scheme_id) : undefined) ??
      (scheme.scheme_master_id != null ? String(scheme.scheme_master_id) : undefined) ??
      String(index);
    // Keep full flattened API fields so `pickSchemeCode` works on tap (list omits scheme_code on top-level only).
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
    };
  });
}

function FundRow({item, onPress}) {
  return (
    <TouchableOpacity style={styles.row} onPress={() => onPress(item)} activeOpacity={0.7}>
      <View style={styles.rowLeft}>
        {item.logo_url ? (
          <Image source={{uri: item.logo_url}} style={styles.logo} resizeMode="contain" />
        ) : (
          <View style={[styles.logo, styles.logoPlaceholder]}>
            <Text style={styles.logoLetter}>{(item.name || '?')[0]}</Text>
          </View>
        )}
        <View style={styles.rowText}>
          <Text style={[Textstyles.medium, styles.fundName]} numberOfLines={2}>
            {item.name}
          </Text>
          <Text style={[Textstyles.normal, styles.category]} numberOfLines={1}>
            {(item.category || '').toLowerCase()}
          </Text>
        </View>
      </View>
      <View style={styles.returnsCol}>
        <Text style={styles.retLabel}>1Y</Text>
        <Text style={[Textstyles.medium, styles.retVal]}>{item.return1yr ?? '—'}</Text>
        <Text style={styles.retLabel}>3Y</Text>
        <Text style={[Textstyles.medium, styles.retVal]}>{item.return3yr ?? '—'}</Text>
      </View>
    </TouchableOpacity>
  );
}

function Chip({label, selected, onPress}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      style={[styles.chip, selected && styles.chipSelected]}
      activeOpacity={0.85}>
      <Text style={[Textstyles.normal, styles.chipText, selected && styles.chipTextSelected]} numberOfLines={1}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}

export default function ExploreScreen() {
  const navigation = useNavigation();
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [page] = useState(0);
  const [rowsPerPage] = useState(10);
  const [showMoreCount, setShowMoreCount] = useState(10);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedRisk, setSelectedRisk] = useState('');
  const isMobile = true;

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(searchTerm.trim()), 500);
    return () => clearTimeout(t);
  }, [searchTerm]);

  useEffect(() => {
    setShowMoreCount(10);
  }, [debouncedSearch, selectedCategory, selectedRisk]);

  const [refreshing, setRefreshing] = useState(false);

  const {data, isLoading, error, refetch} = useAllFunds({
    page,
    rowsPerPage,
    showMoreCount,
    isMobile,
    debouncedSearch,
    selectedCategory,
    selectedRisk,
  });

  const allFunds = useMemo(() => mapResultsToFunds(data), [data]);
  const totalResults = data?.count ?? 0;
  const hasMore = allFunds.length < totalResults;

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
      if (__DEV__) {
        console.log('[Explore] onOpenFund', {fund, code});
      }
      if (!code) {
        if (__DEV__) {
          console.warn('[Explore] cannot open fund — no scheme code', fund);
        }
        return;
      }
      navigateToFundDetail(navigation, {
        schemeCode: code,
        schemeName: fund.name,
      });
    },
    [navigation],
  );

  const renderItem = useCallback(
    ({item}) => {
      if (__DEV__) {
        console.log('renderItem', item);
      }
      return <FundRow item={item} onPress={onOpenFund} />;
    },
    [onOpenFund],
  );

  const listHeader = useMemo(
    () => (
      <View style={styles.headerBlock}>
        <Text style={[Textstyles.bold, styles.title]}>All Funds</Text>

        <View style={styles.searchWrap}>
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
            <TouchableOpacity onPress={() => setSearchTerm('')} style={styles.clearSearch} hitSlop={12}>
              <Text style={styles.clearText}>✕</Text>
            </TouchableOpacity>
          ) : null}
        </View>

        <Text style={[Textstyles.medium, styles.filterLabel]}>Category</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll}>
          {CATEGORIES.map(c => (
            <Chip
              key={c.value || 'all-cat'}
              label={c.label}
              selected={selectedCategory === c.value}
              onPress={() => setSelectedCategory(c.value)}
            />
          ))}
        </ScrollView>

        <Text style={[Textstyles.medium, styles.filterLabel]}>Risk</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll}>
          {RISKS.map(r => (
            <Chip
              key={r.value || 'all-risk'}
              label={r.label}
              selected={selectedRisk === r.value}
              onPress={() => setSelectedRisk(r.value)}
            />
          ))}
        </ScrollView>

        <View style={styles.countRow}>
          <Text style={[Textstyles.normal, styles.countText]}>
            {totalResults} fund{totalResults !== 1 ? 's' : ''}
          </Text>
        </View>

        {error ? (
          <View style={styles.errorBanner}>
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity onPress={() => refetch()} hitSlop={8}>
              <Text style={styles.retry}>Retry</Text>
            </TouchableOpacity>
          </View>
        ) : null}
      </View>
    ),
    [error, refetch, searchTerm, selectedCategory, selectedRisk, totalResults],
  );

  const listFooter = useMemo(() => {
    if (!hasMore || totalResults <= 5) {
      return <View style={{height: 24}} />;
    }
    return (
      <View style={styles.footerMore}>
        {isLoading ? (
          <ActivityIndicator color={Colors.themeBlue} />
        ) : (
          <TouchableOpacity style={styles.showMoreBtn} onPress={() => setShowMoreCount(c => c + 10)} activeOpacity={0.85}>
            <Text style={[Textstyles.medium, styles.showMoreText]}>Show more</Text>
            <Text style={styles.showMoreChevron}>▼</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  }, [hasMore, totalResults, isLoading]);

  const initialLoading = isLoading && !data;

  if (initialLoading) {
    return (
      <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
        <View style={styles.loadingBox}>
          <ActivityIndicator size="large" color={Colors.themeBlue} />
          <Text style={[Textstyles.normal, styles.loadingText]}>Loading funds…</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <FlatList
        data={allFunds}
        keyExtractor={item => item.id}
        renderItem={renderItem}
        ListHeaderComponent={listHeader}
        ListFooterComponent={listFooter}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={[Textstyles.medium, styles.emptyTitle]}>No funds found</Text>
            <Text style={[Textstyles.normal, styles.emptySub]}>Try a different search or filters</Text>
          </View>
        }
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.themeBlue} />
        }
        showsVerticalScrollIndicator={false}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#f9f9f9',
  },
  loadingBox: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  loadingText: {marginTop: 12, color: Colors.GREY, fontSize: 15},
  listContent: {
    paddingBottom: 32,
  },
  headerBlock: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 8,
  },
  title: {
    fontSize: 22,
    color: Colors.TEXT_PRIMARY,
    marginBottom: 12,
  },
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.BORDER_GREY,
    borderRadius: 10,
    paddingHorizontal: 12,
    marginBottom: 16,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 15,
    color: Colors.TEXT_PRIMARY,
  },
  clearSearch: {padding: 4},
  clearText: {fontSize: 16, color: Colors.GREY},
  filterLabel: {
    fontSize: 13,
    color: Colors.GREY,
    marginBottom: 8,
  },
  chipScroll: {
    marginBottom: 12,
    maxHeight: 40,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.BORDER_GREY,
    marginRight: 8,
  },
  chipSelected: {
    backgroundColor: '#E0F2FE',
    borderColor: Colors.themeBlue,
  },
  chipText: {
    fontSize: 13,
    color: Colors.TEXT_PRIMARY,
  },
  chipTextSelected: {
    color: Colors.themeBlue,
    fontWeight: '600',
  },
  countRow: {
    marginBottom: 8,
  },
  countText: {
    fontSize: 14,
    color: Colors.GREY,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FEF2F2',
    padding: 10,
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  errorText: {flex: 1, color: '#B91C1C', fontSize: 13},
  retry: {color: Colors.themeBlue, fontWeight: '600'},
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.white,
    marginHorizontal: 16,
    marginBottom: 8,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.BORDER_GREY,
  },
  rowLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 8,
  },
  logo: {
    width: 40,
    height: 40,
    borderRadius: 8,
    marginRight: 10,
  },
  logoPlaceholder: {
    backgroundColor: Colors.offWhite,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.BORDER_GREY,
  },
  logoLetter: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.themeBlue,
  },
  rowText: {
    flex: 1,
  },
  fundName: {
    fontSize: 14,
    color: Colors.TEXT_PRIMARY,
    lineHeight: 20,
  },
  category: {
    fontSize: 12,
    color: Colors.GREY,
    marginTop: 4,
    textTransform: 'lowercase',
  },
  returnsCol: {
    alignItems: 'flex-end',
  },
  retLabel: {
    fontSize: 10,
    color: Colors.GREY,
  },
  retVal: {
    fontSize: 13,
    color: Colors.TEXT_PRIMARY,
    marginBottom: 4,
  },
  empty: {
    padding: 40,
    alignItems: 'center',
  },
  emptyTitle: {
    fontSize: 16,
    color: Colors.TEXT_PRIMARY,
    marginBottom: 8,
  },
  emptySub: {
    fontSize: 14,
    color: Colors.GREY,
    textAlign: 'center',
  },
  footerMore: {
    paddingVertical: 16,
    alignItems: 'center',
  },
  showMoreBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 20,
  },
  showMoreText: {
    color: Colors.themeBlue,
    fontSize: 16,
  },
  showMoreChevron: {
    color: Colors.themeBlue,
    fontSize: 12,
  },
});
