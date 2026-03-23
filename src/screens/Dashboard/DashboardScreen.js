import React, {useCallback, useMemo, useState} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  RefreshControl,
  Pressable,
  Image,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useDispatch, useSelector} from 'react-redux';
import {CommonActions, useNavigation} from '@react-navigation/native';
import {navigationRef, navigateToAllFundsSIP, navigateToFundDetail} from '../../navigation/navigationRef';
import {pickSchemeCode} from '../../utils/schemeCode';
import {logout} from '../../store/slices/authSlice';
import {clearAuthStorage} from '../../services/authStorage';
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
  return `₹${n.toLocaleString('en-IN', {minimumFractionDigits: 2, maximumFractionDigits: 2})}`;
}

const SORT_MODES = [
  {key: 'Day', label: 'Day'},
  {key: 'Returns', label: 'Returns'},
  {key: 'Current', label: 'Current'},
];

function HoldingRow({fund, sortMode, onOpenFund}) {
  let value = '';
  let subValue = '';
  let valueStyle = styles.holdingValueNeutral;

  if (sortMode === 'Day') {
    value = formatInr(fund.one_day_return);
    subValue = `${fund.one_day_return_per ?? '—'}%`;
    valueStyle =
      Number(fund.one_day_return) < 0 ? styles.negativeText : styles.positiveText;
  } else if (sortMode === 'Returns') {
    value = formatInr(fund.total_return);
    subValue = `${fund.total_return_per ?? '—'}%`;
    valueStyle =
      Number(fund.total_return) < 0 ? styles.negativeText : styles.positiveText;
  } else {
    value = formatInr(fund.current_holding);
    subValue = `Invested ${formatInr(fund.amount)}`;
    valueStyle = styles.holdingValueNeutral;
  }

  return (
    <TouchableOpacity
      style={styles.holdingRow}
      onPress={() => onOpenFund(fund)}
      activeOpacity={0.7}>
      <View style={styles.holdingLeft}>
        <Text style={[Textstyles.medium, styles.schemeName]} numberOfLines={2}>
          {fund.scheme_name}
        </Text>
        <Text style={[Textstyles.normal, styles.subValue]}>{subValue}</Text>
      </View>
      <Text style={[Textstyles.medium, valueStyle]}>{value}</Text>
    </TouchableOpacity>
  );
}

