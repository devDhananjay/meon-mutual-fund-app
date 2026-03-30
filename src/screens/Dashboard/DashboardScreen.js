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
  Platform,
  StatusBar,
} from 'react-native';
import {SafeAreaView, useSafeAreaInsets} from 'react-native-safe-area-context';
import {useSelector} from 'react-redux';
import {useNavigation} from '@react-navigation/native';
import {
  navigateToAllFundsSIP,
  navigateToFundDetail,
  navigateToRedeem,
} from '../../navigation/navigationRef';
import {HeaderActionCluster} from '../../components/AppTabHeader';
import {pickSchemeCode} from '../../utils/schemeCode';
import {pickHoldingCurrentValue, pickHoldingFolio, pickHoldingUnits} from '../../utils/holdingRedeem';
import {usePortfolioData} from '../../hooks/usePortfolioData';
import {Colors} from '../../utils/AppConstant';
import Textstyles from '../../utils/text';
import AppModal from '../../components/AppModal';
import Icons from '../../utils/icons';

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

function HoldingRow({fund, sortMode, onHoldingPress}) {
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
      onPress={() => onHoldingPress(fund)}
      activeOpacity={0.7}>
      <View style={styles.holdingLeft}>
        <FundLogo uri={logo} name={base || fullName} />
        <View style={styles.fundTextCol}>
          <Text style={[Textstyles.medium, styles.fundName]} numberOfLines={2}>
            {base || fullName || 'Fund'}
          </Text>
          {suffix ? <Text style={[Textstyles.medium, styles.growthLabel]}>{suffix}</Text> : null}
        </View>
      </View>

      <View style={styles.holdingRight}>
        <Text style={[Textstyles.medium, styles.rightBig, rightBigColor]}>{rightBig}</Text>
        {rightSmall ? <Text style={[Textstyles.medium, styles.rightSmall]}>{rightSmall}</Text> : null}
      </View>
    </TouchableOpacity>
  );
}

