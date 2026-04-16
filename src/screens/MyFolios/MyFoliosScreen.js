import React, {useCallback, useMemo, useState} from 'react';
import {
  View,
  Text,
  StyleSheet,
  SectionList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  TextInput,
  Image,
  StatusBar,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import AppTabHeader from '../../components/AppTabHeader';
import {useNavigation} from '@react-navigation/native';
import {navigateToFundDetail} from '../../navigation/navigationRef';
import {pickSchemeCode} from '../../utils/schemeCode';
import {groupHoldingsByFolio} from '../../utils/groupHoldingsByFolio';
import {usePortfolioData} from '../../hooks/usePortfolioData';
import {Colors} from '../../utils/AppConstant';
import Textstyles from '../../utils/text';
import Icons from '../../utils/icons';
import {useAppTheme} from '../../theme/useAppTheme';
import {SEARCH_FIELD} from '../../theme/searchField';
import {TAB_SCREEN_TITLE_TO_SEARCH} from '../../theme/tabScreenLayout';

const PAGE_BG = '#F8FAFC';
const CARD_BORDER = '#E5E7EB';
const GREEN_CTA = '#1E81F2';
const LOSS_RED = '#DC2626';
const GAIN_GREEN = '#16A34A';
const LABEL_GRAY = '#6B7280';

function formatInr(value) {
  if (value === null || value === undefined || value === '') {
    return '—';
  }
  const n = Number(value);
  if (Number.isNaN(n)) {
    return String(value);
  }
  const isInt = Math.abs(n - Math.round(n)) < 0.000001;
  const digits = isInt ? 0 : 2;
  return `₹ ${n.toLocaleString('en-IN', {minimumFractionDigits: digits, maximumFractionDigits: digits})}`;
}

function sumHoldings(holdings, field) {
  return holdings.reduce((acc, h) => acc + (Number(h?.[field]) || 0), 0);
}

function gainLossFromHolding(item) {
  const tr = item?.total_return;
  const trp = item?.total_return_per;
  if (tr != null && tr !== '') {
    const n = Number(tr);
    if (!Number.isNaN(n)) {
      return {abs: n, pct: trp != null ? Number(trp) : null, isGain: n >= 0};
    }
  }
  const cur = Number(item?.current_holding) || 0;
  const inv = Number(item?.amount) || 0;
  const diff = cur - inv;
  const pct = inv ? (diff / inv) * 100 : null;
  return {abs: diff, pct, isGain: diff >= 0};
}

function formatGainLossLine(item) {
  const {abs, pct, isGain} = gainLossFromHolding(item);
  const absNum = Math.abs(abs);
  const absStr = `${abs >= 0 ? '+' : '-'}₹${absNum.toLocaleString('en-IN', {maximumFractionDigits: 2})}`;
  if (pct != null && !Number.isNaN(pct)) {
    return {text: `${absStr} (${pct >= 0 ? '+' : ''}${Number(pct).toFixed(2)}%)`, isGain};
  }
  return {text: absStr, isGain};
}

function pickXirr(item) {
  const raw = item?.xirr ?? item?.scheme_xirr ?? item?.current_xirr ?? item?.portfolio_xirr ?? item?.xirr_value;
  if (raw === null || raw === undefined || raw === '') {
    return null;
  }
  const n = Number(raw);
  if (Number.isNaN(n)) {
    return null;
  }
  return n;
}

/** Top-right duration badge (e.g. 3Y) — uses API fields when present. */
function pickDurationLabel(item) {
  const lbl = item?.duration_label ?? item?.tenure ?? item?.holding_tenure;
  if (lbl != null && String(lbl).trim() !== '') {
    return String(lbl).trim();
  }
  const y = item?.duration_years ?? item?.holding_years ?? item?.investment_years;
  if (y != null && !Number.isNaN(Number(y))) {
    return `${Number(y)}Y`;
  }
  return null;
}

function FundLogo({name, uri, colors, isDark}) {
  if (uri) {
    return <Image source={{uri}} style={styles.fundLogo} resizeMode="contain" />;
  }
  const letter = (name || '?')[0]?.toUpperCase() ?? '?';
  return (
    <View style={[styles.fundLogo, styles.fundLogoPh, {backgroundColor: isDark ? '#2A2A2A' : '#F3F4F6', borderColor: colors.border}]}>
      <Text style={[styles.fundLogoLetter, {color: colors.primary}]}>{letter}</Text>
    </View>
  );
}

function FolioHoldingRow({item, onOpenFund, onInvestMore, colors, isDark}) {
  const rawName = item.scheme_name ?? item.base_scheme_name ?? 'Fund';
  const name = typeof rawName === 'string' ? rawName.trim() : String(rawName);
  const logo = item.logo_url ?? item.logo;
  const duration = pickDurationLabel(item);
  const {text: glText, isGain} = formatGainLossLine(item);
  const glColor = isGain ? GAIN_GREEN : LOSS_RED;
  const xirr = pickXirr(item);
  const currentVal = formatInr(item.current_holding);

  return (
    <View style={[styles.folioCard, {backgroundColor: colors.card, borderColor: colors.border}]}>
      <TouchableOpacity activeOpacity={0.75} onPress={() => onOpenFund(item)} style={styles.cardTap}>
        <View style={styles.cardTopRow}>
          <FundLogo name={name} uri={logo} colors={colors} isDark={isDark} />
          <View style={styles.cardTitleBlock}>
            <Text style={[styles.fundName, {color: colors.textPrimary}]} numberOfLines={2}>
              {name}
            </Text>
            {duration ? (
              <Text style={[styles.durationBadge, {color: colors.textSecondary}]}>{duration}</Text>
            ) : null}
          </View>
          <View style={styles.xirrCorner}>
            <Text style={[styles.metricLabel, {color: colors.textSecondary}]}>XIRR</Text>
            <Text style={[styles.metricValueDark, {color: colors.textPrimary}]}>
              {xirr != null ? `${xirr.toFixed(2)}%` : '—'}
            </Text>
          </View>
        </View>

        <View style={styles.metrics2Col}>
          <View style={styles.metricCol}>
            <Text style={[styles.metricLabel, {color: colors.textSecondary}]}>Invested Value</Text>
            <Text style={[styles.metricValueDark, {color: colors.textPrimary}]}>{formatInr(item.amount)}</Text>
          </View>
          <View style={styles.metricCol}>
            <Text style={[styles.metricLabel, {color: colors.textSecondary}]}>Gain/Loss</Text>
            <Text style={[styles.metricValueGl, {color: glColor}]} numberOfLines={2}>
              {glText}
            </Text>
          </View>
        </View>
      </TouchableOpacity>

      <View style={[styles.cardDivider, {backgroundColor: colors.border}]} />

      <View style={styles.cardFooter}>
        <View style={styles.currentBlock}>
          <Text style={[styles.metricLabel, {color: colors.textSecondary}]}>Current Value</Text>
          <Text style={[styles.currentValue, {color: GAIN_GREEN}]}>{currentVal}</Text>
        </View>
        <TouchableOpacity
          style={[styles.investMoreBtn, {backgroundColor: colors.primary}]}
          onPress={() => onInvestMore(item)}
          activeOpacity={0.88}>
          <Text style={styles.investMoreTxt}>Invest more</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

export default function MyFoliosScreen() {
  const navigation = useNavigation();
  const {colors, isDark} = useAppTheme();
  const {data, isPending, error, refreshing, refetch} = usePortfolioData();
  const [search, setSearch] = useState('');

  const filteredHoldings = useMemo(() => {
    const holdings = data?.holdings ?? [];
    const q = search.trim().toLowerCase();
    if (!q) {
      return holdings;
    }
    return holdings.filter(h => {
      const n = (h.scheme_name ?? h.base_scheme_name ?? '').toLowerCase();
      return n.includes(q);
    });
  }, [data?.holdings, search]);

  const sections = useMemo(() => groupHoldingsByFolio(filteredHoldings), [filteredHoldings]);

  const onOpenFund = useCallback(
    fund => {
      const code = pickSchemeCode(fund);
      if (!code) {
        return;
      }
      navigateToFundDetail(navigation, {
        schemeCode: code,
        schemeName: fund?.scheme_name ?? fund?.base_scheme_name,
      });
    },
    [navigation],
  );

  const onInvestMore = useCallback(
    fund => {
      onOpenFund(fund);
    },
    [onOpenFund],
  );

  const renderSectionHeader = useCallback(
    ({section}) => {
      const onlyDefault = sections.length === 1 && section.folioKey === 'default';
      if (onlyDefault) {
        return null;
      }
      const secData = section.data ?? [];
      return (
        <View style={styles.sectionHead}>
          <Text style={[Textstyles.heading, styles.sectionTitle]}>{section.title}</Text>
          <Text style={styles.sectionMeta}>
            {secData.length} fund{secData.length !== 1 ? 's' : ''} · {formatInr(sumHoldings(secData, 'current_holding'))}{' '}
            current
          </Text>
        </View>
      );
    },
    [sections],
  );

  const renderItem = useCallback(
    ({item}) => (
      <FolioHoldingRow item={item} onOpenFund={onOpenFund} onInvestMore={onInvestMore} colors={colors} isDark={isDark} />
    ),
    [colors, isDark, onOpenFund, onInvestMore],
  );

  const tabHeader = useMemo(() => <AppTabHeader title="My Folios" />, []);

  const listHeader = useMemo(
    () => (
      <View style={styles.searchOuter}>
        <View style={[styles.searchCard, {backgroundColor: colors.inputBg, borderColor: colors.border}]}>
          <Image source={Icons.SearchIcon} style={styles.searchIconImg} resizeMode="contain" />
          <TextInput
            style={[styles.searchInput, {color: colors.textPrimary}]}
            placeholder="Search folios..."
            placeholderTextColor={colors.textSecondary}
            value={search}
            onChangeText={setSearch}
            returnKeyType="search"
            autoCapitalize="none"
            autoCorrect={false}
          />
        </View>
      </View>
    ),
    [colors.border, colors.inputBg, colors.textPrimary, colors.textSecondary, search],
  );

  const showInlineLoader = isPending && !refreshing;

  return (
    <SafeAreaView style={[styles.safe, {backgroundColor: colors.background}]} edges={['left', 'right']}>
      <StatusBar barStyle={colors.statusBar} backgroundColor={colors.background} />
      {error ? (
        <View style={[styles.errorBanner, {backgroundColor: colors.card, borderColor: colors.border}]}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity onPress={() => refetch()} hitSlop={8}>
            <Text style={[styles.retry, {color: colors.primary}]}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : null}

      <View style={[styles.fixedHeaderWrap, {backgroundColor: colors.background}]}>{tabHeader}</View>

      {showInlineLoader ? (
        <View style={styles.loadingInline}>
          <ActivityIndicator size="small" color={colors.primary} />
          <Text style={[Textstyles.normal, styles.loadingTxtInline, {color: colors.textSecondary}]}>Loading folios…</Text>
        </View>
      ) : null}

      <SectionList
        sections={sections}
        keyExtractor={(item, index) => String(item.scheme_code ?? item.isin ?? index)}
        renderItem={renderItem}
        // renderSectionHeader={renderSectionHeader}
        stickySectionHeadersEnabled={false}
        ListHeaderComponent={listHeader}
        contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refetch} tintColor={colors.primary} />}
        ListEmptyComponent={
          <View style={styles.emptyWrap}>
            <View style={[styles.emptyCard, {backgroundColor: colors.card, borderColor: colors.border}]}>
              <Text style={[Textstyles.medium, styles.emptyTitle, {color: colors.textPrimary}]}>No folios match</Text>
              <Text style={[Textstyles.normal, styles.emptySub, {color: colors.textSecondary}]}>
                {search ? 'Try another search or clear the filter.' : 'Invest from Explore to see holdings here.'}
              </Text>
              <TouchableOpacity
                style={[styles.cta, {backgroundColor: colors.primary}]}
                onPress={() => navigation.navigate('Explore')}
                activeOpacity={0.85}>
                <Text style={[Textstyles.medium, styles.ctaTxt]}>Explore funds</Text>
              </TouchableOpacity>
            </View>
          </View>
        }
        showsVerticalScrollIndicator={false}
        style={styles.sectionList}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {flex: 1, backgroundColor: PAGE_BG},
  fixedHeaderWrap: {backgroundColor: PAGE_BG},
  loadingBox: {flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24},
  loadingInline: {paddingHorizontal: 16, paddingVertical: 10, flexDirection: 'row', alignItems: 'center', gap: 10},
  loadingTxt: {marginTop: 12, color: Colors.GREY},
  loadingTxtInline: {marginTop: 0, color: Colors.GREY},
  searchOuter: {marginTop: TAB_SCREEN_TITLE_TO_SEARCH, marginBottom: 8},
  searchCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderRadius: SEARCH_FIELD.borderRadius,
    borderWidth: 1,
    borderColor: CARD_BORDER,
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
    color: Colors.TEXT_PRIMARY,
    paddingVertical: SEARCH_FIELD.inputPaddingVertical,
  },
  listContent: {paddingBottom: 32, paddingHorizontal: 16},
  sectionList: {flex: 1},
  sectionHead: {
    paddingTop: 12,
    paddingBottom: 8,
    paddingHorizontal: 0,
  },
  sectionTitle: {fontSize: 15, color: Colors.TEXT_PRIMARY},
  sectionMeta: {fontSize: 13, color: LABEL_GRAY, marginTop: 4, textAlign: 'left'},
  folioCard: {
    backgroundColor: Colors.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: CARD_BORDER,
    marginBottom: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 1},
    shadowOpacity: 0.06,
    shadowRadius: 4,
    // elevation: 2,
  },
  cardTap: {padding: 14},
  cardTopRow: {flexDirection: 'row', alignItems: 'flex-start', marginBottom: 14},
  cardTitleBlock: {flex: 1, minWidth: 0, marginRight: 8},
  xirrCorner: {alignItems: 'flex-end', justifyContent: 'flex-start', minWidth: 64, paddingTop: 2},
  fundLogo: {width: 40, height: 40, borderRadius: 8, marginRight: 10},
  fundLogoPh: {
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  fundLogoLetter: {...Textstyles.medium, fontSize: 16, fontWeight: '500', color: '#374151'},
  fundName: {
    flex: 1,
    fontSize: 15,
    fontWeight: '500',
    color: Colors.TEXT_PRIMARY,
    lineHeight: 20,
    paddingRight: 8,
  },
  durationBadge: {...Textstyles.medium, fontSize: 12, fontWeight: '600', marginTop: 4},
  metrics2Col: {flexDirection: 'row', justifyContent: 'space-between', gap: 12},
  metricCol: {flex: 1, minWidth: 0},
  metricLabel: {fontSize: 12, color: LABEL_GRAY, marginBottom: 6},
  metricValueDark: {...Textstyles.medium, fontSize: 15, fontWeight: '500', color: Colors.TEXT_PRIMARY},
  metricValueGl: {...Textstyles.medium, fontSize: 13, fontWeight: '500', lineHeight: 18},
  cardDivider: {height: StyleSheet.hairlineWidth, backgroundColor: '#E5E7EB', marginHorizontal: 14},
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  currentBlock: {flex: 1},
  currentValue: {...Textstyles.medium, fontSize: 16, fontWeight: '500', marginTop: 2},
  investMoreBtn: {
    backgroundColor: GREEN_CTA,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  investMoreTxt: {...Textstyles.medium, color: Colors.white, fontSize: 14, fontWeight: '500'},
  errorBanner: {
    marginHorizontal: 16,
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
  retry: {...Textstyles.medium, color: Colors.themeBlue, fontWeight: '600'},
  emptyWrap: {paddingHorizontal: 0, paddingTop: 8},
  emptyCard: {
    backgroundColor: Colors.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: CARD_BORDER,
    padding: 20,
  },
  emptyTitle: {fontSize: 16, color: Colors.TEXT_PRIMARY, marginBottom: 8, textAlign: 'center'},
  emptySub: {fontSize: 14, color: Colors.GREY, textAlign: 'center', marginBottom: 16},
  cta: {
    backgroundColor: Colors.themeBlue,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 10,
    alignSelf: 'center',
  },
  ctaTxt: {color: Colors.white, fontSize: 15},
});
