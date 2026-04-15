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
import {useAppTheme} from '../../theme/useAppTheme';
import {typeScale} from '../../theme/typography';
import {SEARCH_FIELD} from '../../theme/searchField';
import {TAB_SCREEN_SAFE_TOP_EXTRA, TAB_SCREEN_TITLE_TO_SEARCH} from '../../theme/tabScreenLayout';
import {appAlert} from '../../utils/appAlert';

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

function FundLogo({uri, name, colors, isDark}) {
  if (uri) {
    return <Image source={{uri}} style={styles.fundLogo} resizeMode="contain" />;
  }
  const letter = (name || '?')[0]?.toUpperCase?.() ?? '?';
  return (
    <View
      style={[
        styles.fundLogo,
        styles.fundLogoPh,
        {backgroundColor: isDark ? '#2A2A2A' : '#F3F4F6', borderColor: colors.border},
      ]}>
      <Text style={[styles.fundLogoLetter, {color: colors.primary}]}>{letter}</Text>
    </View>
  );
}

function buildMiniTrendSeries(seedInput) {
  const seedStr = String(seedInput ?? 'fund');
  let hash = 0;
  for (let i = 0; i < seedStr.length; i++) {
    hash = (hash * 31 + seedStr.charCodeAt(i)) % 9973;
  }
  const points = [];
  for (let i = 0; i < 16; i++) {
    const wave = Math.sin((i + (hash % 7)) / 2.5) * 0.28;
    const trend = ((hash % 19) - 9) * 0.0025 * i;
    const noise = ((hash + i * 13) % 11) / 100 - 0.05;
    points.push(Math.max(0.08, Math.min(0.92, 0.5 + wave + trend + noise)));
  }
  return points;
}

function MiniTrendSparkline({fund, colors, isDark}) {
  const points = useMemo(
    () => buildMiniTrendSeries(fund?.scheme_code ?? fund?.isin ?? fund?.scheme_name ?? fund?.base_scheme_name),
    [fund],
  );
  const width = 86;
  const height = 24;
  const step = width / Math.max(1, points.length - 1);

  return (
    <View style={[styles.sparklineWrap, {borderTopColor: colors.border}]}>
      <View style={[styles.sparklineBase, {backgroundColor: isDark ? 'rgba(255,255,255,0.14)' : '#D1D5DB'}]} />
      {points.map((p, i) => (
        <View
          key={`sp-${i}`}
          style={[
            styles.sparkPoint,
            {
              left: i * step,
              top: (1 - p) * (height - 4),
            },
          ]}
        />
      ))}
    </View>
  );
}

function HoldingRow({fund, sortMode, onHoldingPress, colors, isDark, holdingVisible}) {
  const fullName = fund?.scheme_name ?? fund?.base_scheme_name ?? '';
  const {base, suffix} = splitGrowthType(fullName);
  const logo = fund?.logo_url ?? fund?.logo ?? fund?.scheme_logo_url;

  let rightBig = '';
  let rightSmall = '';
  let rightBigColor = styles.statValueNeutral;

  if (sortMode === 'Day') {
    rightBig = holdingVisible ? formatSignedInr(fund?.one_day_return) : '•••••';
    rightSmall = formatAbsPct(fund?.one_day_return_per);
    rightBigColor = Number(fund?.one_day_return) < 0 ? styles.negativeText : styles.positiveText;
  } else if (sortMode === 'Returns') {
    rightBig = holdingVisible ? formatSignedInr(fund?.total_return) : '•••••';
    rightSmall = formatAbsPct(fund?.total_return_per);
    rightBigColor = Number(fund?.total_return) < 0 ? styles.negativeText : styles.positiveText;
  } else {
    rightBig = holdingVisible ? formatInr(fund?.current_holding) : '•••••';
    rightSmall = holdingVisible ? formatInr(fund?.amount) : '•••••';
    rightBigColor = styles.statValueNeutral;
  }

  return (
    <TouchableOpacity
      style={[styles.holdingCard, {borderBottomColor: colors.border}]}
      onPress={() => onHoldingPress(fund)}
      activeOpacity={0.7}>
      <View style={styles.holdingLeft}>
        <FundLogo uri={logo} name={base || fullName} colors={colors} isDark={isDark} />
        <View style={styles.fundTextCol}>
          <Text style={[Textstyles.medium, styles.fundName, {color: colors.textPrimary}]} numberOfLines={2}>
            {base || fullName || 'Fund'}
          </Text>
          {suffix ? <Text style={[Textstyles.medium, styles.growthLabel, {color: colors.textSecondary}]}>{suffix}</Text> : null}
        </View>
      </View>

      <MiniTrendSparkline fund={fund} colors={colors} isDark={isDark} />

      <View style={styles.holdingRight}>
        <Text style={[Textstyles.medium, styles.rightBig, rightBigColor]}>{rightBig}</Text>
        {rightSmall ? <Text style={[Textstyles.medium, styles.rightSmall, {color: colors.textSecondary}]}>{rightSmall}</Text> : null}
      </View>
    </TouchableOpacity>
  );
}