export default function DashboardScreen() {
  const navigation = useNavigation();
  const dispatch = useDispatch();
  const user = useSelector(s => s.auth.user);
  const firstName = user?.first_name || user?.name || 'there';

  const [holdingVisible, setHoldingVisible] = useState(true);
  const [sortMode, setSortMode] = useState('Day');
  const [signingOut, setSigningOut] = useState(false);

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

  const onLogout = useCallback(async () => {
    setSigningOut(true);
    try {
      await clearAuthStorage();
      dispatch(logout());
      if (navigationRef.isReady()) {
        navigationRef.dispatch(
          CommonActions.reset({
            index: 0,
            routes: [{name: 'Login'}],
          }),
        );
      }
    } finally {
      setSigningOut(false);
    }
  }, [dispatch]);

  const listHeader = useMemo(
    () => (
      <View style={styles.headerBlock}>
        <View style={styles.topRow}>
          <View style={styles.greetingWrap}>
            <Text style={[Textstyles.bold, styles.welcome]}>Welcome {firstName},</Text>
            <Text style={[Textstyles.normal, styles.subGreeting]}>
              {"Here's what's happening with your investment today."}
            </Text>
          </View>
          <TouchableOpacity
            onPress={onLogout}
            disabled={signingOut}
            style={styles.logoutBtn}
            hitSlop={{top: 8, bottom: 8, left: 8, right: 8}}>
            {signingOut ? (
              <ActivityIndicator size="small" color={Colors.themeBlue} />
            ) : (
              <Text style={[Textstyles.medium, styles.logoutText]}>Log out</Text>
            )}
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={styles.searchBar}
          onPress={() => navigation.navigate('Explore')}
          activeOpacity={0.8}>
          <Text style={[Textstyles.normal, styles.searchPlaceholder]}>Search for Mutual Fund</Text>
        </TouchableOpacity>

        <View style={styles.investCard}>
          <View style={styles.investCardHeader}>
            <Text style={[Textstyles.bold, styles.investTitle]}>Investment</Text>
            <TouchableOpacity
              onPress={() => setHoldingVisible(v => !v)}
              style={styles.toggleBtn}
              hitSlop={{top: 6, bottom: 6}}>
              <Text style={[Textstyles.medium, styles.toggleText]}>
                {holdingVisible ? 'Hide' : 'View'}
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.holdingsTitleRow}>
            <View>
              <Text style={[Textstyles.normal, styles.holdingsLabel]}>
                Holdings ({holdings.length})
              </Text>
              <Text style={[Textstyles.bold, styles.holdingsBig]}>
                {holdingVisible ? formatInr(portfolio?.current_holdings) : '****'}
              </Text>
            </View>
            <TouchableOpacity
              onPress={() => setHoldingVisible(v => !v)}
              style={styles.eyeFab}
              hitSlop={{top: 8, bottom: 8, left: 8, right: 8}}>
              <Text style={styles.eyeFabText}>{holdingVisible ? '👁' : '•••'}</Text>
            </TouchableOpacity>
          </View>

          {holdingVisible && (
            <View style={styles.statsGrid}>
              <View style={styles.statCell}>
                <Text style={styles.statLabel}>Invested Value</Text>
                <Text style={[Textstyles.bold, styles.statValue]}>
                  {formatInr(portfolio?.total_amount)}
                </Text>
              </View>
              <View style={styles.statCell}>
                <Text style={[styles.statLabel, styles.statLabelRight]}>Total Returns</Text>
                <Text
                  style={[
                    Textstyles.bold,
                    styles.statValue,
                    styles.statValueRight,
                    Number(portfolio?.total_return) < 0 ? styles.negativeText : styles.positiveText,
                  ]}>
                  {Number(portfolio?.total_return) < 0 ? '-' : ''}
                  {formatInr(Math.abs(Number(portfolio?.total_return) || 0))} (
                  {portfolio?.total_return_per ?? '—'}%)
                </Text>
              </View>
              <View style={styles.statCell}>
                <Text style={styles.statLabel}>1D Returns</Text>
                <Text
                  style={[
                    Textstyles.bold,
                    styles.statValue,
                    Number(portfolio?.one_day_return) < 0 ? styles.negativeText : styles.positiveText,
                  ]}>
                  {Number(portfolio?.one_day_return) < 0 ? '-' : ''}
                  {formatInr(Math.abs(Number(portfolio?.one_day_return) || 0))} (
                  {portfolio?.one_day_return_per ?? '—'}%)
                </Text>
              </View>
              <View style={styles.statCell}>
                <Text style={[styles.statLabel, styles.statLabelRight]}>XIRR</Text>
                <Text style={[Textstyles.bold, styles.statValue, styles.statValueRight]}>
                  {portfolio?.xirr != null ? `${portfolio.xirr}%` : `${portfolio?.total_return_per ?? '—'}%`}
                </Text>
              </View>
            </View>
          )}
        </View>

        <View style={styles.holdingsSectionHeader}>
          <Text style={[Textstyles.medium, styles.sectionTitle]}>
            {holdings.length} Funds
          </Text>
          <View style={styles.sortRow}>
            {SORT_MODES.map(m => (
              <Pressable
                key={m.key}
                onPress={() => setSortMode(m.key)}
                style={[styles.sortChip, sortMode === m.key && styles.sortChipActive]}>
                <Text
                  style={[
                    Textstyles.medium,
                    styles.sortChipText,
                    sortMode === m.key && styles.sortChipTextActive,
                  ]}>
                  {m.label}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>
      </View>
    ),
    [
      firstName,
      holdings.length,
      holdingVisible,
      navigation,
      onLogout,
      portfolio,
      signingOut,
      sortMode,
    ],
  );

  const listFooter = useMemo(
    () => (
      <View style={styles.footer}>
        <View style={styles.importRow}>
          <Text style={[Textstyles.normal, styles.importText]}>Import External Funds</Text>
          <Text style={styles.chevron}>›</Text>
        </View>

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

  const renderItem = useCallback(
    ({item}) => (
      <HoldingRow fund={item} sortMode={sortMode} onOpenFund={onOpenFund} />
    ),
    [sortMode, onOpenFund],
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

      <FlatList
        data={holdings}
        keyExtractor={(item, index) => String(item.scheme_code ?? item.isin ?? index)}
        renderItem={renderItem}
        ListHeaderComponent={listHeader}
        ListFooterComponent={listFooter}
        ListEmptyComponent={
          <View style={styles.emptyBox}>
            <Text style={[Textstyles.normal, styles.emptyText]}>No holdings yet</Text>
          </View>
        }
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={refetch} tintColor={Colors.themeBlue} />
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
  headerBlock: {
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  greetingWrap: {flex: 1, paddingRight: 8},
  welcome: {
    fontSize: 22,
    color: Colors.TEXT_PRIMARY,
    marginBottom: 4,
  },
  subGreeting: {
    fontSize: 14,
    color: Colors.GREY,
    lineHeight: 20,
  },
  logoutBtn: {
    paddingVertical: 6,
    paddingHorizontal: 4,
    minWidth: 72,
    alignItems: 'flex-end',
  },
  logoutText: {
    color: Colors.LINK_BLUE,
    fontSize: 15,
  },
  searchBar: {
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.BORDER_GREY,
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 14,
    marginBottom: 16,
  },
  searchPlaceholder: {
    color: Colors.GREY,
    fontSize: 15,
  },
  investCard: {
    backgroundColor: Colors.white,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: Colors.BORDER_GREY,
  },
  investCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  investTitle: {fontSize: 18, color: Colors.TEXT_PRIMARY},
  toggleBtn: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    backgroundColor: Colors.offWhite,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.BORDER_GREY,
  },
  toggleText: {fontSize: 14, color: Colors.TEXT_PRIMARY},
  holdingsTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.BORDER_GREY,
  },
  holdingsLabel: {fontSize: 16, color: Colors.GREY},
  holdingsBig: {fontSize: 28, color: Colors.TEXT_PRIMARY, marginTop: 4},
  eyeFab: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: Colors.BORDER_GREY,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.white,
  },
  eyeFabText: {fontSize: 18},
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 12,
    marginHorizontal: -8,
  },
  statCell: {
    width: '50%',
    paddingHorizontal: 8,
    marginBottom: 12,
  },
  statLabel: {
    fontSize: 13,
    color: Colors.GREY,
    marginBottom: 4,
  },
  statLabelRight: {textAlign: 'right'},
  statValue: {fontSize: 16, color: Colors.TEXT_PRIMARY},
  statValueRight: {textAlign: 'right'},
  positiveText: {color: '#059669'},
  negativeText: {color: '#DC2626'},
  holdingsSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
    flexWrap: 'wrap',
    gap: 8,
  },
  sectionTitle: {fontSize: 15, color: Colors.TEXT_PRIMARY},
  sortRow: {flexDirection: 'row', gap: 6},
  sortChip: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
    backgroundColor: Colors.lightWhite,
  },
  sortChipActive: {
    backgroundColor: '#E0F2FE',
    borderWidth: 1,
    borderColor: Colors.themeBlue,
  },
  sortChipText: {fontSize: 12, color: Colors.GREY},
  sortChipTextActive: {color: Colors.themeBlue},
  holdingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    backgroundColor: Colors.white,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: Colors.BORDER_GREY,
  },
  holdingLeft: {flex: 1, paddingRight: 12},
  schemeName: {fontSize: 14, color: Colors.TEXT_PRIMARY},
  subValue: {fontSize: 12, color: Colors.GREY, marginTop: 4},
  holdingValueNeutral: {color: Colors.TEXT_PRIMARY},
  emptyBox: {
    padding: 32,
    alignItems: 'center',
  },
  emptyText: {color: Colors.GREY},
  footer: {paddingHorizontal: 16, marginTop: 8},
  importRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderRadius: 10,
    padding: 14,
    marginBottom: 16,
    opacity: 0.55,
    borderWidth: 1,
    borderColor: Colors.BORDER_GREY,
  },
  importText: {fontSize: 15, color: Colors.TEXT_PRIMARY},
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
