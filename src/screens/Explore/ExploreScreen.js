import React, {useCallback, useEffect, useMemo, useState} from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useNavigation} from '@react-navigation/native';
import {useAllFunds} from '../../hooks/useAllFunds';
import {navigateToAllFundsSIP, navigateToFundDetail} from '../../navigation/navigationRef';
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
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedRisk, setSelectedRisk] = useState('');
  const [listSortMode, setListSortMode] = useState('3y');

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(searchTerm.trim()), 400);
    return () => clearTimeout(t);
  }, [searchTerm]);

  const {data, isLoading, error, refetch} = useAllFunds({
    page: 0,
    rowsPerPage: 10,
    showMoreCount: 12,
    isMobile: true,
    debouncedSearch,
    selectedCategory,
    selectedRisk,
  });

  const allFunds = useMemo(() => mapResultsToFunds(data), [data]);
  const popularFunds = allFunds.slice(0, 4);
  const recentFunds = allFunds.slice(4, 6);
  const totalFundsCount = data?.count ?? allFunds.length;

  const formatRiskLabel = raw => {
    if (!raw) {
      return '';
    }
    const s = String(raw).trim();
    // Normalize casing for common values like `low`, `Moderate`, `Very High`
    const words = s.split(/\s+/).filter(Boolean);
    return words
      .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
      .join(' ');
  };

  const categoryOptions = useMemo(() => {
    if (!allFunds.length) {
      return CATEGORIES;
    }
    const set = new Set();
    allFunds.forEach(f => {
      if (f?.category) {
        set.add(String(f.category));
      }
    });
    const values = Array.from(set).sort((a, b) => String(a).localeCompare(String(b)));
    return [{label: 'All categories', value: ''}, ...values.map(v => ({label: String(v), value: String(v)}))];
  }, [allFunds]);

  const riskOptions = useMemo(() => {
    if (!allFunds.length) {
      return RISKS;
    }
    const set = new Set();
    allFunds.forEach(f => {
      if (f?.risk_label) {
        set.add(String(f.risk_label));
      }
    });
    const values = Array.from(set).sort((a, b) => String(a).localeCompare(String(b)));
    return [{label: 'All risks', value: ''}, ...values.map(v => ({label: formatRiskLabel(v), value: String(v)}))];
  }, [allFunds]);

  const formatSignedPct = raw => {
    if (raw === null || raw === undefined) {
      return '—';
    }
    const s = String(raw).trim().replace('%', '').replace(',', '');
    const n = Number(s);
    if (Number.isNaN(n)) {
      return String(raw);
    }
    const sign = n >= 0 ? '+' : '';
    return `${sign}${n.toFixed(2)}%`;
  };

  const returnColor = raw => {
    const s = String(raw ?? '').trim().replace('%', '').replace(',', '');
    const n = Number(s);
    if (Number.isNaN(n)) {
      return Colors.TEXT_PRIMARY;
    }
    return n >= 0 ? Colors.green : Colors.red;
  };

  const safeParsePct = raw => {
    const s = String(raw ?? '').trim().replace('%', '').replace(',', '');
    const n = Number(s);
    if (Number.isNaN(n)) {
      return null;
    }
    return n;
  };

  const getReturnField = sortKey => {
    if (sortKey === '1y') {
      return 'return1yr';
    }
    if (sortKey === '5y') {
      return 'return5yr';
    }
    return 'return3yr';
  };

  const listPeriodLabel = listSortMode === '1y' ? '1Y' : listSortMode === '5y' ? '5Y' : '3Y';

  const sortedAllFunds = useMemo(() => {
    const field = getReturnField(listSortMode);
    const list = [...allFunds];
    list.sort((a, b) => {
      const av = safeParsePct(a?.[field]) ?? -Infinity;
      const bv = safeParsePct(b?.[field]) ?? -Infinity;
      return bv - av; // descending
    });
    return list;
  }, [allFunds, listSortMode]);

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

  const onStartSIP = useCallback(() => {
    navigateToAllFundsSIP(navigation);
  }, [navigation]);

  const initialLoading = isLoading && !data;
  if (initialLoading) {
    return (
      <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
        <View style={styles.loadingBox}>
          <ActivityIndicator size="large" color={Colors.themeBlue} />
          <Text style={[Textstyles.normal, styles.loadingText]}>Loading…</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.pageTitle}>Explore</Text>
        </View>

        <View style={styles.searchBar}>
          <Text style={styles.searchIcon}>⌕</Text>
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

        {error ? (
          <View style={styles.errorBanner}>
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity onPress={refetch} hitSlop={8} style={styles.retryBtn}>
              <Text style={styles.retryText}>Retry</Text>
            </TouchableOpacity>
          </View>
        ) : null}

        <View style={styles.heroCard}>
          <Image
            source={require('../../assets/Icons/calendarSip.png')}
            style={styles.heroEmoji}
            resizeMode="contain"
          />
          <View style={styles.heroTextCol}>
            <Text style={styles.heroTitle}>Invest every month and grow your wealth with SIP</Text>
            <TouchableOpacity style={styles.heroButton} onPress={onStartSIP} activeOpacity={0.85}>
              <Text style={styles.heroButtonTxt}>Start a SIP</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Popular Funds</Text>
          <TouchableOpacity onPress={onStartSIP} hitSlop={10}>
            <Text style={styles.viewAll}>View All</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.grid}>
          {popularFunds.map((f, idx) => (
            <TouchableOpacity
              key={f.id ?? idx}
              style={styles.popCard}
              activeOpacity={0.75}
              onPress={() => onOpenFund(f)}>
              <View style={styles.popTopRow}>
                <View style={styles.popTop}>
                  {f.logo_url ? (
                    <Image source={{uri: f.logo_url}} style={styles.popLogo} resizeMode="contain" />
                  ) : (
                    <View style={[styles.popLogo, styles.logoPlaceholder]}>
                      <Text style={styles.logoLetter}>{(f.name || '?')[0]}</Text>
                    </View>
                  )}
                  <View style={styles.popTextCol}>
                    <Text style={styles.popName} numberOfLines={2}>
                      {f.name}
                    </Text>
                    {f.category ? (
                      <Text style={styles.popCategory} numberOfLines={1}>
                        {String(f.category).toLowerCase()}
                      </Text>
                    ) : null}
                  </View>
                </View>

                <View style={styles.popReturnCol}>
                  <Text style={styles.popPeriodLabel}>1Y</Text>
                  <Text style={[styles.popReturnVal, {color: returnColor(f.return1yr)}]}>
                    {formatSignedPct(f.return1yr)}
                  </Text>
                </View>
              </View>
              {f.groww_rating != null ? (
                <View style={styles.popRatingRow}>
                  <Text style={styles.popStar}>★</Text>
                  <Text style={styles.popRatingVal}>
                    {(() => {
                      const n = Number(f.groww_rating);
                      return Number.isNaN(n) ? '—' : n;
                    })()}
                  </Text>
                </View>
              ) : null}
              {f.risk_label ? (
                <View style={styles.riskPill}>
                  <Text style={styles.riskTxt}>{String(f.risk_label).replace(/Risk/i, '').trim()} Risk</Text>
                </View>
              ) : null}
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Recently Viewed</Text>
          <View />
        </View>

        <View style={styles.recentRow}>
          {recentFunds.length ? (
            recentFunds.map((f, idx) => (
              <TouchableOpacity
                key={f.id ?? idx}
                style={styles.recentCard}
                activeOpacity={0.75}
                onPress={() => onOpenFund(f)}>
                {f.logo_url ? (
                  <Image source={{uri: f.logo_url}} style={styles.recentLogo} resizeMode="contain" />
                ) : (
                  <View style={[styles.recentLogo, styles.logoPlaceholder]}>
                    <Text style={styles.logoLetter}>{(f.name || '?')[0]}</Text>
                  </View>
                )}
                <View style={styles.recentTextCol}>
                  <Text style={styles.recentName} numberOfLines={2}>
                    {f.name}
                  </Text>
                  {f.risk_label ? (
                    <View style={styles.recentRiskRow}>
                      <Text style={styles.recentRiskTxt}>
                        {String(f.risk_label).replace(/Risk/i, '').trim()} Risk
                      </Text>
                    </View>
                  ) : null}
                </View>

                <View style={styles.recentRight}>
                  <Text style={[styles.recentReturn, {color: returnColor(f.return1yr)}]}>
                    {formatSignedPct(f.return1yr)}
                  </Text>
                  <Text style={styles.recentPeriod}>1Y</Text>
                </View>
              </TouchableOpacity>
            ))
          ) : (
            <View style={styles.recentEmpty}>
              <Text style={styles.recentEmptyTxt}>View a fund to see it here.</Text>
            </View>
          )}
        </View>

        <View style={styles.allFundsBlock}>
          <View style={styles.allFundsHeader}>
            <View style={styles.allFundsHeaderLeft}>
              <Text style={[Textstyles.heading, styles.allFundsTitle]}>All Funds</Text>
              <Text style={styles.allFundsCount}>
                {totalFundsCount} Funds
              </Text>
            </View>
            <TouchableOpacity
              style={styles.sortRightBtn}
              activeOpacity={0.85}
              onPress={() => {
                const order = ['1y', '3y', '5y'];
                const idx = order.indexOf(listSortMode);
                const next = order[(idx + 1) % order.length];
                setListSortMode(next);
              }}>
              <View style={styles.sortRightInner}>
                <Text style={styles.sortRightTxt}>{listPeriodLabel} Returns</Text>
                <Text style={styles.sortRightChevron}>⌄</Text>
              </View>
              <View style={styles.sortDottedUnderline} />
            </TouchableOpacity>
          </View>

          <View style={styles.filterBlock}>
            <Text style={styles.filterLabel}>Category</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll}>
              {categoryOptions.map(c => (
                <Chip
                  key={c.value || 'all-cat'}
                  label={c.label}
                  selected={selectedCategory === c.value}
                  onPress={() => setSelectedCategory(c.value)}
                />
              ))}
            </ScrollView>

            <Text style={styles.filterLabel}>Risk</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll}>
              {riskOptions.map(r => (
                <Chip
                  key={r.value || 'all-risk'}
                  label={r.label}
                  selected={selectedRisk === r.value}
                  onPress={() => setSelectedRisk(r.value)}
                />
              ))}
            </ScrollView>
          </View>

          <View style={styles.fundsListCard}>
            {sortedAllFunds.slice(0, 10).map((f, idx) => {
              const field = getReturnField(listSortMode);
              const raw = f?.[field];
              const ratingNum = f?.groww_rating != null ? Number(f.groww_rating) : null;
              const ratingText = ratingNum === null || Number.isNaN(ratingNum) ? '—' : ratingNum;

              return (
                <TouchableOpacity
                  key={f.id ?? idx}
                  style={styles.fundRow}
                  activeOpacity={0.7}
                  onPress={() => onOpenFund(f)}>
                  <View style={styles.fundRowLeft}>
                    {f.logo_url ? (
                      <Image source={{uri: f.logo_url}} style={styles.fundRowLogo} resizeMode="contain" />
                    ) : (
                      <View style={[styles.fundRowLogo, styles.logoPlaceholder]}>
                        <Text style={styles.logoLetter}>{(f.name || '?')[0]}</Text>
                      </View>
                    )}
                    <View style={styles.fundRowText}>
                      <Text style={styles.fundRowName} numberOfLines={1}>
                        {f.name}
                      </Text>
                      <Text style={styles.fundRowCat} numberOfLines={1}>
                        {String(f.category || '').toLowerCase()}
                      </Text>
                      <View style={styles.fundRowStarLine}>
                        <Text style={styles.starTxt}>★</Text>
                        <Text style={styles.starVal}>{ratingText}</Text>
                      </View>
                    </View>
                  </View>

                  <View style={styles.fundRowRight}>
                    <Text style={[styles.returnBig, {color: returnColor(raw)}]}>
                      {formatSignedPct(raw)}
                    </Text>
                    <Text style={styles.periodSmall}>{listPeriodLabel}</Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        <View style={styles.bottomSpacer} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {flex: 1, backgroundColor: '#F9FAFB'},
  scrollContent: {paddingBottom: 28},

  loadingBox: {flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24},
  loadingText: {marginTop: 12, color: Colors.GREY, fontSize: 15},

  header: {paddingHorizontal: 16, paddingTop: 10, paddingBottom: 6},
  pageTitle: {fontSize: 22, fontWeight: '700', color: Colors.TEXT_PRIMARY},

  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.BORDER_GREY,
    borderRadius: 10,
    marginHorizontal: 16,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 14,
  },
  searchIcon: {fontSize: 16, color: Colors.GREY, marginRight: 8},
  searchInput: {flex: 1, fontSize: 15, color: Colors.TEXT_PRIMARY, paddingVertical: 6},
  clearSearch: {padding: 4},
  clearText: {fontSize: 16, color: Colors.GREY},

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
  retryText: {color: Colors.themeBlue, fontWeight: '600'},

  heroCard: {
    backgroundColor: Colors.white,
    borderRadius: 14,
    marginHorizontal: 16,
    borderWidth: 1,
    borderColor: Colors.BORDER_GREY,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 18,
    gap: 12,
  },
  heroEmoji: {width: 34, height: 34},
  heroTextCol: {flex: 1},
  heroTitle: {fontSize: 16, color: Colors.TEXT_PRIMARY, lineHeight: 22, marginBottom: 12},
  heroButton: {
    backgroundColor: '#22C55E',
    alignSelf: 'flex-start',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 10,
  },
  heroButtonTxt: {color: Colors.white, fontSize: 15, fontWeight: '500'},

  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginTop: 4,
    marginBottom: 10,
  },
  sectionTitle: {fontSize: 16, fontWeight: '700', color: Colors.TEXT_PRIMARY},
  viewAll: {color: Colors.themeBlue, fontWeight: '500'},

  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 16,
    gap: 12,
    marginBottom: 22,
  },
  popCard: {
    width: '48%',
    backgroundColor: Colors.white,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.BORDER_GREY,
    padding: 12,
  },
  popTop: {flexDirection: 'row', alignItems: 'center'},
  popTopRow: {flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between'},
  popReturnCol: {alignItems: 'flex-end'},
  popLogo: {width: 36, height: 36, borderRadius: 10, marginRight: 10},
  logoPlaceholder: {
    backgroundColor: Colors.offWhite,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.BORDER_GREY,
  },
  logoLetter: {fontSize: 14, fontWeight: '500', color: Colors.themeBlue},
  popTextCol: {flex: 1, minWidth: 0},
  popName: {fontSize: 13, fontWeight: '500', color: Colors.TEXT_PRIMARY, lineHeight: 18},
  popCategory: {fontSize: 12, color: Colors.GREY, marginTop: 4},
  popPeriodLabel: {fontSize: 11, color: Colors.GREY, fontWeight: '500', marginBottom: 4},
  popReturnVal: {fontSize: 14, fontWeight: '500'},

  riskPill: {
    marginTop: 8,
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: '#F3F4F6',
  },
  riskTxt: {fontSize: 12, fontWeight: '500', color: Colors.GREY},

  popRatingRow: {flexDirection: 'row', alignItems: 'center', marginTop: 8, gap: 6},
  popStar: {color: '#9CA3AF', fontSize: 12},
  popRatingVal: {color: '#9CA3AF', fontSize: 12, fontWeight: '500'},

  recentRow: {flexDirection: 'row', paddingHorizontal: 16, gap: 12, marginBottom: 18},
  recentCard: {
    flex: 1,
    backgroundColor: Colors.white,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.BORDER_GREY,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  recentLogo: {width: 34, height: 34, borderRadius: 10},
  recentTextCol: {flex: 1, paddingLeft: 0},
  recentName: {fontSize: 13, fontWeight: '500', color: Colors.TEXT_PRIMARY, lineHeight: 18, flexShrink: 1},
  recentRiskRow: {marginTop: 6},
  recentRiskTxt: {fontSize: 12, color: Colors.GREY, fontWeight: '500'},
  recentRight: {alignItems: 'flex-end', minWidth: 72},
  recentReturn: {fontSize: 13, fontWeight: '500'},
  recentPeriod: {fontSize: 11, color: Colors.GREY, marginTop: 4},
  recentEmpty: {
    flex: 1,
    backgroundColor: Colors.white,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.BORDER_GREY,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  recentEmptyTxt: {fontSize: 13, color: Colors.GREY, textAlign: 'center'},
  bottomSpacer: {height: 24},

  allFundsBlock: {paddingBottom: 18},
  allFundsHeader: {
    paddingHorizontal: 16,
    paddingTop: 6,
    paddingBottom: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    gap: 12,
  },
  allFundsHeaderLeft: {flex: 1},
  allFundsTitle: {fontSize: 16, marginBottom: 6, color: Colors.TEXT_PRIMARY},
  allFundsCount: {fontSize: 14, color: Colors.GREY, marginTop: 2},

  sortRightBtn: {paddingLeft: 10, paddingRight: 6, alignItems: 'flex-end'},
  sortRightInner: {flexDirection: 'row', alignItems: 'center', gap: 6},
  sortRightTxt: {fontSize: 14, fontWeight: '500', color: Colors.TEXT_PRIMARY},
  sortRightChevron: {fontSize: 12, color: Colors.GREY},
  sortDottedUnderline: {
    marginTop: 6,
    width: 120,
    borderBottomWidth: 2,
    borderBottomColor: '#D1D5DB',
    borderStyle: 'dotted',
  },

  fundsListCard: {
    backgroundColor: Colors.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.BORDER_GREY,
    overflow: 'hidden',
    marginHorizontal: 16,
  },

  fundRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingVertical: 14,
    paddingHorizontal: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.BORDER_GREY,
  },
  fundRowLeft: {flex: 1, flexDirection: 'row', alignItems: 'center', paddingRight: 10},
  fundRowLogo: {width: 38, height: 38, borderRadius: 10, marginRight: 10},
  fundRowText: {flex: 1, minWidth: 0},
  fundRowName: {fontSize: 14, fontWeight: '500', color: Colors.TEXT_PRIMARY},
  fundRowCat: {fontSize: 12, color: Colors.GREY, marginTop: 4},
  fundRowStarLine: {flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4},
  starTxt: {color: '#9CA3AF', fontSize: 12},
  starVal: {color: '#9CA3AF', fontSize: 12, fontWeight: '500'},

  fundRowRight: {alignItems: 'flex-end', minWidth: 90},
  returnBig: {fontSize: 13, fontWeight: '500'},
  periodSmall: {fontSize: 11, color: Colors.GREY, marginTop: 4},

  filterBlock: {paddingHorizontal: 0, marginTop: 10, marginBottom: 12},
  filterLabel: {fontSize: 13, color: Colors.GREY, marginLeft: 6, marginBottom: 8, marginTop: 6},
  chipScroll: {marginBottom: 12, paddingHorizontal: 16, maxHeight: 40},
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 22,
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.BORDER_GREY,
    marginRight: 8,
  },
  chipSelected: {
    backgroundColor: '#E0F2FE',
    borderColor: Colors.themeBlue,
  },
  chipText: {fontSize: 12, color: Colors.TEXT_PRIMARY, fontWeight: '600'},
  chipTextSelected: {color: Colors.themeBlue, fontWeight: '500'},
});