export default function DashboardScreen() {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const user = useSelector(s => s.auth.user);
  const firstName = useMemo(() => {
    const raw = user?.full_name || user?.first_name || user?.name || '';
    const trimmed = String(raw).trim();
    if (!trimmed) {
      return 'there';
    }
    return trimmed.split(/\s+/)[0];
  }, [user?.first_name, user?.full_name, user?.name]);
  const {colors, isDark} = useAppTheme();
  const canRedeem = useMemo(() => {
    const v = user?.allow_redeem;
    if (v === undefined || v === null || v === '') {
      return true;
    }
    const s = String(v).trim().toLowerCase();
    return !(v === false || v === 0 || s === 'false' || s === '0' || s === 'n' || s === 'no');
  }, [user?.allow_redeem]);

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
    if (!canRedeem) {
      appAlert('Redeem', 'Redeem is not available for your account.');
      return;
    }
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
  }, [canRedeem, holdingActionFund, navigation]);

  const cycleSortMode = useCallback(() => {
    setSortMode(prev => {
      const idx = SORT_ORDER.indexOf(prev);
      return SORT_ORDER[(idx + 1) % SORT_ORDER.length];
    });
  }, []);

  const sortHeaderLabel = SORT_MODE_LABEL[sortMode] ?? 'Current Invested';

  const headerPadTop = insets.top + TAB_SCREEN_SAFE_TOP_EXTRA;

  const listHeader = useMemo(
    () => (
      <View style={[styles.headerBlock, {paddingTop: headerPadTop, backgroundColor: colors.background}]}>
        <View style={styles.topRow}>
          <Text style={[Textstyles.heading, styles.welcome, {color: colors.textPrimary}]} numberOfLines={2}>
            Welcome {firstName},
          </Text>
          <HeaderActionCluster />
        </View>

        <TouchableOpacity
          style={[styles.searchBar, {backgroundColor: colors.inputBg, borderColor: colors.border}]}
          onPress={() => navigateToAllFundsSIP(navigation, {focusSearch: true})}
          activeOpacity={0.8}>
          <Image source={Icons.SearchIcon} style={styles.searchIconImg} resizeMode="contain" />
          <Text style={[Textstyles.normal, styles.searchPlaceholder, {color: colors.textSecondary}]}>
            Search mutual funds...
          </Text>
        </TouchableOpacity>
      </View>
    ),
    [colors.background, colors.border, colors.inputBg, colors.textPrimary, colors.textSecondary, firstName, headerPadTop, navigation],
  );

  const holdingsCard = useMemo(
    () => (
      <View style={[styles.holdingsCard, {backgroundColor: colors.card, borderColor: colors.border}]}>
        <View style={styles.holdingsHeaderRow}>
          <View>
            <Text style={[Textstyles.normal, styles.holdingsLabel, {color: colors.textSecondary}]}>
              Holdings ({holdings.length})
            </Text>
            <Text style={[Textstyles.medium, styles.holdingsBig, {color: colors.textPrimary}]}>
              {holdingVisible ? formatInr(portfolio?.current_holdings) : '•••••'}
            </Text>
          </View>

          <View style={styles.holdingsIcons}>
            <TouchableOpacity
              onPress={refetch}
              style={[styles.iconCircle, {borderColor: colors.border, backgroundColor: colors.card}]}
              hitSlop={{top: 10, bottom: 10, left: 10, right: 10}}
              activeOpacity={0.75}>
              {refreshing ? (
                <ActivityIndicator size="small" color={colors.primary} />
              ) : (
                <Image
                  source={Icons.RefreshIcon}
                  style={[styles.refreshIconImg, {tintColor: colors.textPrimary}]}
                  resizeMode="contain"
                />
              )}
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setHoldingVisible(v => !v)}
              style={[styles.iconCircle, {borderColor: colors.border, backgroundColor: colors.card}]}
              hitSlop={{top: 10, bottom: 10, left: 10, right: 10}}
              activeOpacity={0.75}>
              {holdingVisible ? (
                <Image
                  source={Icons.EyeIcon}
                  style={[styles.eyeIconImg, {tintColor: colors.textPrimary}]}
                  resizeMode="contain"
                />
              ) : (
                <Image
                  source={Icons.threeDots}
                  style={[styles.eyeIconImg, {tintColor: colors.textPrimary}]}
                  resizeMode="contain"
                />
              )}
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.statsCol}>
          <View style={styles.statRow}>
            <Text style={[styles.statLabel, {color: colors.textSecondary}]}>1D Returns</Text>
            <Text
              style={[
                Textstyles.medium,
                styles.statValue,
                Number(portfolio?.one_day_return) < 0 ? styles.negativeText : styles.positiveText,
              ]}>
              {holdingVisible
                ? `${formatSignedInr(portfolio?.one_day_return)} (${formatAbsPct(portfolio?.one_day_return_per)})`
                : `••••• (${formatAbsPct(portfolio?.one_day_return_per)})`}
            </Text>
          </View>

          <View style={styles.statRow}>
            <Text style={[styles.statLabel, {color: colors.textSecondary}]}>Total Returns</Text>
            <Text
              style={[
                Textstyles.medium,
                styles.statValue,
                Number(portfolio?.total_return) < 0 ? styles.negativeText : styles.positiveText,
              ]}>
              {holdingVisible
                ? `${formatSignedInr(portfolio?.total_return)} (${formatAbsPct(portfolio?.total_return_per)})`
                : `••••• (${formatAbsPct(portfolio?.total_return_per)})`}
            </Text>
          </View>

          <View style={styles.statRow}>
            <Text style={[styles.statLabel, {color: colors.textSecondary}]}>Invested</Text>
            <Text style={[Textstyles.medium, styles.statValue, {color: colors.textPrimary}]}>
              {holdingVisible ? formatInr(portfolio?.total_amount) : '•••••'}
            </Text>
          </View>

          <View style={styles.statRow}>
            <View style={styles.xirrLabelRow}>
              <Text style={[styles.statLabel, {color: colors.textSecondary}]}>XIRR</Text>
              <Image source={Icons.DropDown} style={[styles.caretDown, {tintColor: colors.textSecondary}]} resizeMode="contain" />
            </View>
            <Text style={[Textstyles.medium, styles.statValue, {color: colors.textPrimary}]}>
              {holdingVisible ? (portfolio?.XIRR != null ? `${Number(portfolio.XIRR).toFixed(2)}%` : '—') : '•••••'}
            </Text>
          </View>
        </View>
      </View>
    ),
    [
      colors.border,
      colors.card,
      colors.primary,
      colors.textPrimary,
      colors.textSecondary,
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
        <View style={[styles.sipCard, {backgroundColor: colors.card, borderColor: colors.border}]}>
          <View style={[styles.sipIconWrap, {backgroundColor: isDark ? '#1F2937' : '#F6F0F0'}]}>
            <Image
              source={require('../../assets/Icons/calendarSip.png')}
              style={styles.sipEmoji}
              resizeMode="contain"
            />
          </View>
          <View style={styles.sipTextCol}>
            <Text style={[Textstyles.medium, styles.sipTitle, {color: colors.textPrimary}]}>
              Invest every month and grow your wealth with SIP
            </Text>
            <TouchableOpacity
              style={styles.sipButton}
              onPress={() => navigateToAllFundsSIP(navigation)}
              activeOpacity={0.85}>
              <Text style={[Textstyles.normal, styles.sipButtonText]}>Start a SIP</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    ),
    [colors.border, colors.card, colors.textPrimary, isDark, navigation],
  );

  const showInlineLoader = isPending && !refreshing;

  const modalFund = holdingActionFund;
  const modalName = modalFund?.scheme_name ?? modalFund?.base_scheme_name ?? 'Fund';
  const modalLogo = modalFund?.logo_url ?? modalFund?.logo ?? modalFund?.scheme_logo_url;
  const modalInvested = modalFund?.amount;

  return (
    <SafeAreaView style={[styles.safe, {backgroundColor: colors.background}]} edges={['left', 'right']}>
      <StatusBar barStyle={colors.statusBar} backgroundColor={colors.background} />
      {error ? (
        <View style={[styles.errorBanner, {backgroundColor: isDark ? '#3B1D1D' : '#FEF2F2', borderColor: isDark ? '#7F1D1D' : '#FECACA'}]}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity onPress={() => refetch()} style={styles.retryBtn}>
            <Text style={[styles.retryText, {color: colors.primary}]}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : null}

      {listHeader}

      {showInlineLoader ? (
        <View style={styles.loadingInline}>
          <ActivityIndicator size="small" color={colors.primary} />
          <Text style={[Textstyles.normal, styles.loadingTextInline, {color: colors.textSecondary}]}>Loading portfolio…</Text>
        </View>
      ) : null}

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refetch} tintColor={colors.primary} />}
        showsVerticalScrollIndicator={false}>
        {holdingsCard}

        <View style={[styles.stocksCard, {backgroundColor: colors.card, borderColor: colors.border}]}>
          <TouchableOpacity
            style={[styles.listHeaderRow, {borderBottomColor: colors.border}]}
            activeOpacity={0.85}
            onPress={cycleSortMode}>
            <View style={styles.sortLeft}>
              <Text style={[styles.sortIcon, {color: colors.textSecondary}]}>⇅</Text>
              <Text style={[styles.sortLabel, {color: colors.textPrimary}]}>Sort</Text>
            </View>

            <View style={styles.sortRight}>
              <Text style={[styles.sortValueText, {color: colors.textPrimary}]}>{sortHeaderLabel}</Text>
              {sortMode === 'Current' ? <Text style={[styles.sortAngle, {color: colors.textSecondary}]}> &lt;&gt;</Text> : null}
              <Image source={Icons.DropDown} style={[styles.sortCaret, {tintColor: colors.textSecondary}]} resizeMode="contain" />
            </View>
          </TouchableOpacity>

          {holdings.length === 0 ? (
            <View style={styles.emptyBox}>
              <Text style={[Textstyles.normal, styles.emptyText, {color: colors.textSecondary}]}>No holdings yet</Text>
            </View>
          ) : null}

          {holdings.map((item, index) => (
            <HoldingRow
              key={String(item.scheme_code ?? item.isin ?? index)}
              fund={item}
              sortMode={sortMode}
              onHoldingPress={onHoldingPress}
              colors={colors}
              isDark={isDark}
              holdingVisible={holdingVisible}
            />
          ))}

          <View style={styles.importWrap}>
            <TouchableOpacity
              style={[styles.importBtn, {backgroundColor: colors.inputBg, borderColor: colors.border}]}
              // disabled={true}
              onPress={() => {
                appAlert('Coming Soon!')
                // navigation.navigate('Explore')
              }}
              activeOpacity={0.85}>
              <View style={styles.importLeft}>
                <View style={[styles.importIconCircle, {backgroundColor: isDark ? '#1E293B' : '#E8F4FC', borderColor: colors.border}]}>
                  <Image
                    source={Icons.ImportExternalFunds}
                    style={[styles.importIconImg, {tintColor: colors.primary}]}
                    resizeMode="contain"
                  />
                </View>
                <Text style={[Textstyles.medium, styles.importText, {color: colors.textPrimary}]}>Import External Funds</Text>
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
          style={[styles.holdingModalHeader, {backgroundColor: colors.card}]}
          onPress={onModalInvestmentDetails}
          activeOpacity={0.85}>
          <FundLogo uri={modalLogo} name={modalName} />
          <Text style={[Textstyles.medium, styles.holdingModalTitle, {color: colors.textPrimary}]} numberOfLines={2}>
            {modalName}
          </Text>
          <Image source={Icons.GoIcon} style={[styles.holdingModalChevron, {tintColor: colors.textSecondary}]} resizeMode="contain" />
        </TouchableOpacity>

        <View style={[styles.holdingModalDivider, {backgroundColor: colors.border}]} />

        <View style={styles.holdingModalRow}>
          <Text style={[styles.holdingModalLabel, {color: colors.textSecondary}]}>Invested Value</Text>
          <Text style={[Textstyles.medium, styles.holdingModalValue, {color: colors.textPrimary}]}>
            {formatInr(modalInvested)}
          </Text>
        </View>

        <View style={[styles.holdingModalDivider, {backgroundColor: colors.border}]} />

        {canRedeem ? (
          <TouchableOpacity style={[styles.holdingModalAction, {backgroundColor: colors.card}]} onPress={onModalRedeem} activeOpacity={0.8}>
            <View
              style={[
                styles.holdingModalActionIconWrap,
                {backgroundColor: isDark ? '#1E293B' : '#F3F4F6', borderColor: colors.border},
              ]}>
              <Text style={[styles.holdingModalActionIconTxt, {color: colors.textPrimary}]}>₹</Text>
            </View>
            <Text style={[Textstyles.medium, styles.holdingModalActionTxt, {color: colors.textPrimary}]}>Redeem</Text>
            <Image source={Icons.GoIcon} style={[styles.holdingModalChevron, {tintColor: colors.textSecondary}]} resizeMode="contain" />
          </TouchableOpacity>
        ) : null}

        <TouchableOpacity
          style={[styles.holdingModalAction, {backgroundColor: colors.card}]}
          onPress={onModalInvestmentDetails}
          activeOpacity={0.8}>
          <View
            style={[
              styles.holdingModalActionIconWrap,
              {backgroundColor: isDark ? '#1E293B' : '#F3F4F6', borderColor: colors.border},
            ]}>
            <Text style={[styles.holdingModalActionIconTxt, {color: colors.textPrimary}]}>☰</Text>
          </View>
          <Text style={[Textstyles.medium, styles.holdingModalActionTxt, {color: colors.textPrimary}]}>
            Investment Details
          </Text>
          <Image source={Icons.GoIcon} style={[styles.holdingModalChevron, {tintColor: colors.textSecondary}]} resizeMode="contain" />
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
  loadingInline: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  loadingTextInline: {
    marginTop: 0,
    color: Colors.GREY,
    fontSize: 14,
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
    marginBottom: TAB_SCREEN_TITLE_TO_SEARCH,
    gap: 12,
  },
  welcome: {
    flex: 1,
    fontSize: typeScale.title,
    color: Colors.TEXT_PRIMARY,
    lineHeight: 22,
    paddingRight: 4,
  },
  searchBar: {
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.BORDER_GREY,
    borderRadius: SEARCH_FIELD.borderRadius,
    paddingVertical: SEARCH_FIELD.paddingVertical,
    minHeight: SEARCH_FIELD.minHeight,
    paddingHorizontal: SEARCH_FIELD.paddingHorizontal,
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
  searchIconImg: {width: SEARCH_FIELD.iconSize, height: SEARCH_FIELD.iconSize, opacity: 0.9},
  searchPlaceholder: {
    color: Colors.GREY,
    fontSize: SEARCH_FIELD.inputFontSize,
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
  iconCircleTxt: {fontSize: typeScale.amountInput, color: Colors.TEXT_PRIMARY, lineHeight: 22},
  refreshIconImg: {width: 20, height: 20},
  eyeIconImg: {width: 22, height: 22},
  holdingsLabel: {fontSize: 14, color: Colors.GREY},
  holdingsBig: {fontSize: typeScale.amountInput, color: Colors.TEXT_PRIMARY, marginTop: 2},
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
  sortCaret: {width: 12, height: 12, marginLeft: 6},
  sortAngle: {fontSize: 14, color: Colors.GREY},
  xirrLabelRow: {flexDirection: 'row', alignItems: 'center'},
  caretDown: {width: 12, height: 12, marginLeft: 6},
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
  holdingModalChevron: {width: 12, height: 12},
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
    borderWidth: 1,
    borderColor: Colors.BORDER_GREY,
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
  sparklineWrap: {
    width: 68,
    height: 18,
    marginHorizontal: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    justifyContent: 'center',
  },
  sparklineBase: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 2,
    height: 2,
    borderRadius: 2,
    opacity: 0.8,
  },
  sparkPoint: {
    position: 'absolute',
    width: 4,
    height: 2,
    borderRadius: 1,
    backgroundColor: '#EF4444',
    opacity: 0.95,
  },
  rightBig: {fontSize: 14, color: Colors.TEXT_PRIMARY},
  rightSmall: {fontSize: 12, color: Colors.GREY, marginTop: 3},
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
    borderRadius: 10,
    backgroundColor: '#E8F4FC',
    borderWidth: 1,
    borderColor: '#D6F0FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  importIconImg: {width: 22, height: 22},
  importText: {fontSize: 15, color: Colors.TEXT_PRIMARY, marginRight: 12},
  chevron: {fontSize: typeScale.chevron, color: Colors.GREY},
  sipCard: {
    flexDirection: 'row',
    backgroundColor: Colors.white,
    borderRadius: 18,
    paddingVertical: 18,
    paddingHorizontal: 16,
    gap: 16,
    borderWidth: 1,
    borderColor: '#EBECED',
    marginBottom: 0,
    alignItems: 'center',
  },
  sipIconWrap: {
    width: 86,
    height: 86,
    borderRadius: 43,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sipEmoji: {width: 54, height: 54},
  sipTextCol: {flex: 1},
  sipTitle: {fontSize: 15, color: Colors.TEXT_PRIMARY, lineHeight: 22, marginBottom: 14},
  sipButton: {
    alignSelf: 'flex-start',
    backgroundColor: '#21C76E',
    minWidth: 148,
    paddingVertical: 11,
    paddingHorizontal: 20,
    borderRadius: 16,
    alignItems: 'center',
  },
  sipButtonText: {color: Colors.white, fontSize: 15},
});
