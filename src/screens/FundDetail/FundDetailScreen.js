import React, {useCallback, useEffect, useMemo, useState} from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Dimensions,
  TextInput,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useNavigation, useRoute} from '@react-navigation/native';
import {useDispatch, useSelector} from 'react-redux';
import ReturnAmountSlider from '../../components/FundDetail/ReturnAmountSlider';
import DatePicker from 'react-native-date-picker';
import {WebView} from 'react-native-webview';
import {useFundData} from '../../hooks/useFundData';
import {useGraphData} from '../../hooks/useGraphData';
import {useMandateData} from '../../hooks/useMandateData';
import {getSchemeHistory} from '../../services/fundSchemeService';
import {addToWishlist, removeFromWishlist} from '../../services/wishlistService';
import {
  authenticateOrder,
  buildOrderPlacePayload,
  createSingleOrder,
  extractOrderId,
  extractOrderAuthUrl,
  processOrderPayment,
  isAuthenticatedOrderState,
} from '../../services/ordersService';
import {addToCart, selectCartItemCount} from '../../store/slices/cartSlice';
import {navigateToCart, navigateToInvestment} from '../../navigation/navigationRef';
import NavLineChart from '../../components/FundDetail/NavLineChart';
import AppBackButton from '../../components/AppBackButton';
import {Colors} from '../../utils/AppConstant';
import Textstyles from '../../utils/text';
import AppModal from '../../components/AppModal';
import Icons from '../../utils/icons';
import {useAppTheme} from '../../theme/useAppTheme';
import {
  pickMaxSipInvestmentOrNull,
  pickMinSipInvestment,
  pickMinSipInvestmentOrNull,
} from '../../utils/schemeLimits';
import {typeScale} from '../../theme/typography';
import {appAlert} from '../../utils/appAlert';

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

function toFiniteNumber(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : NaN;
}

function normalizeNavHistoryRows(rawRows) {
  const rows = Array.isArray(rawRows) ? rawRows : [];
  return rows
    .map(item => {
      const nav = toFiniteNumber(item?.nav_value ?? item?.nav);
      const rawDate = item?.nav_date ?? item?.date ?? item?.timestamp ?? item?.portfolio_date;
      const ms = typeof rawDate === 'number' ? (rawDate < 1e12 ? rawDate * 1000 : rawDate) : new Date(rawDate).getTime();
      return {nav, ms};
    })
    .filter(x => Number.isFinite(x.nav) && Number.isFinite(x.ms))
    .sort((a, b) => a.ms - b.ms);
}

function buildDonutHTML({labels, values, colors}) {
  const safeLabels = JSON.stringify(Array.isArray(labels) ? labels : []);
  const safeValues = JSON.stringify(Array.isArray(values) ? values : []);
  const safeColors = JSON.stringify(Array.isArray(colors) ? colors : []);
  return `<!doctype html>
<html><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1,user-scalable=no"/>
<style>html,body,#c{margin:0;padding:0;width:100%;height:100%;background:transparent;overflow:hidden}</style>
</head><body><div id="c"></div>
<script src="https://cdn.jsdelivr.net/npm/apexcharts"></script>
<script>
  (function(){
    try{
      var labels=${safeLabels};
      var series=${safeValues};
      var colors=${safeColors};
      if(!series || !series.length){ document.body.innerHTML=''; return; }
      var chart=new ApexCharts(document.querySelector('#c'),{
        chart:{
          type:'donut',
          height:'100%',
          width:'100%',
          background:'transparent',
          toolbar:{show:false},
          animations:{enabled:false},
          events:{
            dataPointSelection:function(event,chartContext,config){
              var i=config.dataPointIndex;
              if(typeof i==='number'&&window.ReactNativeWebView){
                window.ReactNativeWebView.postMessage(JSON.stringify({t:'slice',i:i}));
              }
            }
          }
        },
        series:series,
        labels:labels,
        stroke:{width:0},
        dataLabels:{enabled:false},
        legend:{show:false},
        colors:colors && colors.length ? colors : undefined,
        tooltip:{
          enabled:true,
          intersect:true,
          shared:false,
          followCursor:false,
          fillSeriesColor:false,
          y:{
            formatter:function(val,opts){
              var idx=opts.dataPointIndex!=null?opts.dataPointIndex:opts.seriesIndex;
              var lbl=(labels && labels[idx]!==undefined)?labels[idx]:'';
              var n=val!=null?Number(val):NaN;
              var pct=(!isNaN(n))?n.toFixed(2)+'%':'';
              return (lbl?lbl+': ':'')+pct;
            }
          }
        },
        plotOptions:{
          pie:{
            expandOnClick:true,
            donut:{size:'62%'}
          }
        },
        states:{
          hover:{filter:{type:'darken',value:0.12}},
          active:{filter:{type:'darken',value:0.08}}
        }
      });
      chart.render();
    }catch(e){}
  })();
</script></body></html>`;
}

const DONUT_COLORS = ['#8BEA45', '#2F7EDB', '#F5A300', '#19C37D', '#8B5CF6', '#EF4444', '#14B8A6', '#A3A3A3'];

function HoldingAnalysisBlock({title, dataMap, styles}) {
  const [selectedIdx, setSelectedIdx] = useState(null);

  const entries = useMemo(() => {
    if (!dataMap || typeof dataMap !== 'object') {
      return [];
    }
    return Object.entries(dataMap)
      .map(([k, v]) => ({label: String(k).replace(/_/g, ' '), value: toFiniteNumber(v)}))
      .filter(x => Number.isFinite(x.value) && x.value > 0);
  }, [dataMap]);

  const entriesKey = useMemo(
    () => entries.map(e => `${e.label}:${e.value}`).join('|'),
    [entries],
  );

  useEffect(() => {
    setSelectedIdx(null);
  }, [entriesKey]);

  const labels = entries.map(e => e.label);
  const values = entries.map(e => e.value);
  const colors = entries.map((_, i) => DONUT_COLORS[i % DONUT_COLORS.length]);

  const donutHtml = useMemo(
    () => buildDonutHTML({labels, values, colors}),
    [labels, values, colors],
  );

  const onDonutMessage = useCallback(event => {
    try {
      const raw = event?.nativeEvent?.data;
      if (!raw || typeof raw !== 'string') {
        return;
      }
      const p = JSON.parse(raw);
      if (p?.t === 'slice' && typeof p.i === 'number') {
        setSelectedIdx(p.i);
      }
    } catch {
      /* ignore */
    }
  }, []);

  if (!entries.length) {
    return null;
  }

  return (
    <View style={styles.analysisBlock}>
      <Text style={styles.analysisTitle}>{title}</Text>
      <View style={styles.analysisRow}>
        <View style={styles.analysisLegendWrap}>
          {entries.map((item, idx) => (
            <TouchableOpacity
              key={`${item.label}-${idx}`}
              activeOpacity={0.75}
              onPress={() => setSelectedIdx(idx)}
              style={[styles.analysisLegendItem, selectedIdx === idx ? styles.analysisLegendItemOn : null]}>
              <View style={[styles.legendDot, {backgroundColor: colors[idx]}]} />
              <Text style={styles.analysisLegendText}>
                {item.label} <Text style={styles.analysisLegendValue}>{item.value.toFixed(2)}%</Text>
              </Text>
            </TouchableOpacity>
          ))}
        </View>
        <View style={styles.analysisChartWrap}>
          <WebView
            key={entriesKey}
            originWhitelist={['*']}
            source={{html: donutHtml}}
            style={styles.analysisWebView}
            scrollEnabled={false}
            showsVerticalScrollIndicator={false}
            showsHorizontalScrollIndicator={false}
            javaScriptEnabled
            domStorageEnabled
            nestedScrollEnabled
            onMessage={onDonutMessage}
          />
        </View>
      </View>
      {selectedIdx != null && entries[selectedIdx] ? (
        <Text style={styles.analysisSelectionHint}>
          Selected: {entries[selectedIdx].label} · {entries[selectedIdx].value.toFixed(2)}%
        </Text>
      ) : (
        <Text style={styles.analysisSelectionHintMuted}>Tap a slice or a row to highlight.</Text>
      )}
    </View>
  );
}

