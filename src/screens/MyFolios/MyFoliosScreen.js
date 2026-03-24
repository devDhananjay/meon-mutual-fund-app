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
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useNavigation} from '@react-navigation/native';
import {navigateToFundDetail} from '../../navigation/navigationRef';
import {pickSchemeCode} from '../../utils/schemeCode';
import {groupHoldingsByFolio} from '../../utils/groupHoldingsByFolio';
import {usePortfolioData} from '../../hooks/usePortfolioData';
import {Colors} from '../../utils/AppConstant';
import Textstyles from '../../utils/text';

const PAGE_BG = '#F0F2F5';
const CARD_BORDER = '#E8E8E8';
const HEADER_ROW_BG = '#F5F6F8';
const GREEN_BTN = '#22C55E';
const LOSS_RED = '#DC2626';
const GAIN_GREEN = '#059669';
const LOSS_PILL_BG = '#FEE2E2';
const GAIN_PILL_BG = '#DCFCE7';

function formatInr(value) {
  if (value === null || value === undefined || value === '') {
    return '—';
  }
  const n = Number(value);
  if (Number.isNaN(n)) {
    return String(value);
  }
  return `₹${n.toLocaleString('en-IN', {minimumFractionDigits: 2, maximumFractionDigits: 2})}`;
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

function FundLogo({name, uri}) {
  if (uri) {
    return <Image source={{uri}} style={styles.fundLogo} resizeMode="contain" />;
  }
  const letter = (name || '?')[0]?.toUpperCase() ?? '?';
  return (
    <View style={[styles.fundLogo, styles.fundLogoPh]}>
      <Text style={styles.fundLogoLetter}>{letter}</Text>
    </View>
  );
}

function GainLossBlock({item}) {
  const {abs, pct, isGain} = gainLossFromHolding(item);
  const absStr = `${abs >= 0 ? '+' : '-'}${formatInr(Math.abs(abs))}`;
  const pctStr =
    pct != null && !Number.isNaN(pct)
      ? `${pct >= 0 ? '+' : ''}${Number(pct).toFixed(2)}%`
      : '—';
  const color = isGain ? GAIN_GREEN : LOSS_RED;
  const pillBg = isGain ? GAIN_PILL_BG : LOSS_PILL_BG;

  return (
    <View style={styles.glBlock}>
      <Text style={[styles.glAbs, {color}]}>{absStr}</Text>
      <View style={[styles.pill, {backgroundColor: pillBg}]}>
        <Text style={[styles.pillTxt, {color}]}>{pctStr}</Text>
      </View>
    </View>
  );
}

function FolioHoldingRow({item, index, onOpenFund, onInvestMore}) {
  const name = (item.scheme_name ?? item.base_scheme_name ?? 'Fund').toUpperCase();
  const logo = item.logo_url ?? item.logo;

  return (
    <View style={styles.tableRow}>
      <View style={styles.rowTop}>
        <Text style={styles.serial}>{String(index + 1).padStart(2, '0')}</Text>
        <FundLogo name={name} uri={logo} />
        <View style={styles.nameCol}>
          <Text style={styles.fundNameCaps} numberOfLines={3}>
            {name}
          </Text>
        </View>
      </View>

      <View style={styles.metricsRow}>
        <View style={styles.metricCell}>
          <Text style={styles.metricLabel}>Invested</Text>
          <Text style={styles.metricVal}>{formatInr(item.amount)}</Text>
        </View>
        <View style={styles.metricCell}>
          <Text style={styles.metricLabel}>Current</Text>
          <Text style={styles.metricVal}>{formatInr(item.current_holding)}</Text>
        </View>
        <View style={styles.metricCell}>
          <Text style={styles.metricLabel}>Gain / Loss</Text>
          <GainLossBlock item={item} />
        </View>
      </View>

      <View style={styles.actionsRow}>
        <TouchableOpacity
          style={styles.investMoreBtn}
          onPress={() => onInvestMore(item)}
          activeOpacity={0.88}>
          <Text style={styles.investMoreTxt}>Invest More</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => onOpenFund(item)} hitSlop={12} activeOpacity={0.7}>
          <Text style={styles.viewDetail}>Details ›</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

export default function MyFoliosScreen() {
  const navigation = useNavigation();
  const {data, isPending, error, refreshing, refetch} = usePortfolioData();
  const holdings = data?.holdings ?? [];
  const [search, setSearch] = useState('');

  const filteredHoldings = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) {
      return holdings;
    }
    return holdings.filter(h => {
      const n = (h.scheme_name ?? h.base_scheme_name ?? '').toLowerCase();
      return n.includes(q);
    });
  }, [holdings, search]);

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
    ({section: {title, data: secData = []}}) => (
      <View style={styles.sectionHead}>
        <Text style={[Textstyles.bold, styles.sectionTitle]}>{title}</Text>
        <Text style={styles.sectionMeta}>
          {secData.length} fund{secData.length !== 1 ? 's' : ''} · {formatInr(sumHoldings(secData, 'current_holding'))}{' '}
          current
        </Text>
      </View>
    ),
    [],
  );

  const renderItem = useCallback(
    ({item, index}) => (
      <FolioHoldingRow
        item={item}
        index={index}
        onOpenFund={onOpenFund}
        onInvestMore={onInvestMore}
      />
    ),
    [onOpenFund, onInvestMore],
  );

  const listHeader = useMemo(
    () => (
      <View style={styles.pageHead}>
        <Text style={[styles.pageTitle, Textstyles.bold]}>My Folios</Text>
        <View style={styles.card}>
          <View style={styles.searchWrap}>
            <Text style={styles.searchIcon}>⌕</Text>
            <TextInput
              style={styles.searchInput}
              placeholder="Search folios..."
              placeholderTextColor={Colors.GREY}
              value={search}
              onChangeText={setSearch}
              returnKeyType="search"
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>
         
        </View>
      </View>
    ),
    [search],
  );

  if (isPending && !refreshing) {
    return (
      <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
        <View style={styles.loadingBox}>
          <ActivityIndicator size="large" color={Colors.themeBlue} />
          <Text style={[Textstyles.normal, styles.loadingTxt]}>Loading folios…</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      {error ? (
        <View style={styles.errorBanner}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity onPress={() => refetch()} hitSlop={8}>
            <Text style={styles.retry}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : null}

      <SectionList
        sections={sections}
        keyExtractor={(item, index) => String(item.scheme_code ?? item.isin ?? index)}
        renderItem={renderItem}
        renderSectionHeader={renderSectionHeader}
        stickySectionHeadersEnabled={false}
        ListHeaderComponent={listHeader}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={refetch} tintColor={Colors.themeBlue} />
        }
        ListEmptyComponent={
          <View style={styles.emptyWrap}>
            <View style={styles.card}>
              <Text style={[Textstyles.medium, styles.emptyTitle]}>No folios match</Text>
              <Text style={[Textstyles.normal, styles.emptySub]}>
                {search ? 'Try another search or clear the filter.' : 'Invest from Explore to see holdings here.'}
              </Text>
              <TouchableOpacity style={styles.cta} onPress={() => navigation.navigate('Explore')} activeOpacity={0.85}>
                <Text style={[Textstyles.medium, styles.ctaTxt]}>Explore funds</Text>
              </TouchableOpacity>
            </View>
          </View>
        }
        showsVerticalScrollIndicator={false}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {flex: 1, backgroundColor: PAGE_BG},
  loadingBox: {flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24},
  loadingTxt: {marginTop: 12, color: Colors.GREY},
  pageHead: {paddingHorizontal: 16, paddingTop: 8},
  pageTitle: {fontSize: 24, fontWeight: '700', color: Colors.TEXT_PRIMARY, marginBottom: 12},
  card: {
    backgroundColor: Colors.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: CARD_BORDER,
    paddingBottom: 8,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 1},
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: CARD_BORDER,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  searchIcon: {fontSize: 16, color: Colors.GREY, marginRight: 8, opacity: 0.85},
  searchInput: {flex: 1, fontSize: 15, color: Colors.TEXT_PRIMARY, paddingVertical: 4},
  tableHeadRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: HEADER_ROW_BG,
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderBottomWidth: 1,
    borderBottomColor: CARD_BORDER,
  },
  th: {fontSize: 11, fontWeight: '700', color: '#374151', textTransform: 'uppercase'},
  thSerial: {width: 36},
  thFund: {flex: 1, paddingRight: 6},
  thNum: {width: 72, textAlign: 'right'},
  thGl: {width: 88, textAlign: 'right'},
  listContent: {paddingBottom: 32, paddingHorizontal: 16},
  sectionHead: {
    paddingTop: 16,
    paddingBottom: 8,
    paddingHorizontal: 4,
  },
  sectionTitle: {fontSize: 15, color: Colors.TEXT_PRIMARY},
  sectionMeta: {fontSize: 13, color: '#6B7280', marginTop: 4},
  tableRow: {
    backgroundColor: Colors.white,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: CARD_BORDER,
    padding: 12,
    marginBottom: 10,
    marginHorizontal: 0,
  },
  rowTop: {flexDirection: 'row', alignItems: 'flex-start', marginBottom: 10},
  serial: {fontSize: 13, color: '#9CA3AF', width: 28, fontWeight: '600', marginTop: 4},
  fundLogo: {width: 36, height: 36, borderRadius: 6, marginRight: 10},
  fundLogoPh: {
    backgroundColor: '#FEE2E2',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  fundLogoLetter: {fontSize: 14, fontWeight: '800', color: '#B91C1C'},
  nameCol: {flex: 1},
  fundNameCaps: {fontSize: 13, fontWeight: '700', color: '#111827', lineHeight: 18},
  metricsRow: {flexDirection: 'row', flexWrap: 'wrap', marginBottom: 10, marginTop: 4},
  metricCell: {minWidth: '30%', flexGrow: 1, marginBottom: 8},
  metricLabel: {fontSize: 11, color: '#6B7280', marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.3},
  metricVal: {fontSize: 14, fontWeight: '600', color: '#111827'},
  glBlock: {alignItems: 'flex-start'},
  glAbs: {fontSize: 14, fontWeight: '700', marginBottom: 4},
  pill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  pillTxt: {fontSize: 12, fontWeight: '700'},
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    paddingTop: 10,
  },
  investMoreBtn: {
    backgroundColor: GREEN_BTN,
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 6,
  },
  investMoreTxt: {color: Colors.white, fontSize: 14, fontWeight: '600'},
  viewDetail: {fontSize: 14, color: Colors.themeBlue, fontWeight: '600'},
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
  retry: {color: Colors.themeBlue, fontWeight: '600'},
  emptyWrap: {paddingHorizontal: 0, paddingTop: 8},
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
