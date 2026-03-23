import React, {useCallback, useEffect, useMemo, useState} from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Alert,
  Dimensions,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useNavigation, useRoute} from '@react-navigation/native';
import {useDispatch, useSelector} from 'react-redux';
import Slider from '@react-native-community/slider';
import {useFundData} from '../../hooks/useFundData';
import {useGraphData} from '../../hooks/useGraphData';
import {getSchemeHistory} from '../../services/fundSchemeService';
import {addToWishlist, removeFromWishlist} from '../../services/wishlistService';
import {addToCart, selectCartItemCount} from '../../store/slices/cartSlice';
import {navigateToCart} from '../../navigation/navigationRef';
import NavLineChart from '../../components/FundDetail/NavLineChart';
import {Colors} from '../../utils/AppConstant';
import Textstyles from '../../utils/text';

function formatDate(iso) {
  if (!iso) {
    return '—';
  }
  try {
    return new Date(iso).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return '—';
  }
}

function safeInr(v) {
  if (v === null || v === undefined || Number.isNaN(Number(v))) {
    return '—';
  }
  return `₹${Number(v).toLocaleString('en-IN')}`;
}

async function fetchReturnRows(schemeId, investmentAmount) {
  const periods = [
    {label: '6 months', months: 6},
    {label: '1 year', months: 12},
    {label: '3 years', months: 36},
  ];
  const rows = [];
  for (const period of periods) {
    const toDate = new Date();
    const fromDate = new Date();
    fromDate.setMonth(toDate.getMonth() - period.months);
    const res = await getSchemeHistory(
      schemeId,
      fromDate.toISOString().split('T')[0],
      toDate.toISOString().split('T')[0],
    );
    const navHistory = res?.success ? res.data?.results?.nav_history ?? [] : [];
    if (navHistory.length < 2) {
      continue;
    }
    const startNav = Number(navHistory[navHistory.length - 1].nav_value);
    const endNav = Number(navHistory[0].nav_value);
    if (!startNav) {
      continue;
    }
    const value = investmentAmount * (endNav / startNav);
    const percent = ((value - investmentAmount) / investmentAmount) * 100;
    rows.push({
      label: period.label,
      invested: investmentAmount,
      value: Math.round(value),
      percent: Number(percent.toFixed(2)),
    });
  }
  return rows;
}

