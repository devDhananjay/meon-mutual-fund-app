import React, {useCallback, useMemo, useState} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
  Image,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useSelector} from 'react-redux';
import {useNavigation} from '@react-navigation/native';
import {navigateToAllFundsSIP, navigateToFundDetail} from '../../navigation/navigationRef';
import {pickSchemeCode} from '../../utils/schemeCode';
import {usePortfolioData} from '../../hooks/usePortfolioData';
import {Colors} from '../../utils/AppConstant';
import Textstyles from '../../utils/text';

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
  return `₹${n.toLocaleString('en-IN', {minimumFractionDigits: digits, maximumFractionDigits: digits})}`;
}

function formatSignedInr(raw) {
  const n = Number(raw);
  if (!Number.isFinite(n)) {
    return '—';
  }
  const sign = n < 0 ? '-' : '+';
  return `${sign}${formatInr(Math.abs(n))}`;
}

function formatAbsPct(raw) {
  const n = Number(raw);
  if (!Number.isFinite(n)) {
    return '—';
  }
  return `${Math.abs(n).toFixed(2)}%`;
}

function splitGrowthType(raw) {
  const s = String(raw ?? '').trim();
  const lower = s.toLowerCase();
  const directGrowth = 'direct growth';
  const regularGrowth = 'regular growth';

  if (lower.endsWith(directGrowth)) {
    return {base: s.slice(0, Math.max(0, s.length - directGrowth.length)).trim(), suffix: 'Direct Growth'};
  }
  if (lower.endsWith(regularGrowth)) {
    return {
      base: s.slice(0, Math.max(0, s.length - regularGrowth.length)).trim(),
      suffix: 'Regular Growth',
    };
  }

  return {base: s, suffix: ''};
}

const SORT_ORDER = ['Day', 'Returns', 'Current'];
const SORT_MODE_LABEL = {
  Day: '1D Returns',
  Returns: 'Total Returns',
  Current: 'Current Invested',
};

function FundLogo({uri, name}) {
  if (uri) {
    return <Image source={{uri}} style={styles.fundLogo} resizeMode="contain" />;
  }
  const letter = (name || '?')[0]?.toUpperCase?.() ?? '?';
  return (
    <View style={[styles.fundLogo, styles.fundLogoPh]}>
      <Text style={styles.fundLogoLetter}>{letter}</Text>
    </View>
  );
}

function HoldingRow({fund, sortMode, onOpenFund}) {
  const fullName = fund?.scheme_name ?? fund?.base_scheme_name ?? '';
  const {base, suffix} = splitGrowthType(fullName);
  const logo = fund?.logo_url ?? fund?.logo ?? fund?.scheme_logo_url;

  let rightBig = '';
  let rightSmall = '';
  let rightBigColor = styles.statValueNeutral;

  if (sortMode === 'Day') {
    rightBig = formatSignedInr(fund?.one_day_return);
    rightSmall = formatAbsPct(fund?.one_day_return_per);
    rightBigColor = Number(fund?.one_day_return) < 0 ? styles.negativeText : styles.positiveText;
  } else if (sortMode === 'Returns') {
    rightBig = formatSignedInr(fund?.total_return);
    rightSmall = formatAbsPct(fund?.total_return_per);
    rightBigColor = Number(fund?.total_return) < 0 ? styles.negativeText : styles.positiveText;
  } else {
    rightBig = formatInr(fund?.current_holding);
    rightSmall = formatInr(fund?.amount);
    rightBigColor = styles.statValueNeutral;
  }

  return (
    <TouchableOpacity
      style={styles.holdingCard}
      onPress={() => onOpenFund(fund)}
      activeOpacity={0.7}>
      <View style={styles.holdingLeft}>
        <FundLogo uri={logo} name={base || fullName} />
        <View style={styles.fundTextCol}>
          <Text style={[Textstyles.bold, styles.fundName]} numberOfLines={2}>
            {base || fullName || 'Fund'}
          </Text>
          {suffix ? <Text style={[Textstyles.medium, styles.growthLabel]}>{suffix}</Text> : null}
        </View>
      </View>

      <View style={styles.holdingRight}>
        <Text style={[Textstyles.bold, styles.rightBig, rightBigColor]}>{rightBig}</Text>
        {rightSmall ? <Text style={[Textstyles.medium, styles.rightSmall]}>{rightSmall}</Text> : null}
      </View>
    </TouchableOpacity>
  );
}