export default function DashboardScreen() {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const user = useSelector(s => s.auth.user);
  const firstName = user?.full_name || user?.name || 'there';

  const [holdingVisible, setHoldingVisible] = useState(true);
  const [sortMode, setSortMode] = useState('Current');
  const [holdingActionFund, setHoldingActionFund] = useState(null);

  const {data, isPending, error, refreshing, refetch} = usePortfolioData();
  const portfolio = data?.portfolio;
  const holdings = data?.holdings ?? [];

  const onHoldingPress = useCallback(fund => {
    setHoldingActionFund(fund);
  }, []);

  const closeHoldingModal = useCallback(() => setHoldingActionFund(null), []);

  const onModalInvestmentDetails = useCallback(() => {
    const fund = holdingActionFund;
    setHoldingActionFund(null);
    if (!fund) {
      return;
    }
    const code = pickSchemeCode(fund);
    if (!code) {
      return;
    }
    navigateToFundDetail(navigation, {
      schemeCode: code,
      schemeName: fund?.scheme_name,
    });
  }, [holdingActionFund, navigation]);

  const onModalRedeem = useCallback(() => {
    const fund = holdingActionFund;
    setHoldingActionFund(null);
    if (!fund) {
      return;
    }
    const code = pickSchemeCode(fund);
    if (!code) {
      return;
    }
    navigateToRedeem(navigation, {
      schemeCode: code,
      schemeName: fund?.scheme_name ?? fund?.base_scheme_name,
      folioNumber: pickHoldingFolio(fund),
      availableUnits: pickHoldingUnits(fund),
      maxAmount: pickHoldingCurrentValue(fund),
    });
  }, [holdingActionFund, navigation]);

  const cycleSortMode = useCallback(() => {
    setSortMode(prev => {
      const idx = SORT_ORDER.indexOf(prev);
      return SORT_ORDER[(idx + 1) % SORT_ORDER.length];
    });
  }, []);

  const sortHeaderLabel = SORT_MODE_LABEL[sortMode] ?? 'Current Invested';

  const headerPadTop = insets.top + 16;

  const listHeader = useMemo(
    () => (
      <View style={[styles.headerBlock, {paddingTop: headerPadTop}]}>
        <View style={styles.topRow}>
          <Text style={[Textstyles.heading, styles.welcome]} numberOfLines={2}>
            Welcome {firstName},
          </Text>
          <HeaderActionCluster />
        </View>

        <TouchableOpacity
          style={styles.searchBar}
          onPress={() => navigation.navigate('Explore')}
          activeOpacity={0.8}>
          <Text style={styles.searchIcon}>⌕</Text>
          <Text style={[Textstyles.normal, styles.searchPlaceholder]}>Search mutual funds...</Text>
        </TouchableOpacity>
      </View>
    ),
    [firstName, headerPadTop, navigation],
  );

  const holdingsCard = useMemo(
    () => (
      <View style={styles.holdingsCard}>
        <View style={styles.holdingsHeaderRow}>
          <View>
            <Text style={[Textstyles.normal, styles.holdingsLabel]}>Holdings ({holdings.length})</Text>
            <Text style={[Textstyles.medium, styles.holdingsBig]}>
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
                <Image
                  source={Icons.RefreshIcon}
                  style={styles.refreshIconImg}
                  resizeMode="contain"
                />
              )}
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setHoldingVisible(v => !v)}
              style={styles.iconCircle}
              hitSlop={{top: 10, bottom: 10, left: 10, right: 10}}
              activeOpacity={0.75}>
              {holdingVisible ? (
                <Image source={Icons.EyeIcon} style={styles.eyeIconImg} resizeMode="contain" />
              ) : (
                <Image source={Icons.threeDots} style={styles.eyeIconImg} resizeMode="contain" />
              )}
            </TouchableOpacity>
          </View>
        </View>

        {holdingVisible && (
          <View style={styles.statsCol}>
            <View style={styles.statRow}>
              <Text style={styles.statLabel}>1D Returns</Text>
              <Text
                style={[
                  Textstyles.medium,
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
                  Textstyles.medium,
                  styles.statValue,
                  Number(portfolio?.total_return) < 0 ? styles.negativeText : styles.positiveText,
                ]}>
                {formatSignedInr(portfolio?.total_return)} ({formatAbsPct(portfolio?.total_return_per)})
              </Text>
            </View>

            <View style={styles.statRow}>
              <Text style={styles.statLabel}>Invested</Text>
              <Text style={[Textstyles.medium, styles.statValue]}>{formatInr(portfolio?.total_amount)}</Text>
            </View>

            <View style={styles.statRow}>
              <View style={styles.xirrLabelRow}>
                <Text style={styles.statLabel}>XIRR</Text>
                <Text style={styles.caretDown}>⌄</Text>
              </View>
              <Text style={[Textstyles.medium, styles.statValue]}>
                {portfolio?.XIRR != null ? `${Number(portfolio.XIRR).toFixed(2)}%` : '—'}
              </Text>
            </View>
          </View>
        )}
      </View>
    ),
    [
      holdings.length,
      holdingVisible,
      portfolio,
      refreshing,
      refetch,
      setHoldingVisible,
    ],
  );

  const listFooter = useMemo(
    () => (
      <View style={styles.footer}>
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
      <SafeAreaView style={styles.safe} edges={['left', 'right']}>
        <StatusBar barStyle="dark-content" backgroundColor={Colors.offWhite} />
        <View style={styles.loadingBox}>
          <ActivityIndicator size="large" color={Colors.themeBlue} />
          <Text style={[Textstyles.normal, styles.loadingText]}>Loading portfolio…</Text>
        </View>
      </SafeAreaView>
    );
  }

  const modalFund = holdingActionFund;
  const modalName = modalFund?.scheme_name ?? modalFund?.base_scheme_name ?? 'Fund';
  const modalLogo = modalFund?.logo_url ?? modalFund?.logo ?? modalFund?.scheme_logo_url;
  const modalInvested = modalFund?.amount;

  return (
    <SafeAreaView style={styles.safe} edges={['left', 'right']}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.offWhite} />
      {error ? (
        <View style={styles.errorBanner}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity onPress={() => refetch()} style={styles.retryBtn}>
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : null}

      {listHeader}

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refetch} tintColor={Colors.themeBlue} />}
        showsVerticalScrollIndicator={false}>
        {holdingsCard}

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
              onHoldingPress={onHoldingPress}
            />
          ))}

          <View style={styles.importWrap}>
            <TouchableOpacity
              style={styles.importBtn}
              disabled={true}
              onPress={() => navigation.navigate('Explore')}
              activeOpacity={0.85}>
              <View style={styles.importLeft}>
                <View style={styles.importIconCircle}>
                  <Text style={styles.importIconTxt}>⤴</Text>
                </View>
                <Text style={[Textstyles.medium, styles.importText]}>Import External Funds</Text>
              </View>
            </TouchableOpacity>
          </View>
        </View>

        {listFooter}
      </ScrollView>

      <AppModal
        visible={!!holdingActionFund}
        onClose={closeHoldingModal}
        title="Holding actions"
        isBottomSheet
        maxHeight={'66%'}>
        <TouchableOpacity
          style={styles.holdingModalHeader}
          onPress={onModalInvestmentDetails}
          activeOpacity={0.85}>
          <FundLogo uri={modalLogo} name={modalName} />
          <Text style={[Textstyles.medium, styles.holdingModalTitle]} numberOfLines={2}>
            {modalName}
          </Text>
          <Text style={styles.holdingModalChevron}>›</Text>
        </TouchableOpacity>

        <View style={styles.holdingModalDivider} />

        <View style={styles.holdingModalRow}>
          <Text style={styles.holdingModalLabel}>Invested Value</Text>
          <Text style={[Textstyles.medium, styles.holdingModalValue]}>{formatInr(modalInvested)}</Text>
        </View>

        <View style={styles.holdingModalDivider} />

        <TouchableOpacity style={styles.holdingModalAction} onPress={onModalRedeem} activeOpacity={0.8}>
          <View style={styles.holdingModalActionIconWrap}>
            <Text style={styles.holdingModalActionIconTxt}>₹</Text>
          </View>
          <Text style={[Textstyles.medium, styles.holdingModalActionTxt]}>Redeem</Text>
          <Text style={styles.holdingModalChevron}>›</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.holdingModalAction}
          onPress={onModalInvestmentDetails}
          activeOpacity={0.8}>
          <View style={styles.holdingModalActionIconWrap}>
            <Text style={styles.holdingModalActionIconTxt}>☰</Text>
          </View>
          <Text style={[Textstyles.medium, styles.holdingModalActionTxt]}>Investment Details</Text>
          <Text style={styles.holdingModalChevron}>›</Text>
        </TouchableOpacity>
      </AppModal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {flex: 1, backgroundColor: Colors.offWhite},
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
  scrollView: {flex: 1},
  scrollContent: {
    paddingBottom: 16,
  },
  headerBlock: {
    paddingHorizontal: 16,
    backgroundColor: Colors.offWhite,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
    gap: 12,
  },
  welcome: {
    flex: 1,
    fontSize: 22,
    color: Colors.TEXT_PRIMARY,
    fontWeight: '600',
    lineHeight: 28,
    paddingRight: 4,
  },
  searchBar: {
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.BORDER_GREY,
    borderRadius: 12,
    paddingVertical: 12,
    minHeight: 50,
    paddingHorizontal: 14,
    marginBottom: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.06,
    shadowRadius: 8,
    // elevation: 2,
  },
  searchIcon: {fontSize: 16, color: Colors.GREY, opacity: 0.9},
  searchPlaceholder: {
    color: Colors.GREY,
    fontSize: 15,
  },
  holdingsCard: {
    backgroundColor: Colors.white,
    borderRadius: 14,
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.BORDER_GREY,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.05,
    shadowRadius: 10,
    // elevation: 2,
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
  iconCircleTxt: {fontSize: 30, color: Colors.TEXT_PRIMARY, lineHeight: 22},
  refreshIconImg: {width: 20, height: 20},
  eyeIconImg: {width: 22, height: 22},
  holdingsLabel: {fontSize: 14, color: Colors.GREY},
  holdingsBig: {fontSize: 28, color: Colors.TEXT_PRIMARY, marginTop: 2},
  statsCol: {marginTop: 10},
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
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
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E8EBEF',
  },
  sortLeft: {flexDirection: 'row', alignItems: 'center', gap: 8},
  sortIcon: {fontSize: 18, color: Colors.GREY},
  sortLabel: {fontSize: 15, color: Colors.TEXT_PRIMARY, fontWeight: '500'},
  sortRight: {flexDirection: 'row', alignItems: 'center'},
  sortValueText: {fontSize: 15, color: Colors.TEXT_PRIMARY, fontWeight: '500', marginRight: 6},
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
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E8EBEF',
    marginBottom: 0,
  },
  stocksCard: {
    marginHorizontal: 16,
    backgroundColor: Colors.white,
    borderRadius: 14,
    borderWidth: 0.8,
    borderColor: '#E8EBEF',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.05,
    shadowRadius: 10,
    // elevation: 2,
  },
  importWrap: {
    paddingHorizontal: 14,
    paddingTop: 8,
    paddingBottom: 14,
  },
  holdingModalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  holdingModalSheet: {
    backgroundColor: Colors.white,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingBottom: Platform.OS === 'ios' ? 28 : 20,
    paddingHorizontal: 0,
  },
  holdingModalHandle: {
    alignSelf: 'center',
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#D1D5DB',
    marginTop: 10,
    marginBottom: 8,
  },
  holdingModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  holdingModalTitle: {flex: 1, fontSize: 15, color: Colors.TEXT_PRIMARY, lineHeight: 20},
  holdingModalChevron: {fontSize: 22, color: Colors.GREY, fontWeight: '300'},
  holdingModalDivider: {height: 1, backgroundColor: Colors.BORDER_GREY, marginHorizontal: 16},
  holdingModalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  holdingModalLabel: {fontSize: 15, color: Colors.GREY},
  holdingModalValue: {fontSize: 16, color: Colors.TEXT_PRIMARY},
  holdingModalAction: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    gap: 12,
  },
  holdingModalActionIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  holdingModalActionIconTxt: {fontSize: 18, color: Colors.TEXT_PRIMARY},
  holdingModalActionTxt: {flex: 1, fontSize: 16, color: Colors.TEXT_PRIMARY},
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
  fundLogoLetter: {fontSize: 14, fontWeight: '500', color: Colors.themeBlue},
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
  footer: {paddingHorizontal: 16, marginTop: 12},
  importBtn: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderWidth: 0.8,
    borderColor: '#E1E5EA',
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
    gap: 14,
    borderWidth: 1,
    borderColor: '#EBECED',
    marginBottom: 0,
  },
  sipEmoji: {width: 38, justifyContent: 'center', alignItems: 'center', top: 25, height: 38},
  sipTextCol: {flex: 1},
  sipTitle: {fontSize: 16, color: Colors.TEXT_PRIMARY, lineHeight: 22, marginBottom: 12},
  sipButton: {
    alignSelf: 'flex-start',
    backgroundColor: Colors.themeBlue,
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 10,
  },
  sipButtonText: {color: Colors.white, fontSize: 15},
});