export default function FundDetailScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const dispatch = useDispatch();
  const cartCount = useSelector(selectCartItemCount);

  useEffect(() => {
    if (__DEV__) {
      console.log('[FundDetail] route', {
        name: route.name,
        key: route.key,
        params: route.params,
      });
    }
  }, [route]);

  const schemeCode =
    route.params?.schemeCode ?? route.params?.scheme_code ?? route.params?.code;
  const paramName = route.params?.schemeName ?? route.params?.scheme_name;

  const {data: folioData, isLoading: loading, error, refetch} = useFundData(schemeCode);
  const [timeFrame, setTimeFrame] = useState('1M');
  const schemeId = folioData?.schemeId ?? null;

  const {data: graphData, isLoading: graphLoading} = useGraphData(schemeId, timeFrame);

  const fundInfo = folioData?.schemeData || {};
  const logoUrl = folioData?.logo_url || fundInfo?.logo_url;
  const holdingsList = fundInfo?.holdings?.holdings ?? [];

  const [isFav, setIsFav] = useState(false);
  useEffect(() => {
    if (folioData?.wish_flag !== undefined) {
      setIsFav(!!folioData.wish_flag);
    }
  }, [folioData?.wish_flag]);

  const [calcAmount, setCalcAmount] = useState(5000);
  const [debouncedAmount, setDebouncedAmount] = useState(5000);
  useEffect(() => {
    const t = setTimeout(() => setDebouncedAmount(calcAmount), 400);
    return () => clearTimeout(t);
  }, [calcAmount]);

  const [returnRows, setReturnRows] = useState([]);
  const [tableLoading, setTableLoading] = useState(false);

  useEffect(() => {
    if (!schemeId) {
      setReturnRows([]);
      return;
    }
    let cancelled = false;
    (async () => {
      setTableLoading(true);
      try {
        const rows = await fetchReturnRows(schemeId, debouncedAmount);
        if (!cancelled) {
          setReturnRows(rows);
        }
      } catch {
        if (!cancelled) {
          setReturnRows([]);
        }
      } finally {
        if (!cancelled) {
          setTableLoading(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [schemeId, debouncedAmount]);

  const displayName = fundInfo?.scheme_name || fundInfo?.base_scheme_name || paramName || 'Fund';

  const onWishlist = useCallback(async () => {
    if (!fundInfo?.scheme_code) {
      return;
    }
    try {
      if (!isFav) {
        const res = await addToWishlist({
          scheme_code: fundInfo.scheme_code,
          scheme_name: fundInfo.scheme_name,
          amc_code: fundInfo.amc_code,
        });
        if (res?.success) {
          setIsFav(true);
          Alert.alert('Watchlist', 'Added to watchlist');
        }
      } else {
        const res = await removeFromWishlist(fundInfo.scheme_code);
        if (res?.success) {
          setIsFav(false);
          Alert.alert('Watchlist', 'Removed from watchlist');
        }
      }
    } catch {
      Alert.alert('Error', 'Could not update watchlist');
    }
  }, [fundInfo, isFav]);

  const onAddToCart = useCallback(() => {
    if (!fundInfo?.scheme_code) {
      Alert.alert('Error', 'Fund data not loaded');
      return;
    }
    const amount = Number(fundInfo.min_purchase_amount) || 5000;
    dispatch(
      addToCart({
        fund: fundInfo,
        amount,
        isSIP: false,
        logo_url: logoUrl,
      }),
    );
    Alert.alert('Cart', `${displayName} added to cart`);
  }, [dispatch, fundInfo, logoUrl, displayName]);

  const openCart = useCallback(() => {
    navigateToCart(navigation);
  }, [navigation]);

  const header = useMemo(
    () => (
      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={12}>
          <Text style={styles.back}>‹</Text>
        </TouchableOpacity>
        <View style={styles.topActions}>
          <TouchableOpacity onPress={onWishlist} hitSlop={12}>
            <Text style={styles.iconBtn}>{isFav ? '★' : '☆'}</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={openCart} style={[styles.cartWrap, styles.cartBtn]} hitSlop={12}>
            <Text style={styles.iconBtn}>🛒</Text>
            {cartCount > 0 ? (
              <View style={styles.badge}>
                <Text style={styles.badgeTxt}>{cartCount > 99 ? '99+' : cartCount}</Text>
              </View>
            ) : null}
          </TouchableOpacity>
        </View>
      </View>
    ),
    [navigation, onWishlist, openCart, isFav, cartCount],
  );

  if (!schemeCode) {
    return (
      <SafeAreaView style={styles.safe}>
        {header}
        <Text style={styles.err}>Missing scheme code</Text>
      </SafeAreaView>
    );
  }

  if (loading && !folioData) {
    return (
      <SafeAreaView style={styles.safe}>
        {header}
        <View style={styles.center}>
          <ActivityIndicator size="large" color={Colors.themeBlue} />
          <Text style={styles.loadingTxt}>Loading fund…</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error || !fundInfo?.scheme_code) {
    return (
      <SafeAreaView style={styles.safe}>
        {header}
        <View style={styles.center}>
          <Text style={styles.err}>{error || 'Could not load fund'}</Text>
          <TouchableOpacity onPress={() => refetch()} style={styles.retry}>
            <Text style={styles.retryTxt}>Retry</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      {header}
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.card}>
          <View style={styles.titleRow}>
            {logoUrl ? (
              <Image source={{uri: logoUrl}} style={styles.logo} resizeMode="contain" />
            ) : (
              <View style={[styles.logo, styles.logoPh]}>
                <Text style={styles.logoL}>{displayName[0]}</Text>
              </View>
            )}
            <Text style={[Textstyles.bold, styles.title]} numberOfLines={3}>
              {displayName}
            </Text>
          </View>
          <View style={styles.tags}>
            {fundInfo.scheme_plan ? (
              <View style={styles.tag}>
                <Text style={styles.tagTxt}>{fundInfo.scheme_plan}</Text>
              </View>
            ) : null}
            {fundInfo.scheme_type ? (
              <View style={styles.tag}>
                <Text style={styles.tagTxt}>{fundInfo.scheme_type}</Text>
              </View>
            ) : null}
            {fundInfo?.holdings?.nfo_risk ? (
              <View style={styles.tag}>
                <Text style={styles.tagTxt}>{fundInfo.holdings.nfo_risk} risk</Text>
              </View>
            ) : null}
          </View>

          {schemeId ? (
            <NavLineChart
              graphData={graphData}
              graphLoading={graphLoading}
              timeFrame={timeFrame}
              onTimeFrameChange={setTimeFrame}
            />
          ) : null}
        </View>

        <View style={styles.card}>
          <View style={styles.grid2}>
            <View style={styles.cell}>
              <Text style={styles.cellLabel}>NAV ({formatDate(fundInfo.last_updated)})</Text>
              <Text style={[Textstyles.bold, styles.cellVal]}>
                {fundInfo.nav != null ? Number(fundInfo.nav).toFixed(2) : '—'}
              </Text>
            </View>
            <View style={styles.cell}>
              <Text style={styles.cellLabel}>Rating</Text>
              <Text style={[Textstyles.bold, styles.cellVal]}>
                {fundInfo?.holdings?.groww_rating ?? '—'}
              </Text>
            </View>
            <View style={styles.cell}>
              <Text style={styles.cellLabel}>Min SIP</Text>
              <Text style={[Textstyles.bold, styles.cellVal]}>
                {fundInfo?.holdings?.min_sip_investment != null
                  ? safeInr(fundInfo.holdings.min_sip_investment)
                  : '—'}
              </Text>
            </View>
            <View style={styles.cell}>
              <Text style={styles.cellLabel}>Min purchase</Text>
              <Text style={[Textstyles.bold, styles.cellVal]}>{safeInr(fundInfo.min_purchase_amount)}</Text>
            </View>
          </View>
        </View>

        <View style={styles.card}>
          <Text style={[Textstyles.bold, styles.sectionTitle]}>Return calculator</Text>
          <Text style={[Textstyles.medium, styles.calcAmt]}>₹{calcAmount.toLocaleString('en-IN')}</Text>
          <Slider
            style={styles.slider}
            minimumValue={1000}
            maximumValue={200000}
            step={500}
            value={calcAmount}
            onValueChange={setCalcAmount}
            minimumTrackTintColor={Colors.themeBlue}
            maximumTrackTintColor={Colors.LIGHT_GREY}
            thumbTintColor={Colors.themeBlue}
          />
          <Text style={[Textstyles.medium, styles.tableHead]}>Over the past</Text>
          {tableLoading ? (
            <ActivityIndicator style={{marginVertical: 16}} color={Colors.themeBlue} />
          ) : (
            returnRows.map((row, i) => (
              <View key={row.label} style={[styles.tableRow, i > 0 && styles.tableRowBorder]}>
                <Text style={styles.tCell}>{row.label}</Text>
                <Text style={styles.tCell}>{safeInr(row.invested)}</Text>
                <Text style={styles.tCell}>{safeInr(row.value)}</Text>
                <Text
                  style={[
                    styles.tCell,
                    styles.tRight,
                    row.percent >= 0 ? styles.pos : styles.neg,
                  ]}>
                  {row.percent >= 0 ? '+' : ''}
                  {row.percent.toFixed(2)}%
                </Text>
              </View>
            ))
          )}
        </View>

        {holdingsList.length > 0 ? (
          <View style={styles.card}>
            <Text style={[Textstyles.bold, styles.sectionTitle]}>Holdings</Text>
            {holdingsList.slice(0, 15).map((h, idx) => (
              <View key={idx} style={styles.holdingRow}>
                <Text style={[Textstyles.medium, styles.hName]} numberOfLines={2}>
                  {h.instrument_name || h.sector_name || '—'}
                </Text>
                <Text style={styles.hPct}>{h.corpus_per != null ? `${Number(h.corpus_per).toFixed(1)}%` : '—'}</Text>
              </View>
            ))}
          </View>
        ) : null}

        <TouchableOpacity style={styles.addCart} onPress={onAddToCart} activeOpacity={0.9}>
          <Text style={[Textstyles.medium, styles.addCartTxt]}>Add to cart (min amount)</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.viewCart} onPress={openCart} activeOpacity={0.85}>
          <Text style={[Textstyles.medium, styles.viewCartTxt]}>View cart →</Text>
        </TouchableOpacity>

        <View style={{height: 32}} />
      </ScrollView>
    </SafeAreaView>
  );
}

const w = Dimensions.get('window').width;

const styles = StyleSheet.create({
  safe: {flex: 1, backgroundColor: '#f9f9f9'},
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.BORDER_GREY,
  },
  back: {fontSize: 28, color: Colors.TEXT_PRIMARY, fontWeight: '300'},
  topActions: {flexDirection: 'row', alignItems: 'center'},
  cartBtn: {marginLeft: 20},
  iconBtn: {fontSize: 22},
  cartWrap: {position: 'relative'},
  badge: {
    position: 'absolute',
    top: -6,
    right: -10,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#111',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  badgeTxt: {color: '#fff', fontSize: 10, fontWeight: '700'},
  scroll: {paddingBottom: 40},
  card: {
    backgroundColor: Colors.white,
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: Colors.BORDER_GREY,
  },
  titleRow: {flexDirection: 'row', alignItems: 'flex-start'},
  logo: {width: 48, height: 48, borderRadius: 8, marginRight: 12},
  logoPh: {
    backgroundColor: Colors.offWhite,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.BORDER_GREY,
  },
  logoL: {fontSize: 20, fontWeight: '700', color: Colors.themeBlue},
  title: {flex: 1, fontSize: 18, color: Colors.TEXT_PRIMARY, lineHeight: 24},
  tags: {flexDirection: 'row', flexWrap: 'wrap', marginTop: 12, marginBottom: 8},
  tag: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
    backgroundColor: '#F1F8FF',
    borderWidth: 1,
    borderColor: '#1E81F2',
    marginRight: 8,
    marginBottom: 6,
  },
  tagTxt: {fontSize: 12, color: '#1E81F2'},
  grid2: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -8,
  },
  cell: {width: w > 400 ? '50%' : '100%', paddingHorizontal: 8, marginBottom: 16},
  cellLabel: {fontSize: 13, color: Colors.GREY, marginBottom: 4},
  cellVal: {fontSize: 17, color: Colors.TEXT_PRIMARY},
  sectionTitle: {fontSize: 17, marginBottom: 10, color: Colors.TEXT_PRIMARY},
  calcAmt: {fontSize: 22, color: Colors.TEXT_PRIMARY, marginBottom: 8},
  slider: {width: '100%', height: 44, marginBottom: 8},
  tableHead: {fontSize: 15, color: Colors.GREY, marginBottom: 8, marginTop: 8},
  tableRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingVertical: 10,
    gap: 4,
  },
  tableRowBorder: {borderTopWidth: 1, borderTopColor: Colors.BORDER_GREY},
  tCell: {fontSize: 12, color: Colors.TEXT_PRIMARY, width: '23%', minWidth: 70},
  tRight: {textAlign: 'right', flex: 1},
  pos: {color: '#16a34a'},
  neg: {color: '#dc2626'},
  holdingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: Colors.BORDER_GREY,
  },
  hName: {flex: 1, fontSize: 14, paddingRight: 8},
  hPct: {fontSize: 14, fontWeight: '600', color: Colors.TEXT_PRIMARY},
  addCart: {
    marginHorizontal: 16,
    marginTop: 16,
    backgroundColor: '#22C55E',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
  },
  addCartTxt: {color: Colors.white, fontSize: 16},
  viewCart: {marginHorizontal: 16, marginTop: 12, paddingVertical: 12, alignItems: 'center'},
  viewCartTxt: {color: Colors.themeBlue, fontSize: 16},
  center: {flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24},
  loadingTxt: {marginTop: 12, color: Colors.GREY},
  err: {color: '#B91C1C', textAlign: 'center', padding: 16},
  retry: {marginTop: 12, padding: 12},
  retryTxt: {color: Colors.themeBlue, fontWeight: '600'},
});
