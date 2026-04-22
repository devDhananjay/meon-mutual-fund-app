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
import {SafeAreaView, useSafeAreaInsets} from 'react-native-safe-area-context';
import {useNavigation} from '@react-navigation/native';
import {useAllFunds} from '../../hooks/useAllFunds';
import {navigateToAllFundsSIP, navigateToFundDetail} from '../../navigation/navigationRef';
import {pickSchemeCode} from '../../utils/schemeCode';
import {Colors} from '../../utils/AppConstant';
import Textstyles from '../../utils/text';
import {typeScale} from '../../theme/typography';
import {SEARCH_FIELD} from '../../theme/searchField';
import {TAB_SCREEN_SAFE_TOP_EXTRA, TAB_SCREEN_TITLE_TO_SEARCH} from '../../theme/tabScreenLayout';
import Icons from '../../utils/icons';
import {useAppTheme} from '../../theme/useAppTheme';

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
      return7yr: scheme?.returns?.['7y'],
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

function Chip({label, selected, onPress, chipStyles}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      style={[chipStyles.chip, selected && chipStyles.chipSelected]}
      activeOpacity={0.85}>
      <Text style={[Textstyles.normal, chipStyles.chipText, selected && chipStyles.chipTextSelected]} numberOfLines={1}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}

export default function ExploreScreen() {
  const navigation = useNavigation();
  const {colors, isDark} = useAppTheme();
  const styles = useMemo(() => createExploreStyles(colors, isDark), [colors, isDark]);
  const insets = useSafeAreaInsets();
  const headerPadTop = insets.top + TAB_SCREEN_SAFE_TOP_EXTRA;
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedRisk, setSelectedRisk] = useState('');
  const [listSortMode, setListSortMode] = useState('none');

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
      return colors.textPrimary;
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
    if (sortKey === '7y') {
      return 'return7yr';
    }
    return 'return3yr';
  };

  const listPeriodLabel =
    listSortMode === '1y' ? '1Y' : listSortMode === '5y' ? '5Y' : listSortMode === '7y' ? '7Y' : '3Y';

  const displaySortMode = listSortMode === 'none' ? '1y' : listSortMode;
  const displayPeriodLabel = displaySortMode === '1y' ? '1Y' : displaySortMode === '5y' ? '5Y' : displaySortMode === '7y' ? '7Y' : '3Y';

  const sortedAllFunds = useMemo(() => {
    if (listSortMode === 'none') {
      return allFunds;
    }
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

  return (
    <SafeAreaView style={[styles.safe, {backgroundColor: colors.background}]} edges={['left', 'right']}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={[styles.headerBlock, {paddingTop: headerPadTop, backgroundColor: colors.background}]}>
          <View style={styles.titleRow}>
            <Text style={styles.pageTitle}>Explore</Text>
          </View>

          <View style={styles.searchBar}>
          <Image source={Icons.SearchIcon} style={styles.searchIconImg} resizeMode="contain" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search funds..."
            placeholderTextColor={colors.textSecondary}
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
        </View>

        {initialLoading ? (
          <View style={[styles.loadingInline, {paddingTop: 0}]}>
            <ActivityIndicator size="small" color={colors.primary} />
            <Text style={[Textstyles.normal, styles.loadingTextInline]}>Loading…</Text>
          </View>
        ) : null}

        {error ? (
          <View style={styles.errorBanner}>
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity onPress={refetch} hitSlop={8} style={styles.retryBtn}>
              <Text style={styles.retryText}>Retry</Text>
            </TouchableOpacity>
          </View>
        ) : null}

        <View style={styles.heroCard}>
          <View style={[styles.heroIconWrap, {backgroundColor: isDark ? '#1F2937' : '#F6F0F0'}]}>
            <Image
              source={require('../../assets/Icons/calendarSip.png')}
              style={styles.heroEmoji}
              resizeMode="contain"
            />
          </View>
          <View style={styles.heroTextCol}>
            <Text style={styles.heroTitle}>Invest every month and grow your wealth with SIP</Text>
            <TouchableOpacity style={styles.heroButton} onPress={onStartSIP} activeOpacity={0.85}>
              <Text style={[styles.heroButtonTxt, Textstyles.normal]}>Start SIP</Text>
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

              <View style={styles.popMetricsRow}>
                {f.risk_label ? (
                  <Text style={styles.riskPlain} numberOfLines={1}>
                    {String(f.risk_label).replace(/Risk/i, '').trim()} Risk
                  </Text>
                ) : (
                  <View style={styles.popMetricsSpacer} />
                )}
                <View style={styles.popReturnCol}>
                  <Text style={styles.popPeriodLabel}>1Y</Text>
                  <Text style={[styles.popReturnVal, {color: returnColor(f.return1yr)}]}>
                    {formatSignedPct(f.return1yr)}
                  </Text>
                </View>
              </View>
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
                  <View style={styles.recentMetricsRow}>
                    {f.risk_label ? (
                      <Text style={styles.recentRiskTxt} numberOfLines={1}>
                        {String(f.risk_label).replace(/Risk/i, '').trim()} Risk
                      </Text>
                    ) : (
                      <View style={styles.recentMetricsSpacer} />
                    )}
                    <View style={styles.recentReturnCol}>
                      <Text style={styles.recentPeriod}>1Y</Text>
                      <Text style={[styles.recentReturn, {color: returnColor(f.return1yr)}]}>
                        {formatSignedPct(f.return1yr)}
                      </Text>
                    </View>
                  </View>
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
                const order = ['none', '1y', '3y', '5y', '7y'];
                const idx = order.indexOf(listSortMode);
                const next = order[(idx + 1) % order.length];
                setListSortMode(next);
              }}>
              <View style={styles.sortRightInner}>
                <Text style={styles.sortRightTxt}>
                  {listSortMode === 'none' ? 'Default' : `${listPeriodLabel} Returns`}
                </Text>
                <Image source={Icons.DropDown} style={styles.sortRightChevron} resizeMode="contain" />
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
                  chipStyles={styles}
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
                  chipStyles={styles}
                />
              ))}
            </ScrollView>
          </View>

          <View style={styles.fundsListCard}>
            {sortedAllFunds.slice(0, 10).map((f, idx) => {
              const field = getReturnField(displaySortMode);
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
                        <Text style={[styles.starVal, {color: returnColor(raw)}]}>{formatSignedPct(raw)}</Text>
                        <Text style={styles.starPeriod}>{displayPeriodLabel}</Text>
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

function createExploreStyles(colors, isDark) {
  const border = colors.border;
  const card = colors.card;
  const chipSelBg = isDark ? 'rgba(96,165,250,0.12)' : '#E0F2FE';
  const errBg = isDark ? 'rgba(248,113,113,0.12)' : '#FEF2F2';
  const errBorder = isDark ? 'rgba(248,113,113,0.35)' : '#FECACA';
  const errText = isDark ? '#FCA5A5' : '#B91C1C';

  return StyleSheet.create({
    safe: {flex: 1},
    scrollContent: {paddingBottom: 28},

    loadingBox: {flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24},
    loadingInline: {paddingHorizontal: 16, paddingBottom: 10, flexDirection: 'row', alignItems: 'center', gap: 10},
    loadingText: {marginTop: 12, color: colors.textSecondary, fontSize: SEARCH_FIELD.inputFontSize},
    loadingTextInline: {marginTop: 0, color: colors.textSecondary, fontSize: 14},

    headerBlock: {
      paddingHorizontal: 16,
    },
    titleRow: {
      marginBottom: TAB_SCREEN_TITLE_TO_SEARCH,
    },
    pageTitle: {...Textstyles.heading, fontSize: typeScale.title, color: colors.textPrimary},

    searchBar: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: card,
      borderWidth: 1,
      borderColor: border,
      borderRadius: SEARCH_FIELD.borderRadius,
      marginHorizontal: 0,
      paddingHorizontal: SEARCH_FIELD.paddingHorizontal,
      paddingVertical: SEARCH_FIELD.paddingVertical,
      minHeight: SEARCH_FIELD.minHeight,
      marginBottom: 14,
    },
    searchIconImg: {
      width: SEARCH_FIELD.iconSize,
      height: SEARCH_FIELD.iconSize,
      marginRight: SEARCH_FIELD.iconMarginRight,
      ...(isDark ? {tintColor: colors.textSecondary} : {}),
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
      marginHorizontal: 16,
      marginBottom: 10,
      backgroundColor: errBg,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: errBorder,
      padding: 12,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 10,
    },
    errorText: {flex: 1, color: errText, fontSize: 13},
    retryBtn: {paddingVertical: 6, paddingHorizontal: 10},
    retryText: {...Textstyles.medium, color: colors.primary, fontWeight: '600'},

    heroCard: {
      backgroundColor: card,
      borderRadius: 14,
      marginHorizontal: 16,
      borderWidth: 1,
      borderColor: border,
      padding: 16,
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 18,
      gap: 12,
    },
    /** Match Dashboard Start SIP calendar wrap */
    heroEmoji: {width: 44, height: 44},
    heroIconWrap: {
      width: 72,
      height: 72,
      borderRadius: 36,
      alignItems: 'center',
      justifyContent: 'center',
    },
    heroTextCol: {flex: 1},
    heroTitle: {fontSize: 16, color: colors.textPrimary, lineHeight: 22, marginBottom: 12},
    heroButton: {
      backgroundColor: colors.primary,
      alignSelf: 'flex-start',
      paddingVertical: 10,
      paddingHorizontal: 16,
      borderRadius: 10,
    },
    heroButtonTxt: {...Textstyles.medium, color: '#FFFFFF', fontSize: 15},

    sectionHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: 16,
      marginTop: 4,
      marginBottom: 10,
    },
    sectionTitle: {...Textstyles.heading, fontSize: 16, color: colors.textPrimary},
    viewAll: {...Textstyles.medium, color: colors.primary, fontWeight: '500'},

    grid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      paddingHorizontal: 16,
      gap: 12,
      marginBottom: 22,
    },
    popCard: {
      width: '48%',
      backgroundColor: card,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: border,
      padding: 12,
    },
    popTop: {flexDirection: 'row', alignItems: 'center'},
    popMetricsRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginTop: 10,
      gap: 8,
      minHeight: 36,
    },
    popMetricsSpacer: {flex: 1, minWidth: 0},
    popReturnCol: {alignItems: 'flex-end', flexShrink: 0},
    popLogo: {width: 36, height: 36, borderRadius: 10, marginRight: 10},
    logoPlaceholder: {
      backgroundColor: isDark ? colors.inputBg : '#F3F4F6',
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: border,
    },
    logoLetter: {...Textstyles.medium, fontSize: 14, fontWeight: '500', color: colors.primary},
    popTextCol: {flex: 1, minWidth: 0},
    popName: {...Textstyles.medium, fontSize: 13, fontWeight: '500', color: colors.textPrimary, lineHeight: 18},
    popCategory: {fontSize: 12, color: colors.textSecondary, marginTop: 4},
    popPeriodLabel: {...Textstyles.medium, fontSize: 11, color: colors.textSecondary, fontWeight: '500', marginBottom: 4},
    popReturnVal: {...Textstyles.medium, fontSize: 14, fontWeight: '500'},

    riskPlain: {
      ...Textstyles.medium,
      fontSize: 12,
      fontWeight: '500',
      color: colors.textSecondary,
      flex: 1,
      minWidth: 0,
      marginRight: 8,
    },

    recentRow: {flexDirection: 'row', paddingHorizontal: 16, gap: 12, marginBottom: 18},
    recentCard: {
      flex: 1,
      backgroundColor: card,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: border,
      padding: 12,
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 10,
    },
    recentLogo: {width: 34, height: 34, borderRadius: 10, marginTop: 2},
    recentTextCol: {flex: 1, paddingLeft: 0, minWidth: 0},
    recentName: {...Textstyles.medium, fontSize: 13, fontWeight: '500', color: colors.textPrimary, lineHeight: 18, flexShrink: 1},
    recentMetricsRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginTop: 6,
      gap: 8,
      minHeight: 36,
    },
    recentMetricsSpacer: {flex: 1, minWidth: 0},
    recentRiskTxt: {...Textstyles.medium, fontSize: 12, color: colors.textSecondary, fontWeight: '500', flex: 1, minWidth: 0, marginRight: 8},
    recentReturnCol: {alignItems: 'flex-end', flexShrink: 0},
    recentReturn: {...Textstyles.medium, fontSize: 13, fontWeight: '500'},
    recentPeriod: {fontSize: 11, color: colors.textSecondary, marginBottom: 2},
    recentEmpty: {
      flex: 1,
      backgroundColor: card,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: border,
      padding: 16,
      alignItems: 'center',
      justifyContent: 'center',
    },
    recentEmptyTxt: {fontSize: 13, color: colors.textSecondary, textAlign: 'center'},
    bottomSpacer: {height: 24},

    allFundsBlock: {paddingBottom: 18, paddingHorizontal: 16},
    allFundsHeader: {
      paddingHorizontal: 0,
      paddingTop: 6,
      paddingBottom: 10,
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-end',
      gap: 12,
    },
    allFundsHeaderLeft: {flex: 1},
    allFundsTitle: {fontSize: 16, marginBottom: 6, color: colors.textPrimary},
    allFundsCount: {fontSize: 14, color: colors.textSecondary, marginTop: 2},

    sortRightBtn: {paddingLeft: 10, paddingRight: 6, alignItems: 'flex-end'},
    sortRightInner: {flexDirection: 'row', alignItems: 'center', gap: 6},
    sortRightTxt: {...Textstyles.medium, fontSize: 14, fontWeight: '500', color: colors.textPrimary},
    sortRightChevron: {width: 12, height: 12, tintColor: colors.textSecondary},
    sortDottedUnderline: {
      marginTop: 6,
      width: 120,
      borderBottomWidth: 2,
      borderBottomColor: border,
      borderStyle: 'dotted',
    },

    fundsListCard: {
      backgroundColor: 'transparent',
      borderRadius: 0,
      borderWidth: 0,
      borderColor: 'transparent',
      overflow: 'visible',
      marginHorizontal: 0,
    },

    fundRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      paddingVertical: 14,
      paddingHorizontal: 14,
      borderWidth: 1,
      borderColor: border,
      borderRadius: 12,
      backgroundColor: card,
      marginBottom: 10,
    },
    fundRowLeft: {flex: 1, flexDirection: 'row', alignItems: 'center', paddingRight: 10},
    fundRowLogo: {width: 38, height: 38, borderRadius: 10, marginRight: 10},
    fundRowText: {flex: 1, minWidth: 0},
    fundRowName: {...Textstyles.medium, fontSize: 14, fontWeight: '500', color: colors.textPrimary},
    fundRowCat: {fontSize: 12, color: colors.textSecondary, marginTop: 4},
    fundRowStarLine: {flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4},
    starTxt: {color: colors.textSecondary, fontSize: 12},
    starVal: {...Textstyles.medium, color: colors.textSecondary, fontSize: 12, fontWeight: '500'},
    starPeriod: {fontSize: 11, color: colors.textSecondary, fontWeight: '500'},

    fundRowRight: {alignItems: 'flex-end', minWidth: 90},
    returnBig: {...Textstyles.medium, fontSize: 13, fontWeight: '500'},
    periodSmall: {fontSize: 11, color: colors.textSecondary, marginTop: 4},

    filterBlock: {paddingHorizontal: 0, marginTop: 10, marginBottom: 12},
    filterLabel: {fontSize: 13, color: colors.textSecondary, marginLeft: 6, marginBottom: 8, marginTop: 6},
    chipScroll: {marginBottom: 12, paddingHorizontal: 0, maxHeight: 40},
    chip: {
      paddingHorizontal: 14,
      paddingVertical: 10,
      borderRadius: 22,
      backgroundColor: card,
      borderWidth: 1,
      borderColor: border,
      marginRight: 8,
    },
    chipSelected: {
      backgroundColor: chipSelBg,
      borderColor: colors.primary,
    },
    chipText: {...Textstyles.medium, fontSize: 12, color: colors.textPrimary, fontWeight: '600'},
    chipTextSelected: {...Textstyles.medium, color: colors.primary, fontWeight: '500'},
  });
}