function formatDDMMYYYY(d) {
  if (!(d instanceof Date) || Number.isNaN(d.getTime())) {
    return '—';
  }
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = d.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
}

// NOTE: We use `react-native-date-picker` for both iOS + Android to avoid
// `@react-native-community/datetimepicker` TurboModule/validation crashes in
// bridgeless/new-arch setups.

function pickMandateLabel(item) {
  if (!item || typeof item !== 'object') {
    return '—';
  }
  const bank = item.bank_name ?? item.bank ?? item.bank_details?.bank_name ?? '';
  const umrn = item.umrn ?? item.UMRN ?? item.mandate_id ?? item.id ?? '';
  const amount = item.amount ?? item.max_amount ?? item.mandate_amount ?? item.sip_amount;
  const left = bank ? String(bank).trim() : 'Mandate';
  const right = umrn ? `#${String(umrn).trim()}` : amount ? safeInr(amount) : '';
  return right ? `${left} • ${right}` : left;
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
    const navHistory =
      res?.success
        ? res?.data?.results?.nav_history ??
          res?.data?.results?.history ??
          res?.data?.nav_history ??
          []
        : [];
    const normalized = normalizeNavHistoryRows(navHistory);
    let startNav = NaN;
    let endNav = NaN;

    if (normalized.length >= 2) {
      startNav = normalized[0].nav;
      endNav = normalized[normalized.length - 1].nav;
    } else {
      // Fallback to previous behavior when date fields are missing/unreliable.
      const raw = Array.isArray(navHistory) ? navHistory : [];
      if (raw.length < 2) {
        continue;
      }
      startNav = toFiniteNumber(raw[raw.length - 1]?.nav_value ?? raw[raw.length - 1]?.nav);
      endNav = toFiniteNumber(raw[0]?.nav_value ?? raw[0]?.nav);
    }
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
  const {colors, isDark} = useAppTheme();
  const styles = useMemo(() => getFundDetailStyles(colors, isDark), [colors, isDark]);
  const cartCount = useSelector(selectCartItemCount);
  const user = useSelector(s => s.auth.user);

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

  const {data: folioData, isLoading: loading, error, refetch: refetchFund} = useFundData(schemeCode);
  const {data: mandateData, isPending: mandateLoading, refetch: refetchMandate} = useMandateData();
  const [timeFrame, setTimeFrame] = useState('1M');
  const schemeId = folioData?.schemeId ?? null;

  const {data: graphData, isLoading: graphLoading, refetch: refetchGraph} = useGraphData(schemeId, timeFrame);

  const fundInfo = folioData?.schemeData || {};
  const logoUrl = folioData?.logo_url || fundInfo?.logo_url;
  const holdingsList = fundInfo?.holdings?.holdings ?? [];
  const holdingAnalysis = folioData?.holdingAnalysis ?? null;

  const [isFav, setIsFav] = useState(false);
  useEffect(() => {
    if (folioData?.wish_flag !== undefined) {
      setIsFav(!!folioData.wish_flag);
    }
  }, [folioData?.wish_flag]);

  const [calcAmount, setCalcAmount] = useState(5000);
  const [sliderAmount, setSliderAmount] = useState(5000);
  const [debouncedAmount, setDebouncedAmount] = useState(5000);
  useEffect(() => {
    setSliderAmount(calcAmount);
  }, [calcAmount]);
  useEffect(() => {
    const t = setTimeout(() => setDebouncedAmount(calcAmount), 400);
    return () => clearTimeout(t);
  }, [calcAmount]);

  const onSliderValueChange = useCallback(v => {
    const n = Number(v);
    if (!Number.isFinite(n)) {
      return;
    }
    setSliderAmount(Math.round(n));
  }, []);

  const onSliderComplete = useCallback(v => {
    const n = Number(v);
    if (!Number.isFinite(n)) {
      return;
    }
    const rounded = Math.round(n / 500) * 500;
    setSliderAmount(rounded);
    setCalcAmount(rounded);
  }, []);

  const [returnRows, setReturnRows] = useState([]);
  const [tableLoading, setTableLoading] = useState(false);
  const [orderType, setOrderType] = useState('ONE_TIME');
  const [orderAmount, setOrderAmount] = useState('');
  const [sipFrequency, setSipFrequency] = useState('Monthly');
  const [sipDurationYears, setSipDurationYears] = useState('1');
  const [sipDate, setSipDate] = useState(() => new Date());
  const [showSipDatePicker, setShowSipDatePicker] = useState(false);
  const [mandateModalVisible, setMandateModalVisible] = useState(false);
  const [selectedMandate, setSelectedMandate] = useState(null);
  const [pendingOrderId, setPendingOrderId] = useState(null);
  const [pendingOrderAmount, setPendingOrderAmount] = useState(null);
  const [pendingGatewayUrl, setPendingGatewayUrl] = useState('');
  const [placingOrder, setPlacingOrder] = useState(false);
  const [authLoading, setAuthLoading] = useState(false);
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [readyForPayment, setReadyForPayment] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [returnRefreshTick, setReturnRefreshTick] = useState(0);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await refetchFund();
      await Promise.all([refetchGraph(), refetchMandate()]);
      setReturnRefreshTick(t => t + 1);
    } finally {
      setRefreshing(false);
    }
  }, [refetchFund, refetchGraph, refetchMandate]);

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
  }, [schemeId, debouncedAmount, returnRefreshTick]);

  const displayName = fundInfo?.scheme_name || fundInfo?.base_scheme_name || paramName || 'Fund';
  const mandates = mandateData?.results ?? [];
  const selectedMandateLabel = selectedMandate ? pickMandateLabel(selectedMandate) : 'Select your preferred mandate option';

  useEffect(() => {
    if (__DEV__) {
      console.log('[FundDetail] mandateModalVisible', mandateModalVisible, {
        mandateLoading,
        mandatesCount: mandates.length,
      });
    }
  }, [mandateModalVisible, mandateLoading, mandates.length]);

  const minLumpsum = Number(fundInfo?.min_purchase_amount) || 500;
  const minSip = pickMinSipInvestment(fundInfo);
  const rawMinSipDisplay = pickMinSipInvestmentOrNull(fundInfo);
  const minOrderAmount = orderType === 'SIP' ? minSip : minLumpsum;

  const returnStats = fundInfo?.holdings?.return_stats?.[0] ?? null;
  const statsList = fundInfo?.holdings?.stats ?? [];
  const topHoldingsStats = useMemo(() => {
    const items = Array.isArray(holdingsList) ? holdingsList : [];
    const sorted = items
      .slice()
      .sort((a, b) => Number(b?.corpus_per ?? 0) - Number(a?.corpus_per ?? 0));
    const top5 = sorted.slice(0, 5).reduce((sum, h) => sum + Number(h?.corpus_per ?? 0), 0);
    const top10 = sorted.slice(0, 10).reduce((sum, h) => sum + Number(h?.corpus_per ?? 0), 0);
    return {top5, top10};
  }, [holdingsList]);

  const minInvestmentValues = useMemo(
    () => ({
      min1: fundInfo?.min_purchase_amount ?? null,
      minSip: pickMinSipInvestmentOrNull(fundInfo),
      maxSip: pickMaxSipInvestmentOrNull(fundInfo),
      minAdditional: fundInfo?.additional_purchase_amount ?? null,
    }),
    [fundInfo],
  );
  const holdingAnalysisSections = useMemo(() => {
    if (!holdingAnalysis || typeof holdingAnalysis !== 'object') {
      return [];
    }
    const titleMap = {
      allocation: 'Equity / Debt / Cash Split',
      equity_sectors: 'Equity Sector Allocation',
      debt_sectors: 'Debt Sector Allocation',
    };
    return Object.entries(holdingAnalysis)
      .map(([key, value]) => ({
        key,
        title: titleMap[key] || String(key).replace(/_/g, ' '),
        dataMap: value,
      }))
      .filter(x => x.dataMap && typeof x.dataMap === 'object' && Object.keys(x.dataMap).length > 0);
  }, [holdingAnalysis]);
  const fundDetailsRows = useMemo(
    () => [
      {label: 'Fund house', value: fundInfo?.amc_name || fundInfo?.fund_house},
      {label: 'Scheme type', value: fundInfo?.scheme_type},
      {label: 'Plan', value: fundInfo?.scheme_plan},
      {label: 'Option', value: fundInfo?.scheme_option},
      {label: 'Benchmark', value: fundInfo?.benchmark},
      {label: 'AUM', value: fundInfo?.aum ? safeInr(fundInfo.aum) : null},
      {label: 'Expense ratio', value: fundInfo?.expense_ratio ? `${fundInfo.expense_ratio}%` : null},
      {label: 'Exit load', value: fundInfo?.exit_load},
      {label: 'Fund manager', value: fundInfo?.fund_manager},
    ].filter(r => r.value != null && String(r.value).trim() !== ''),
    [fundInfo],
  );

  useEffect(() => {
    if (!selectedMandate && mandates.length > 0) {
      setSelectedMandate(mandates[0]);
    }
  }, [mandates, selectedMandate]);

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
          appAlert('Watchlist', 'Added to watchlist');
        }
      } else {
        const res = await removeFromWishlist(fundInfo.scheme_code);
        if (res?.success) {
          setIsFav(false);
          appAlert('Watchlist', 'Removed from watchlist');
        }
      }
    } catch {
      appAlert('Error', 'Could not update watchlist');
    }
  }, [fundInfo, isFav]);

  const parseOrderAmount = useCallback(() => {
    const parsed = Number(String(orderAmount).replace(/[^0-9.]/g, ''));
    return Number.isFinite(parsed) ? Math.round(parsed) : 0;
  }, [orderAmount]);

  const onAddToCart = useCallback(() => {
    if (!fundInfo?.scheme_code) {
      appAlert('Error', 'Fund data not loaded');
      return;
    }
    const amount = Math.max(minOrderAmount, parseOrderAmount());
    if (orderType === 'SIP' && !selectedMandate && mandates.length > 0) {
      appAlert('Select mandate', 'Please choose a mandate for SIP.');
      return;
    }
    dispatch(
      addToCart({
        fund: fundInfo,
        amount,
        isSIP: orderType === 'SIP',
        sipFrequency: orderType === 'SIP' ? sipFrequency : undefined,
        sipDate: orderType === 'SIP' ? formatDDMMYYYY(sipDate) : undefined,
        sipDurationYears: orderType === 'SIP' ? sipDurationYears : undefined,
        mandateId: orderType === 'SIP' ? selectedMandate?.id ?? selectedMandate?.mandate_id : undefined,
        mandateLabel: orderType === 'SIP' ? selectedMandateLabel : undefined,
        logo_url: logoUrl,
      }),
    );
    appAlert('Cart', `${displayName} added to cart`);
  }, [
    dispatch,
    displayName,
    fundInfo,
    logoUrl,
    mandates.length,
    minOrderAmount,
    orderType,
    parseOrderAmount,
    selectedMandate,
    selectedMandateLabel,
    sipDate,
    sipDurationYears,
    sipFrequency,
  ]);

  const onPlaceOrder = useCallback(async () => {
    if (!fundInfo?.scheme_code) {
      appAlert('Order', 'Fund details not available.');
      return;
    }
    const amount = Math.max(minOrderAmount, parseOrderAmount());
    if (orderType === 'SIP' && !selectedMandate && mandates.length > 0) {
      appAlert('Select mandate', 'Please choose a mandate for SIP.');
      return;
    }
    try {
      setPlacingOrder(true);
      const payload = {
        ...buildOrderPlacePayload({
          schemeCode: fundInfo.scheme_code,
          amount,
          isSip: orderType === 'SIP',
          sipFrequency,
          sipDate: formatDDMMYYYY(sipDate),
          sipDurationYears: Number(sipDurationYears),
          mandateId: selectedMandate?.id ?? selectedMandate?.mandate_id,
        }),
      };
      const res = await createSingleOrder(payload);
      const orderId = extractOrderId(res?.data);
      const directAuthUrl = extractOrderAuthUrl(res?.data);
      if (directAuthUrl) {
        setPendingGatewayUrl(directAuthUrl);
      }
      if (orderId) {
        setPendingOrderId(orderId);
        setPendingOrderAmount(amount);
        setReadyForPayment(false);
        appAlert('Order placed', 'Please tap "Authenticate & Continue" to complete payment.');
      } else {
        const fallbackAuthUrl = extractOrderAuthUrl(res?.data);
        if (fallbackAuthUrl) {
          navigation.navigate('MandateAuthWebview', {
            uri: fallbackAuthUrl,
            title: 'Authenticate order',
          });
        } else {
          appAlert(
            'Order placed',
            'Your order is submitted. You can track it in My Orders.',
            [
              {text: 'My Orders', onPress: () => navigation.navigate('MyOrders')},
              {text: 'OK'},
            ],
          );
        }
      }
    } catch (e) {
      appAlert('Order failed', String(e?.message || 'Could not place order.'));
    } finally {
      setPlacingOrder(false);
    }
  }, [
    fundInfo,
    minOrderAmount,
    parseOrderAmount,
    orderType,
    selectedMandate,
    mandates.length,
    sipFrequency,
    sipDate,
    sipDurationYears,
    navigation,
  ]);

  const onAuthenticateAndContinue = useCallback(async () => {
    if (pendingGatewayUrl) {
      navigation.navigate('MandateAuthWebview', {
        uri: pendingGatewayUrl,
        title: 'Authenticate order',
      });
      return;
    }
    if (!pendingOrderId) {
      return;
    }
    try {
      setAuthLoading(true);
      const res = await authenticateOrder(pendingOrderId);
      const authStateRaw =
        res?.data?.data?.status ??
        res?.data?.data?.response_data?.status ??
        res?.data?.message;
      if (isAuthenticatedOrderState(authStateRaw)) {
        setReadyForPayment(true);
      }
      const authUrl = extractOrderAuthUrl(res?.data);
      if (authUrl) {
        setPendingGatewayUrl(authUrl);
        navigation.navigate('MandateAuthWebview', {
          uri: authUrl,
          title: 'Authenticate order',
        });
      } else {
        appAlert('Authenticate', 'Could not get payment gateway URL.');
      }
    } catch (e) {
      const msg = String(e?.message || '');
      if (msg.toLowerCase().includes('already in authenticated status') && pendingGatewayUrl) {
        setReadyForPayment(true);
        navigation.navigate('MandateAuthWebview', {
          uri: pendingGatewayUrl,
          title: 'Authenticate order',
        });
        return;
      }
      if (msg.toLowerCase().includes('already in authenticated status')) {
        setReadyForPayment(true);
        return;
      }
      appAlert('Authenticate failed', msg || 'Could not start authentication.');
    } finally {
      setAuthLoading(false);
    }
  }, [navigation, pendingGatewayUrl, pendingOrderId]);

  const onPayNow = useCallback(async () => {
    const orderNumber = pendingOrderId;
    const totalAmount = Number(pendingOrderAmount ?? parseOrderAmount() ?? 0);
    const clientCode = user?.client_code ?? user?.ucc_code ?? user?.ucc;
    if (!orderNumber || !clientCode || !totalAmount) {
      appAlert('Pay now', 'Payment details are incomplete.');
      return;
    }
    try {
      setPaymentLoading(true);
      const res = await processOrderPayment({
        clientCode,
        modeOfPayment: 'DIRECT',
        orderNumber,
        totalAmount,
      });
      const paymentUrl = extractOrderAuthUrl(res?.data);
      if (paymentUrl) {
        navigation.navigate('MandateAuthWebview', {
          uri: paymentUrl,
          title: 'Complete payment',
        });
      } else {
        appAlert('Pay now', 'Payment gateway URL not found.');
      }
    } catch (e) {
      appAlert('Payment failed', String(e?.message || 'Could not start payment.'));
    } finally {
      setPaymentLoading(false);
    }
  }, [navigation, parseOrderAmount, pendingOrderAmount, pendingOrderId, user]);

  const openCart = useCallback(() => {
    navigateToCart(navigation);
  }, [navigation]);

  const onTapQuickAmount = useCallback(v => {
    setOrderAmount(String(v));
  }, []);

  const onConfirmSipDate = useCallback(date => {
    setSipDate(date);
    setShowSipDatePicker(false);
  }, []);

  const onCancelSipDate = useCallback(() => {
    setShowSipDatePicker(false);
  }, []);

  const openSipDatePicker = useCallback(() => {
    setShowSipDatePicker(true);
  }, []);

  const onPressInvestment = useCallback(() => {
    navigateToInvestment(navigation, {
      schemeCode: fundInfo?.scheme_code ?? schemeCode,
      schemeName: displayName,
      initialOrderType: orderType,
    });
  }, [displayName, fundInfo?.scheme_code, navigation, orderType, schemeCode]);

  const header = useMemo(
    () => (
      <View style={styles.topBar}>
        <AppBackButton onPress={() => navigation.goBack()} hitSlop={12} />
        <View style={styles.topActions}>
          <TouchableOpacity onPress={onWishlist} hitSlop={12} style={styles.bookmarkHit}>
            <Image
              source={isFav ? Icons.BookmarkFilled : Icons.BookmarkOutline}
              style={styles.bookmarkIcon}
              resizeMode="contain"
            />
          </TouchableOpacity>
          <TouchableOpacity onPress={openCart} style={[styles.cartWrap, styles.cartBtn]} hitSlop={12}>
            <Image source={Icons.CartIcon} style={styles.cartIconImg} resizeMode="contain" />
            {cartCount > 0 ? (
              <View style={styles.badge}>
                <Text style={styles.badgeTxt}>{cartCount > 99 ? '99+' : cartCount}</Text>
              </View>
            ) : null}
          </TouchableOpacity>
        </View>
      </View>
    ),
    [navigation, onWishlist, openCart, isFav, cartCount, styles],
  );

  if (!schemeCode) {
    return (
      <SafeAreaView style={[styles.safe, {backgroundColor: colors.background}]}>
        {header}
        <Text style={styles.err}>Missing scheme code</Text>
      </SafeAreaView>
    );
  }

  if (loading && !folioData) {
    return (
      <SafeAreaView style={[styles.safe, {backgroundColor: colors.background}]}>
        {header}
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingTxt}>Loading fund…</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error || !fundInfo?.scheme_code) {
    return (
      <SafeAreaView style={[styles.safe, {backgroundColor: colors.background}]}>
        {header}
        <View style={styles.center}>
          <Text style={styles.err}>{error || 'Could not load fund'}</Text>
          <TouchableOpacity onPress={() => refetchFund()} style={styles.retry}>
            <Text style={styles.retryTxt}>Retry</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.safe, {backgroundColor: colors.background}]} edges={['top', 'left', 'right']}>
      {header}
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        nestedScrollEnabled
        keyboardShouldPersistTaps="handled"
        scrollEventThrottle={16}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }>
        <View style={styles.card}>
          <View style={styles.titleRow}>
            {logoUrl ? (
              <Image source={{uri: logoUrl}} style={styles.logo} resizeMode="contain" />
            ) : (
              <View style={[styles.logo, styles.logoPh]}>
                <Text style={styles.logoL}>{displayName[0]}</Text>
              </View>
            )}
            <Text style={[Textstyles.heading, styles.title]} numberOfLines={3}>
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
              <Text style={[Textstyles.medium, styles.cellVal]}>
                {fundInfo.nav != null ? Number(fundInfo.nav).toFixed(2) : '—'}
              </Text>
            </View>
            <View style={styles.cell}>
              <Text style={styles.cellLabel}>Rating</Text>
              <Text style={[Textstyles.medium, styles.cellVal]}>
                {fundInfo?.holdings?.groww_rating ?? '—'}
              </Text>
            </View>
            <View style={styles.cell}>
              <Text style={styles.cellLabel}>Min SIP</Text>
              <Text style={[Textstyles.medium, styles.cellVal]}>
                {rawMinSipDisplay != null ? safeInr(rawMinSipDisplay) : '—'}
              </Text>
            </View>
            <View style={styles.cell}>
              <Text style={styles.cellLabel}>Min purchase</Text>
              <Text style={[Textstyles.medium, styles.cellVal]}>{safeInr(fundInfo.min_purchase_amount)}</Text>
            </View>
          </View>
        </View>

        <View style={styles.card}>
          <Text style={[Textstyles.heading, styles.sectionTitle]}>Return calculator</Text>
          <Text style={[Textstyles.medium, styles.calcAmt]}>₹{sliderAmount.toLocaleString('en-IN')}</Text>
          <ReturnAmountSlider
            style={styles.sliderWrap}
            minimumValue={1000}
            maximumValue={200000}
            step={500}
            value={sliderAmount}
            onValueChange={onSliderValueChange}
            onSlidingComplete={onSliderComplete}
            minimumTrackTintColor={colors.primary}
            maximumTrackTintColor={Colors.LIGHT_GREY}
            thumbTintColor={colors.primary}
          />
          <Text style={[Textstyles.medium, styles.tableHead]}>Over the past</Text>
          {tableLoading ? (
            <ActivityIndicator style={{marginVertical: 16}} color={colors.primary} />
          ) : returnRows.length === 0 ? (
            <Text style={styles.emptyStateText}>Not enough history to calculate returns right now.</Text>
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
            <Text style={[Textstyles.heading, styles.sectionTitle]}>Holdings</Text>

            <View style={styles.innerTableCard}>
              <View style={styles.hTableHeadRow}>
                <Text style={[styles.hTableHeadCell, styles.hCellName, {flex: 2.2}]}>Name</Text>
                <Text style={[styles.hTableHeadCell, {flex: 1}]}>Sector</Text>
                <Text style={[styles.hTableHeadCell, {flex: 1}]}>Instrument</Text>
                <Text style={[styles.hTableHeadCell, {flex: 0.9, textAlign: 'right'}]}>Assets</Text>
              </View>

              <ScrollView style={styles.holdingsScroll} nestedScrollEnabled showsVerticalScrollIndicator={false}>
                {holdingsList.map((h, idx) => (
                  <View key={idx} style={styles.hTableRow}>
                    <Text style={[styles.hCellName, {flex: 2.2}]} numberOfLines={2}>
                      {h.company_name || '—'}
                    </Text>
                    <Text style={[styles.hCellCenter, {flex: 1}]} numberOfLines={2}>
                      {h.sector_name || '—'}
                    </Text>
                    <Text style={[styles.hCellCenter, {flex: 1}]} numberOfLines={2}>
                      {h.instrument_name || '—'}
                    </Text>
                    <Text style={[styles.hCellRight, {flex: 0.9}]} numberOfLines={2}>
                      {h.corpus_per != null && !Number.isNaN(Number(h.corpus_per))
                        ? `${Number(h.corpus_per).toFixed(2)}%`
                        : '—'}
                    </Text>
                  </View>
                ))}
              </ScrollView>
            </View>
          </View>
        ) : null}

        {Array.isArray(statsList) && statsList.length > 0 ? (
          <View style={styles.card}>
            <Text style={[Textstyles.heading, styles.sectionTitle]}>Returns and rankings</Text>

            <View style={styles.innerTableCard}>
              <View style={styles.returnsHeadRow}>
                <Text style={[styles.hTableHeadCell, {flex: 2.2}]}>Name</Text>
                <Text style={[styles.hTableHeadCell, styles.hCellCenter, {flex: 1}]}>1Y</Text>
                <Text style={[styles.hTableHeadCell, styles.hCellCenter, {flex: 1}]}>3Y</Text>
                <Text style={[styles.hTableHeadCell, styles.hCellCenter, {flex: 1}]}>5Y</Text>
                <Text style={[styles.hTableHeadCell, styles.hCellCenter, {flex: 1}]}>All</Text>
              </View>

              <ScrollView style={styles.returnsScroll} nestedScrollEnabled showsVerticalScrollIndicator={false}>
                {statsList.map((stat, idx) => (
                  <View key={idx} style={styles.returnsRow}>
                    <Text style={[styles.returnsNameCell, {flex: 2.2}]} numberOfLines={2}>
                      {stat?.title || '—'}
                    </Text>
                    <Text style={[styles.returnsValCell, styles.hCellCenter, {flex: 1}]}>
                      {stat?.stat_1y != null && !Number.isNaN(Number(stat?.stat_1y))
                        ? Number(stat?.stat_1y).toFixed(2)
                        : '—'}
                    </Text>
                    <Text style={[styles.returnsValCell, styles.hCellCenter, {flex: 1}]}>
                      {stat?.stat_3y != null && !Number.isNaN(Number(stat?.stat_3y))
                        ? Number(stat?.stat_3y).toFixed(2)
                        : '—'}
                    </Text>
                    <Text style={[styles.returnsValCell, styles.hCellCenter, {flex: 1}]}>
                      {stat?.stat_5y != null && !Number.isNaN(Number(stat?.stat_5y))
                        ? Number(stat?.stat_5y).toFixed(2)
                        : '—'}
                    </Text>
                    <Text style={[styles.returnsValCell, styles.hCellCenter, {flex: 1}]}>
                      {stat?.stat_all != null && !Number.isNaN(Number(stat?.stat_all))
                        ? Number(stat?.stat_all).toFixed(2)
                        : '—'}
                    </Text>
                  </View>
                ))}
              </ScrollView>
            </View>
          </View>
        ) : null}

        {holdingAnalysisSections.length > 0 ? (
          <View style={styles.card}>
            <Text style={[Textstyles.heading, styles.sectionTitle]}>Holding Analysis</Text>
            {holdingAnalysisSections.map(section => (
              <HoldingAnalysisBlock
                key={section.key}
                title={section.title}
                dataMap={section.dataMap}
                styles={styles}
              />
            ))}
          </View>
        ) : null}

        {returnStats != null || (topHoldingsStats?.top5 ?? 0) > 0 || (topHoldingsStats?.top10 ?? 0) > 0 ? (
          <View style={styles.card}>
            <Text style={[Textstyles.heading, styles.sectionTitle]}>Advanced Ratios</Text>
            <View style={styles.kvWrap}>
              <View style={styles.kvRow}>
                <Text style={styles.kvLabel}>Top 5</Text>
                <Text style={styles.kvValue}>{topHoldingsStats?.top5 ? `${topHoldingsStats.top5.toFixed(2)}%` : '—'}</Text>
              </View>
              <View style={styles.kvRow}>
                <Text style={styles.kvLabel}>Top 10</Text>
                <Text style={styles.kvValue}>{topHoldingsStats?.top10 ? `${topHoldingsStats.top10.toFixed(2)}%` : '—'}</Text>
              </View>
              <View style={styles.kvRow}>
                <Text style={styles.kvLabel}>P/E Ratio</Text>
                <Text style={styles.kvValue}>—</Text>
              </View>
              <View style={styles.kvRow}>
                <Text style={styles.kvLabel}>P/B Ratio</Text>
                <Text style={styles.kvValue}>—</Text>
              </View>
              <View style={styles.kvRow}>
                <Text style={styles.kvLabel}>Alpha</Text>
                <Text style={styles.kvValue}>{returnStats?.alpha != null ? `${Number(returnStats.alpha).toFixed(2)}%` : '—'}</Text>
              </View>
              <View style={styles.kvRow}>
                <Text style={styles.kvLabel}>Beta</Text>
                <Text style={styles.kvValue}>{returnStats?.beta != null ? `${Number(returnStats.beta).toFixed(2)}` : '—'}</Text>
              </View>
              <View style={styles.kvRow}>
                <Text style={styles.kvLabel}>Sharpe</Text>
                <Text style={styles.kvValue}>{returnStats?.sharpe_ratio != null ? `${Number(returnStats.sharpe_ratio).toFixed(2)}` : '—'}</Text>
              </View>
              <View style={styles.kvRow}>
                <Text style={styles.kvLabel}>Sortino</Text>
                <Text style={styles.kvValue}>{returnStats?.sortino_ratio != null ? `${Number(returnStats.sortino_ratio).toFixed(2)}` : '—'}</Text>
              </View>
            </View>
          </View>
        ) : null}

        {(minInvestmentValues?.min1 ||
          minInvestmentValues?.minSip != null ||
          minInvestmentValues?.maxSip != null ||
          minInvestmentValues?.minAdditional) ? (
          <View style={styles.card}>
            <Text style={[Textstyles.heading, styles.sectionTitle]}>Minimum Investment Amounts</Text>
            <View style={styles.kvWrap}>
              <View style={styles.kvRow}>
                <Text style={styles.kvLabel}>Min. for 1st Investment</Text>
                <Text style={styles.kvValue}>{minInvestmentValues.min1 != null ? safeInr(minInvestmentValues.min1) : '—'}</Text>
              </View>
              <View style={styles.kvRow}>
                <Text style={styles.kvLabel}>Min. for SIP</Text>
                <Text style={styles.kvValue}>{minInvestmentValues.minSip != null ? safeInr(minInvestmentValues.minSip) : '—'}</Text>
              </View>
              {minInvestmentValues.maxSip != null ? (
                <View style={styles.kvRow}>
                  <Text style={styles.kvLabel}>Max. for SIP</Text>
                  <Text style={styles.kvValue}>{safeInr(minInvestmentValues.maxSip)}</Text>
                </View>
              ) : null}
              <View style={styles.kvRow}>
                <Text style={styles.kvLabel}>Min. for 2nd Investment onwards</Text>
                <Text style={styles.kvValue}>{minInvestmentValues.minAdditional != null ? safeInr(minInvestmentValues.minAdditional) : '—'}</Text>
              </View>
            </View>
          </View>
        ) : null}

        {fundDetailsRows.length > 0 ? (
          <View style={styles.card}>
            <Text style={[Textstyles.heading, styles.sectionTitle]}>More fund details</Text>
            {fundDetailsRows.map((row, idx) => (
              <View key={row.label} style={[styles.detailRow, idx > 0 && styles.detailRowBorder]}>
                <Text style={styles.detailLabel}>{row.label}</Text>
                <Text style={styles.detailValue}>{String(row.value)}</Text>
              </View>
            ))}
          </View>
        ) : null}

        {false ? (
        <View style={[styles.card, styles.orderCard]}>
          {pendingOrderId ? (
            <View style={styles.authSummaryWrap}>
              <Text style={styles.authSummaryLabel}>Order Amount</Text>
              <Text style={styles.authSummaryAmount}>{safeInr(pendingOrderAmount ?? minOrderAmount)}</Text>
              <TouchableOpacity style={styles.authContinueBtn} onPress={onAuthenticateAndContinue} activeOpacity={0.9} disabled={authLoading}>
                <Text style={styles.authContinueTxt}>
                  {authLoading ? 'Authenticating...' : 'Authenticate & Continue'}
                </Text>
              </TouchableOpacity>
              {readyForPayment ? (
                <TouchableOpacity style={styles.payNowPrimaryBtn} onPress={onPayNow} activeOpacity={0.9} disabled={paymentLoading}>
                  <Text style={styles.payNowPrimaryTxt}>{paymentLoading ? 'Starting payment...' : 'Pay Now'}</Text>
                </TouchableOpacity>
              ) : null}
            </View>
          ) : (
            <>
              <View style={styles.orderTabs}>
            <TouchableOpacity
              style={[styles.orderTabBtn, orderType === 'ONE_TIME' && styles.orderTabBtnActive]}
              activeOpacity={0.85}
              onPress={() => setOrderType('ONE_TIME')}>
              <Text style={[styles.orderTabTxt, orderType === 'ONE_TIME' && styles.orderTabTxtActive]}>One-time</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.orderTabBtn, orderType === 'SIP' && styles.orderTabBtnActive]}
              activeOpacity={0.85}
              onPress={() => setOrderType('SIP')}>
              <Text style={[styles.orderTabTxt, orderType === 'SIP' && styles.orderTabTxtActive]}>SIP</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.amountInputWrap}>
            <Text style={styles.amountCurrency}>₹</Text>
            <TextInput
              style={styles.amountInput}
              value={orderAmount}
              onChangeText={t => setOrderAmount(t.replace(/[^0-9]/g, ''))}
              keyboardType="number-pad"
              placeholder={String(minOrderAmount)}
              placeholderTextColor={Colors.GREY}
            />
          </View>

          <View style={styles.quickAmountRow}>
            {[500, 1000, 2000].map(v => (
              <TouchableOpacity key={v} style={styles.quickAmountChip} onPress={() => onTapQuickAmount(v)} activeOpacity={0.85}>
                <Text style={styles.quickAmountChipTxt}>₹{v}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {orderType === 'SIP' ? (
            <>
              <View style={styles.sipFieldsRow}>
                <View style={styles.sipFieldCol}>
                  <Text style={styles.sipFieldLabel}>SIP frequency</Text>
                  <View style={styles.sipOptionRow}>
                    {['Monthly', 'Quarterly'].map(freq => (
                      <TouchableOpacity
                        key={freq}
                        style={[styles.inlineChip, sipFrequency === freq && styles.inlineChipOn]}
                        onPress={() => setSipFrequency(freq)}
                        activeOpacity={0.85}>
                        <Text style={[styles.inlineChipTxt, sipFrequency === freq && styles.inlineChipTxtOn]}>{freq}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              </View>

              <View style={styles.sipFieldsRow}>
                <View style={styles.sipFieldCol}>
                  <Text style={styles.sipFieldLabel}>SIP date</Text>
                  <TouchableOpacity
                    style={styles.sipPickerField}
                    activeOpacity={0.85}
                    onPress={openSipDatePicker}>
                    <Text style={styles.sipPickerValue}>{formatDDMMYYYY(sipDate)}</Text>
                    <Text style={styles.sipPickerArrow}>⌄</Text>
                  </TouchableOpacity>
                </View>

                <View style={styles.sipFieldCol}>
                  <Text style={styles.sipFieldLabel}>SIP Duration (Years)</Text>
                  <View style={styles.sipOptionRow}>
                    {['1', '3', '5'].map(y => (
                      <TouchableOpacity
                        key={y}
                        style={[styles.inlineChip, sipDurationYears === y && styles.inlineChipOn]}
                        onPress={() => setSipDurationYears(y)}
                        activeOpacity={0.85}>
                        <Text style={[styles.inlineChipTxt, sipDurationYears === y && styles.inlineChipTxtOn]}>{y}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              </View>

              <TouchableOpacity
                style={styles.mandateSelectCard}
                activeOpacity={0.85}
                onPress={() => {
                  if (__DEV__) {
                    console.log('[FundDetail] Choose Mandate Method pressed (no API here)', {
                      mandateLoading,
                      mandatesCount: mandates.length,
                    });
                  }
                  setMandateModalVisible(true);
                }}>
                <View style={{flex: 1}}>
                  <Text style={styles.mandateTitle}>Choose Mandate Method</Text>
                  <Text style={styles.mandateSub} numberOfLines={2}>{selectedMandateLabel}</Text>
                </View>
                <Text style={styles.mandateArrow}>›</Text>
              </TouchableOpacity>
            </>
          ) : null}

          <Text style={styles.minAmtHint}>Min amount: {safeInr(minOrderAmount)}</Text>

            <View style={styles.orderActions}>
              <TouchableOpacity style={styles.addedToCartBtn} onPress={onAddToCart} activeOpacity={0.9}>
                <Text style={styles.addedToCartTxt}>Added to Cart</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.buyNowBtn} onPress={onPlaceOrder} activeOpacity={0.9} disabled={placingOrder}>
                <Text style={styles.buyNowTxt}>
                  {placingOrder ? 'Placing order...' : orderType === 'SIP' ? 'Start SIP' : 'Buy Now'}
                </Text>
              </TouchableOpacity>
            </View>
            </>
          )}
        </View>
        ) : null}

        <TouchableOpacity style={styles.viewCart} onPress={openCart} activeOpacity={0.85}>
          <Text style={[Textstyles.medium, styles.viewCartTxt]}>View cart →</Text>
        </TouchableOpacity>

        <AppModal
          visible={mandateModalVisible}
          onClose={() => setMandateModalVisible(false)}
          title="Select mandate"
          isBottomSheet
          maxHeight={'72%'}>
          {mandateLoading ? <ActivityIndicator color={colors.primary} style={styles.modalLoader} /> : null}
          {!mandateLoading && mandates.length === 0 ? (
            <Text style={styles.modalEmpty}>No mandate found. Please add mandate from Mandate screen.</Text>
          ) : null}
          {!mandateLoading &&
            mandates.map((m, idx) => {
              const active = (selectedMandate?.id ?? selectedMandate?.mandate_id) === (m?.id ?? m?.mandate_id);
              return (
                <TouchableOpacity
                  key={String(m?.id ?? m?.mandate_id ?? idx)}
                  style={[styles.modalRow, active && styles.modalRowActive]}
                  onPress={() => {
                    setSelectedMandate(m);
                    setMandateModalVisible(false);
                  }}
                  activeOpacity={0.9}>
                  <Text style={[styles.modalRowTxt, active && styles.modalRowTxtActive]}>{pickMandateLabel(m)}</Text>
                </TouchableOpacity>
              );
            })}
        </AppModal>

        {showSipDatePicker ? (
          <DatePicker
            modal
            open={showSipDatePicker}
            date={sipDate}
            mode="date"
            minimumDate={new Date()}
            onConfirm={onConfirmSipDate}
            onCancel={onCancelSipDate}
          />
        ) : null}

        <View style={{height: 20}} />
      </ScrollView>
      <View style={styles.stickyInvestWrap}>
        <TouchableOpacity style={styles.stickyInvestBtn} onPress={onPressInvestment} activeOpacity={0.9}>
          <Text style={[styles.stickyInvestTxt, Textstyles.medium]}>Continue to Invest</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const w = Dimensions.get('window').width;

function getFundDetailStyles(colors, isDark) {
  const c = colors;
  return StyleSheet.create({
  safe: {flex: 1, backgroundColor: c.background},
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 8,
    minHeight: 44,
    backgroundColor: c.card,
    borderBottomWidth: 1,
    borderBottomColor: c.border,
  },
  topActions: {flexDirection: 'row', alignItems: 'center'},
  cartBtn: {marginLeft: 12},
  bookmarkHit: {width: 34, height: 34, alignItems: 'center', justifyContent: 'center'},
  bookmarkIcon: {width: 22, height: 22, tintColor: c.primary},
  cartIconImg: {width: 22, height: 22, tintColor: isDark ? '#FFFFFF' : '#000000'},
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
  badgeTxt: {...Textstyles.medium, color: '#fff', fontSize: 10, fontWeight: '500'},
  scroll: {paddingBottom: 110},
  card: {
    backgroundColor: c.card,
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: c.border,
  },
  titleRow: {flexDirection: 'row', alignItems: 'flex-start'},
  logo: {width: 48, height: 48, borderRadius: 8, marginRight: 12},
  logoPh: {
    backgroundColor: (isDark ? '#2C2C2C' : '#F3F4F6'),
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: c.border,
  },
  logoL: {...Textstyles.medium, fontSize: typeScale.bodyLg, fontWeight: '500', color: c.primary},
  title: {...Textstyles.medium, flex: 1, fontSize: typeScale.bodyMd, color: c.textPrimary, lineHeight: 22},
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
  tagTxt: {...Textstyles.normal, fontSize: 12, color: '#1E81F2'},
  grid2: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -8,
  },
  cell: {width: w > 400 ? '50%' : '100%', paddingHorizontal: 8, marginBottom: 16},
  cellLabel: {...Textstyles.normal, fontSize: 13, color: c.textSecondary, marginBottom: 4},
  cellVal: {...Textstyles.medium, fontSize: typeScale.bodyMd, color: c.textPrimary},
  sectionTitle: {...Textstyles.heading, fontSize: typeScale.bodyMd, marginBottom: 10, color: c.textPrimary},
  calcAmt: {...Textstyles.heading, fontSize: typeScale.title, color: c.textPrimary, marginBottom: 8},
  sliderWrap: {
    width: '100%',
    marginBottom: 8,
    zIndex: 2,
  },
  tableHead: {...Textstyles.medium, fontSize: 15, color: c.textSecondary, marginBottom: 8, marginTop: 8},
  tableRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingVertical: 10,
    gap: 4,
  },
  tableRowBorder: {borderTopWidth: 1, borderTopColor: c.border},
  tCell: {...Textstyles.normal, fontSize: 12, color: c.textPrimary, width: '23%', minWidth: 70},
  tRight: {textAlign: 'right', flex: 1},
  pos: {color: '#16a34a'},
  neg: {color: '#dc2626'},
  emptyStateText: {...Textstyles.normal, fontSize: 13, color: c.textSecondary, marginTop: 4, marginBottom: 8},
  holdingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: c.border,
  },
  holdingsScroll: {
    maxHeight: 420,
  },
  innerTableCard: {
    borderWidth: 1,
    borderColor: c.border,
    borderRadius: 10,
    overflow: 'hidden',
    backgroundColor: c.card,
  },
  hTableHeadRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 12,
    backgroundColor: isDark ? '#252525' : '#F9FAFB',
    borderBottomWidth: 1,
    borderBottomColor: c.border,
  },
  hTableHeadCell: {...Textstyles.medium, fontSize: 13, color: c.textSecondary, fontWeight: '600'},
  hCellName: {
    ...Textstyles.medium,
    fontSize: 13,
    color: c.textPrimary,
    fontWeight: '600',
    flexShrink: 1,
    minWidth: 0,
  },
  hCellCenter: {
    ...Textstyles.medium,
    fontSize: 13,
    color: c.textPrimary,
    textAlign: 'center',
    fontWeight: '600',
    flexShrink: 1,
    minWidth: 0,
  },
  hCellRight: {
    ...Textstyles.medium,
    fontSize: 13,
    color: c.textPrimary,
    textAlign: 'right',
    fontWeight: '600',
    flexShrink: 1,
    minWidth: 0,
  },
  hTableRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: c.border,
  },
  returnsHeadRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 12,
    backgroundColor: isDark ? '#252525' : '#F9FAFB',
    borderBottomWidth: 1,
    borderBottomColor: c.border,
  },
  returnsScroll: {
    maxHeight: 420,
  },
  returnsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: c.border,
  },
  returnsNameCell: {...Textstyles.heading, fontSize: 13, color: c.textPrimary, fontWeight: '700'},
  returnsValCell: {...Textstyles.heading, fontSize: 13, color: c.textPrimary, fontWeight: '700'},
  kvWrap: {
    borderWidth: 1,
    borderColor: c.border,
    borderRadius: 10,
    overflow: 'hidden',
  },
  kvRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: c.border,
  },
  kvLabel: {
    flex: 1,
    color: '#6B7280',
    fontSize: typeScale.body,
    paddingRight: 10,
  },
  kvValue: {
    color: c.textPrimary,
    fontSize: typeScale.bodyMd,
    ...Textstyles.heading,
    fontWeight: '700',
  },
  analysisBlock: {
    marginTop: 4,
    marginBottom: 18,
  },
  analysisTitle: {
    fontSize: typeScale.title,
    color: c.textPrimary,
    ...Textstyles.heading,
    fontWeight: '700',
    marginBottom: 10,
  },
  analysisRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  analysisLegendWrap: {
    flex: 1,
    paddingRight: 12,
  },
  analysisLegendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  analysisLegendItemOn: {
    borderLeftWidth: 3,
    borderLeftColor: c.primary,
    paddingLeft: 8,
    marginLeft: -4,
    backgroundColor: isDark ? 'rgba(96,165,250,0.1)' : '#EFF6FF',
  },
  analysisSelectionHint: {
    marginTop: 8,
    fontSize: 13,
    color: c.textPrimary,
    ...Textstyles.medium,
  },
  analysisSelectionHintMuted: {
    marginTop: 8,
    fontSize: 12,
    color: c.textSecondary,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 8,
  },
  analysisLegendText: {
    flex: 1,
    color: '#4B5563',
    fontSize: 15,
    textTransform: 'capitalize',
  },
  analysisLegendValue: {
    color: c.textPrimary,
    ...Textstyles.heading,
    fontWeight: '700',
  },
  analysisChartWrap: {
    width: 180,
    height: 180,
  },
  analysisWebView: {
    width: '100%',
    height: '100%',
    backgroundColor: 'transparent',
  },
  hName: {flex: 1, fontSize: 14, paddingRight: 8},
  hPct: {fontSize: 14, fontWeight: '600', color: c.textPrimary},
  detailRow: {paddingVertical: 10},
  detailRowBorder: {borderTopWidth: 1, borderTopColor: c.border},
  detailLabel: {fontSize: 13, color: c.textSecondary, marginBottom: 4},
  detailValue: {fontSize: 14, color: c.textPrimary},
  orderCard: {padding: 0, overflow: 'hidden'},
  orderTabs: {
    flexDirection: 'row',
    borderRadius: 40,
    backgroundColor: isDark ? '#2C2C2C' : '#E8EAED',
    padding: 4,
    marginBottom: 4,
    overflow: 'hidden',
  },
  orderTabBtn: {flex: 1, alignItems: 'center', paddingVertical: 14, borderRadius: 40},
  orderTabBtnActive: {backgroundColor: isDark ? 'rgba(96,165,250,0.15)' : '#E3F0FF'},
  orderTabTxt: {fontSize: typeScale.bodyMd, color: c.textSecondary, fontWeight: '500'},
  orderTabTxtActive: {color: c.primary},
  amountInputWrap: {
    marginHorizontal: 14,
    marginTop: 14,
    borderWidth: 1,
    borderColor: c.border,
    borderRadius: 12,
    minHeight: 56,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    backgroundColor: c.inputBg,
  },
  amountCurrency: {fontSize: typeScale.amountCurrency, color: c.textSecondary, marginRight: 12},
  amountInput: {flex: 1, fontSize: typeScale.amountInput, color: c.textPrimary, paddingVertical: 0},
  quickAmountRow: {flexDirection: 'row', justifyContent: 'space-around', marginTop: 14, marginHorizontal: 14},
  quickAmountChip: {
    borderWidth: 1,
    borderColor: c.primary,
    borderRadius: 10,
    paddingVertical: 10,
    minWidth: 86,
    alignItems: 'center',
  },
  quickAmountChipTxt: {fontSize: typeScale.body, color: c.primary, fontWeight: '500'},
  sipFieldsRow: {marginHorizontal: 14, marginTop: 14},
  sipFieldCol: {flex: 1},
  sipFieldLabel: {fontSize: 14, color: c.textSecondary, marginBottom: 8},
  sipOptionRow: {flexDirection: 'row', gap: 8},
  inlineChip: {
    borderWidth: 1,
    borderColor: c.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: c.inputBg,
  },
  inlineChipOn: {backgroundColor: isDark ? 'rgba(96,165,250,0.12)' : '#EAF4FF', borderColor: c.primary},
  inlineChipTxt: {fontSize: 14, color: c.textPrimary, fontWeight: '600'},
  inlineChipTxtOn: {color: c.primary},
  sipPickerField: {
    borderWidth: 1,
    borderColor: c.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: c.inputBg,
  },
  sipPickerValue: {fontSize: typeScale.bodyMd, color: c.textPrimary},
  sipPickerArrow: {fontSize: typeScale.bodyMd, color: c.textSecondary},
  mandateSelectCard: {
    marginHorizontal: 14,
    marginTop: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: c.border,
    minHeight: 78,
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  mandateTitle: {fontSize: typeScale.bodyMd, color: c.textPrimary, fontWeight: '700'},
  mandateSub: {fontSize: 14, color: c.textSecondary, marginTop: 4},
  mandateArrow: {fontSize: typeScale.chevron + 4, color: c.textSecondary, marginLeft: 8},
  minAmtHint: {marginHorizontal: 14, marginTop: 12, color: c.textSecondary, fontSize: 13},
  orderActions: {flexDirection: 'row', gap: 10, marginHorizontal: 14, marginTop: 14, marginBottom: 14},
  addedToCartBtn: {
    flex: 1,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#A7F3D0',
    backgroundColor: '#F0FDF4',
    minHeight: 52,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addedToCartTxt: {fontSize: 16, color: '#34D399', fontWeight: '500'},
  buyNowBtn: {
    flex: 1,
    borderRadius: 12,
    backgroundColor: '#22C55E',
    minHeight: 52,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buyNowTxt: {fontSize: 16, color: '#FFFFFF', fontWeight: '500'},
  authContinueBtn: {
    flex: 1,
    borderRadius: 12,
    backgroundColor: c.primary,
    minHeight: 52,
    alignItems: 'center',
    justifyContent: 'center',
  },
  authContinueTxt: {fontSize: 16, color: '#FFFFFF', fontWeight: '500'},
  authSummaryWrap: {padding: 16},
  authSummaryLabel: {fontSize: 13, color: '#6B7280', marginBottom: 6},
  authSummaryAmount: {fontSize: typeScale.amountInput, color: c.textPrimary, fontWeight: '500', marginBottom: 16},
  payNowPrimaryBtn: {
    marginTop: 12,
    borderRadius: 12,
    backgroundColor: '#22C55E',
    minHeight: 52,
    alignItems: 'center',
    justifyContent: 'center',
  },
  payNowPrimaryTxt: {fontSize: 16, color: '#FFFFFF', fontWeight: '500'},
  viewCart: {marginHorizontal: 16, marginTop: 12, paddingVertical: 12, alignItems: 'center'},
  viewCartTxt: {color: c.primary, fontSize: 16},
  modalRoot: {flex: 1, justifyContent: 'flex-end'},
  modalDim: {...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.45)'},
  modalSheet: {
    backgroundColor: c.card,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    padding: 16,
    maxHeight: '70%',
  },
  modalTitle: {fontSize: 16, fontWeight: '700', color: c.textPrimary, marginBottom: 10},
  modalLoader: {marginVertical: 12},
  modalEmpty: {fontSize: 13, color: '#6B7280', marginVertical: 10},
  modalRow: {paddingVertical: 12, paddingHorizontal: 10, borderRadius: 10, marginBottom: 6},
  modalRowActive: {backgroundColor: '#EAF4FF'},
  modalRowTxt: {fontSize: 14, color: c.textPrimary},
  modalRowTxtActive: {color: c.primary, fontWeight: '500'},
  center: {flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24},
  loadingTxt: {marginTop: 12, color: c.textSecondary},
  err: {color: '#B91C1C', textAlign: 'center', padding: 16},
  retry: {marginTop: 12, padding: 12},
  retryTxt: {color: c.primary, fontWeight: '600'},
  stickyInvestWrap: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: 16,
    alignItems: 'center',
  },
  stickyInvestBtn: {
    width: '100%',
    minHeight: 52,
    borderRadius: 12,
    backgroundColor: '#21C76E',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 8,
    shadowOffset: {width: 0, height: 3},
    // elevation: 4,
  },
  stickyInvestTxt: {fontSize: typeScale.bodyLg, color: '#FFFFFF'},
});
}