export default function DashboardScreen() {
  const navigation = useNavigation();
  const user = useSelector(s => s.auth.user);
  const firstName = user?.full_name || user?.name || 'there';

  const [holdingVisible, setHoldingVisible] = useState(true);
  const [sortMode, setSortMode] = useState('Current');

  const {data, isPending, error, refreshing, refetch} = usePortfolioData();
  const portfolio = data?.portfolio;
  const holdings = data?.holdings ?? [];

  const onOpenFund = useCallback(
    fund => {
      const code = pickSchemeCode(fund);
      if (__DEV__) {
        console.log('[Dashboard] onOpenFund', {fund, code});
      }
      if (!code) {
        return;
      }
      navigateToFundDetail(navigation, {
        schemeCode: code,
        schemeName: fund?.scheme_name,
      });
    },
    [navigation],
  );

  const cycleSortMode = useCallback(() => {
    setSortMode(prev => {
      const idx = SORT_ORDER.indexOf(prev);
      return SORT_ORDER[(idx + 1) % SORT_ORDER.length];
    });
  }, []);

  const sortHeaderLabel = SORT_MODE_LABEL[sortMode] ?? 'Current Invested';

  const listHeader = useMemo(
    () => (
      <View style={styles.headerBlock}>
        <View style={styles.topRow}>
          <Text style={[Textstyles.bold, styles.welcome]}>Welcome {firstName},</Text>
        </View>

        <TouchableOpacity
          style={styles.searchBar}
          onPress={() => navigation.navigate('Explore')}
          activeOpacity={0.8}>
          <Text style={styles.searchIcon}>⌕</Text>
          <Text style={[Textstyles.normal, styles.searchPlaceholder]}>Search mutual funds...</Text>
        </TouchableOpacity>

        <View style={styles.holdingsCard}>
          <View style={styles.holdingsHeaderRow}>
            <View>
              <Text style={[Textstyles.normal, styles.holdingsLabel]}>Holdings ({holdings.length})</Text>
              <Text style={[Textstyles.bold, styles.holdingsBig]}>
                {holdingVisible ? formatInr(portfolio?.current_holdings) : '****'}
              </Text>
            </View>

            <View style={styles.holdingsIcons}>
              <TouchableOpacity
                onPress={refetch}
                style={styles.iconCircle}
                hitSlop={{top: 10, bottom: 10, left: 10, right: 10}}
                activeOpacity={0.75}>
                {refreshing ? (
                  <ActivityIndicator size="small" color={Colors.themeBlue} />
                ) : (
                  <Text style={styles.iconCircleTxt}>↻</Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => setHoldingVisible(v => !v)}
                style={styles.iconCircle}
                hitSlop={{top: 10, bottom: 10, left: 10, right: 10}}
                activeOpacity={0.75}>
                <Text style={styles.iconCircleTxt}>{holdingVisible ? '👁' : '•••'}</Text>
              </TouchableOpacity>
            </View>
          </View>

          {holdingVisible && (
            <View style={styles.statsCol}>
              <View style={styles.statRow}>
                <Text style={styles.statLabel}>1D Returns</Text>
                <Text
                  style={[
                    Textstyles.bold,
                    styles.statValue,
                    Number(portfolio?.one_day_return) < 0 ? styles.negativeText : styles.positiveText,
                  ]}>
                  {formatSignedInr(portfolio?.one_day_return)} ({formatAbsPct(portfolio?.one_day_return_per)})
                </Text>
              </View>

              <View style={styles.statRow}>
                <Text style={styles.statLabel}>Total Returns</Text>
                <Text
                  style={[
                    Textstyles.bold,
                    styles.statValue,
                    Number(portfolio?.total_return) < 0 ? styles.negativeText : styles.positiveText,
                  ]}>
                  {formatSignedInr(portfolio?.total_return)} ({formatAbsPct(portfolio?.total_return_per)})
                </Text>
              </View>

              <View style={styles.statRow}>
                <Text style={styles.statLabel}>Invested</Text>
                <Text style={[Textstyles.bold, styles.statValue]}>{formatInr(portfolio?.total_amount)}</Text>
              </View>

              <View style={styles.statRow}>
                <View style={styles.xirrLabelRow}>
                  <Text style={styles.statLabel}>XIRR</Text>
                  <Text style={styles.caretDown}>⌄</Text>
                </View>
                <Text style={[Textstyles.bold, styles.statValue]}>
                  {portfolio?.xirr != null ? `${Number(portfolio.xirr).toFixed(2)}%` : '—'}
                </Text>
              </View>
            </View>
          )}
        </View>
      </View>
    ),
    [
      firstName,
      holdings.length,
      holdingVisible,
      navigation,
      portfolio,
      refreshing,
      refetch,
    ],
  );

  const listFooter = useMemo(
    () => (
      <View style={styles.footer}>
        <TouchableOpacity
          style={styles.importBtn}
          onPress={() => navigation.navigate('Explore')}
          activeOpacity={0.85}>
          <View style={styles.importLeft}>
            <View style={styles.importIconCircle}>
              <Text style={styles.importIconTxt}>⤴</Text>
            </View>
            <Text style={[Textstyles.medium, styles.importText]}>Import External Funds</Text>
          </View>
          <Text style={styles.chevron}>›</Text>
        </TouchableOpacity>

        <View style={styles.sipCard}>
          <Image
            source={require('../../assets/Icons/calendarSip.png')}
            style={styles.sipEmoji}
            resizeMode="contain"
          />
          <View style={styles.sipTextCol}>
            <Text style={[Textstyles.medium, styles.sipTitle]}>
              Invest every month and grow your wealth with SIP
            </Text>
            <TouchableOpacity
              style={styles.sipButton}
              onPress={() => navigateToAllFundsSIP(navigation)}
              activeOpacity={0.85}>
              <Text style={[Textstyles.medium, styles.sipButtonText]}>Start a SIP</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    ),
    [navigation],
  );

  if (isPending && !refreshing) {
    return (
      <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
        <View style={styles.loadingBox}>
          <ActivityIndicator size="large" color={Colors.themeBlue} />
          <Text style={[Textstyles.normal, styles.loadingText]}>Loading portfolio…</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      {error ? (
        <View style={styles.errorBanner}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity onPress={() => refetch()} style={styles.retryBtn}>
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : null}

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refetch} tintColor={Colors.themeBlue} />}
        showsVerticalScrollIndicator={false}>
        {listHeader}

        <View style={styles.stocksCard}>
          <TouchableOpacity style={styles.listHeaderRow} activeOpacity={0.85} onPress={cycleSortMode}>
            <View style={styles.sortLeft}>
              <Text style={styles.sortIcon}>⇅</Text>
              <Text style={styles.sortLabel}>Sort</Text>
            </View>

            <View style={styles.sortRight}>
              <Text style={styles.sortValueText}>{sortHeaderLabel}</Text>
              {sortMode === 'Current' ? <Text style={styles.sortAngle}> &lt;&gt;</Text> : null}
              <Text style={styles.sortCaret}>⌄</Text>
            </View>
          </TouchableOpacity>

          {holdings.length === 0 ? (
            <View style={styles.emptyBox}>
              <Text style={[Textstyles.normal, styles.emptyText]}>No holdings yet</Text>
            </View>
          ) : null}

          {holdings.map((item, index) => (
            <HoldingRow
              key={String(item.scheme_code ?? item.isin ?? index)}
              fund={item}
              sortMode={sortMode}
              onOpenFund={onOpenFund}
            />
          ))}
        </View>

        {listFooter}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {flex: 1, backgroundColor: '#F0F2F5'},
  loadingBox: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  loadingText: {
    marginTop: 12,
    color: Colors.GREY,
    fontSize: 15,
  },
  errorBanner: {
    marginHorizontal: 16,
    marginTop: 8,
    padding: 12,
    backgroundColor: '#FEF2F2',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FECACA',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  errorText: {flex: 1, color: '#B91C1C', fontSize: 14},
  retryBtn: {paddingVertical: 6, paddingHorizontal: 12},
  retryText: {color: Colors.themeBlue, fontWeight: '600'},
  listContent: {
    paddingBottom: 32,
  },
  scrollContent: {
    paddingBottom: 32,
  },
  headerBlock: {
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  topRow: {
    marginBottom: 10,
  },
  welcome: {
    fontSize: 24,
    color: Colors.TEXT_PRIMARY,
    fontWeight: '800',
  },
  searchBar: {
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.BORDER_GREY,
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 14,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  searchIcon: {fontSize: 16, color: Colors.GREY, opacity: 0.9},
  searchPlaceholder: {
    color: Colors.GREY,
    fontSize: 15,
  },
  holdingsCard: {
    backgroundColor: Colors.white,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.BORDER_GREY,
  },
  holdingsHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  holdingsIcons: {flexDirection: 'row', gap: 10, paddingLeft: 12},
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: Colors.BORDER_GREY,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.white,
  },
  iconCircleTxt: {fontSize: 18},
  holdingsLabel: {fontSize: 14, color: Colors.GREY},
  holdingsBig: {fontSize: 28, color: Colors.TEXT_PRIMARY, marginTop: 4},
  statsCol: {marginTop: 12},
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
  },
  statLabel: {fontSize: 14, color: Colors.GREY},
  statValue: {fontSize: 16, color: Colors.TEXT_PRIMARY},
  statValueNeutral: {color: Colors.TEXT_PRIMARY},
  positiveText: {color: '#059669'},
  negativeText: {color: '#DC2626'},
  sortDivider: {
    height: 1,
    backgroundColor: Colors.BORDER_GREY,
    marginTop: 12,
    marginHorizontal: -16,
  },
  listHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderBottomWidth: 1,
    borderBottomColor: Colors.BORDER_GREY,
  },
  sortLeft: {flexDirection: 'row', alignItems: 'center', gap: 8},
  sortIcon: {fontSize: 18, color: Colors.GREY},
  sortLabel: {fontSize: 15, color: Colors.TEXT_PRIMARY, fontWeight: '700'},
  sortRight: {flexDirection: 'row', alignItems: 'center'},
  sortValueText: {fontSize: 15, color: Colors.TEXT_PRIMARY, fontWeight: '700', marginRight: 6},
  sortCaret: {fontSize: 14, color: Colors.GREY, marginLeft: 6},
  sortAngle: {fontSize: 14, color: Colors.GREY},
  xirrLabelRow: {flexDirection: 'row', alignItems: 'center'},
  caretDown: {fontSize: 14, color: Colors.GREY, marginLeft: 6},
  holdingCard: {
    marginHorizontal: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    backgroundColor: 'transparent',
    paddingHorizontal: 14,
    paddingVertical: 14,
    borderRadius: 0,
    borderWidth: 0,
    borderBottomWidth: 1,
    borderBottomColor: Colors.BORDER_GREY,
    marginBottom: 0,
  },
  stocksCard: {
    marginHorizontal: 16,
    backgroundColor: Colors.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.BORDER_GREY,
    overflow: 'hidden',
  },
  holdingLeft: {flexDirection: 'row', alignItems: 'center', flex: 1, minWidth: 0},
  holdingRight: {alignItems: 'flex-end', minWidth: 90, marginLeft: 12},
  fundLogo: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  fundLogoPh: {borderWidth: 1, borderColor: Colors.BORDER_GREY},
  fundLogoLetter: {fontSize: 14, fontWeight: '800', color: Colors.themeBlue},
  fundTextCol: {flex: 1, minWidth: 0, marginLeft: 12},
  fundName: {fontSize: 14, color: Colors.TEXT_PRIMARY, lineHeight: 18},
  growthLabel: {fontSize: 12, color: Colors.GREY, marginTop: 3},
  rightBig: {fontSize: 16, color: Colors.TEXT_PRIMARY},
  rightSmall: {fontSize: 14, color: Colors.GREY, marginTop: 4},
  emptyBox: {
    padding: 32,
    alignItems: 'center',
  },
  emptyText: {color: Colors.GREY},
  footer: {paddingHorizontal: 16, marginTop: 8},
  importBtn: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: Colors.BORDER_GREY,
  },
  importLeft: {flexDirection: 'row', alignItems: 'center', flex: 1, minWidth: 0},
  importIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#E8F4FC',
    borderWidth: 1,
    borderColor: '#D6F0FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  importIconTxt: {fontSize: 16},
  importText: {fontSize: 15, color: Colors.TEXT_PRIMARY, marginRight: 12},
  chevron: {fontSize: 22, color: Colors.GREY},
  sipCard: {
    flexDirection: 'row',
    backgroundColor: Colors.white,
    borderRadius: 12,
    padding: 16,
    gap: 12,
    borderWidth: 1,
    borderColor: Colors.BORDER_GREY,
    marginBottom: 24,
  },
  sipEmoji: {width: 40, height: 40},
  sipTextCol: {flex: 1},
  sipTitle: {fontSize: 16, color: Colors.TEXT_PRIMARY, lineHeight: 22, marginBottom: 12},
  sipButton: {
    alignSelf: 'flex-start',
    backgroundColor: '#22C55E',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  sipButtonText: {color: Colors.white, fontSize: 15},
});
