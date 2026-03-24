import React, {useCallback, useEffect, useMemo, useState} from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useNavigation, useRoute} from '@react-navigation/native';
import {useSelector} from 'react-redux';
import {navigateToFundDetail} from '../../navigation/navigationRef';
import {pickSchemeCode} from '../../utils/schemeCode';
import {Colors} from '../../utils/AppConstant';
import Textstyles from '../../utils/text';
import {extractOrderAuthUrl, fetchOrderStatus, processOrderPayment} from '../../services/ordersService';
import {
  pickOrderTitle,
  pickOrderAmountRaw,
  pickOrderStatus,
  pickOrderType,
  pickOrderDate,
  pickCompletedDate,
  pickNavDate,
  pickFolio,
  pickOrderIdDisplay,
  formatOrderTypeLabel,
  normalizeStatusKey,
  statusCategory,
} from './orderHelpers';

const PAGE_BG = '#F0F2F5';
const CARD_BORDER = '#E8E8E8';
const THEME_BLUE = '#1A73E8';

function formatInr(value) {
  if (value === null || value === undefined || value === '') {
    return '—';
  }
  const n = Number(value);
  if (Number.isNaN(n)) {
    return String(value);
  }
  return `₹${n.toLocaleString('en-IN', {minimumFractionDigits: 0, maximumFractionDigits: 2})}`;
}

function formatDateTime(raw) {
  if (!raw) {
    return '—';
  }
  try {
    const d = new Date(raw);
    if (Number.isNaN(d.getTime())) {
      return String(raw);
    }
    const dateStr = d.toLocaleDateString('en-IN', {day: '2-digit', month: 'short', year: 'numeric'});
    const timeStr = d.toLocaleTimeString('en-IN', {hour: '2-digit', minute: '2-digit', hour12: true});
    return `${dateStr}, ${timeStr}`;
  } catch {
    return String(raw);
  }
}

function formatDateOnly(raw) {
  if (!raw) {
    return '—';
  }
  try {
    const d = new Date(raw);
    if (Number.isNaN(d.getTime())) {
      return String(raw);
    }
    return d.toLocaleDateString('en-IN', {day: '2-digit', month: 'short', year: 'numeric'});
  } catch {
    return String(raw);
  }
}

const CONNECTOR_DOTS = 6;
const DOT_SIZE = 3;
const DOT_GAP = 5;
const LINE_GREEN = '#22C55E';
const LINE_GREY = '#D1D5DB';

/** Vertical dotted segment between steps; green when the step above is completed. */
function DottedConnector({completed}) {
  const color = completed ? LINE_GREEN : LINE_GREY;
  return (
    <View style={styles.dottedConnector}>
      {Array.from({length: CONNECTOR_DOTS}).map((_, i) => (
        <View
          key={i}
          style={[
            styles.dottedSeg,
            {backgroundColor: color},
            i === CONNECTOR_DOTS - 1 && styles.dottedSegLast,
          ]}
        />
      ))}
    </View>
  );
}

function buildTimelineSteps(order) {
  const raw = order?.order_timeline ?? order?.timeline ?? order?.status_history ?? order?.steps;
  if (Array.isArray(raw) && raw.length > 0) {
    return raw.map((s, i) => ({
      key: String(i),
      title: s.title ?? s.label ?? s.status ?? `Step ${i + 1}`,
      at: s.date ?? s.at ?? s.timestamp,
      done: s.completed !== false && s.done !== false && s.status !== 'pending',
    }));
  }
  const placed = pickOrderDate(order);
  const auth = order?.authenticated_at ?? order?.auth_date ?? order?.verified_at ?? placed;
  const done = pickCompletedDate(order);
  const cat = statusCategory(pickOrderStatus(order));
  const typeLabel = formatOrderTypeLabel(pickOrderType(order));
  const lastTitle =
    typeLabel === 'Redeem'
      ? 'Redeem Successful'
      : typeLabel === 'SIP'
        ? 'SIP Registered'
        : 'Order Complete';

  return [
    {key: '1', title: 'Order Placed', at: placed, done: !!placed},
    {key: '2', title: 'Order Authenticated', at: auth, done: cat !== 'failed' && !!auth},
    {key: '3', title: lastTitle, at: done, done: cat === 'success'},
  ];
}

export default function OrderDetailScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const user = useSelector(s => s.auth.user);
  const routeOrder = route.params?.order;
  const [resolvedOrder, setResolvedOrder] = useState(routeOrder || null);
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [statusLoading, setStatusLoading] = useState(false);
  const order = resolvedOrder || routeOrder;

  useEffect(() => {
    setResolvedOrder(routeOrder || null);
  }, [routeOrder]);

  const statusLookupId = routeOrder?.id ?? routeOrder?.order_id;

  useEffect(() => {
    if (!statusLookupId) {
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        setStatusLoading(true);
        const res = await fetchOrderStatus(statusLookupId);
        const root = res?.data?.data ?? res?.data ?? {};
        const detail = root?.order ?? root?.result ?? root;
        if (!cancelled && detail && typeof detail === 'object') {
          setResolvedOrder(prev => ({...(prev || {}), ...detail}));
          if (__DEV__) {
            console.log('[OrderDetail] status api merged', {
              statusLookupId,
              detail,
            });
          }
        }
      } catch (e) {
        if (__DEV__) {
          console.log('[OrderDetail] status api failed', {
            statusLookupId,
            error: e?.message || String(e),
          });
        }
      } finally {
        if (!cancelled) {
          setStatusLoading(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [statusLookupId]);

  const title = useMemo(() => pickOrderTitle(order || {}), [order]);
  const amount = useMemo(() => formatInr(pickOrderAmountRaw(order)), [order]);
  const status = useMemo(() => pickOrderStatus(order), [order]);
  const typePill = useMemo(() => formatOrderTypeLabel(pickOrderType(order)), [order]);
  const cat = useMemo(() => statusCategory(status), [status]);

  const timeline = useMemo(() => buildTimelineSteps(order || {}), [order]);

  const onOpenFund = useCallback(() => {
    const code = pickSchemeCode(order);
    if (!code) {
      return;
    }
    navigateToFundDetail(navigation, {
      schemeCode: code,
      schemeName: title,
    });
  }, [navigation, order, title]);

  const logo = order?.logo_url ?? order?.logo;
  const orderNumber =
    order?.bse_order_id ??
    order?.transaction_number ??
    order?.order_number ??
    order?.order_no ??
    order?.order_id ??
    order?.id;
  const hasAuthMarker =
    !!order?.authenticated_at ||
    !!order?.auth_date ||
    !!order?.verified_at ||
    order?.is_authenticated === true ||
    String(order?.auth_status ?? '').toUpperCase() === 'Y';
  const statusKey = normalizeStatusKey(status);
  const canPayNow =
    orderNumber != null &&
    cat !== 'success' &&
    cat !== 'failed' &&
    (hasAuthMarker ||
      statusKey.includes('AUTHENTICATED') ||
      statusKey.includes('PAYMENT_REQUIRED') ||
      statusKey.includes('AUTHENTICATION_REQUIRED'));

  useEffect(() => {
    if (__DEV__) {
      console.log('[OrderDetail] pay-now eligibility', {
        orderNumber,
        status,
        cat,
        hasAuthMarker,
        authenticated_at: order?.authenticated_at,
        auth_date: order?.auth_date,
        auth_status: order?.auth_status,
        canPayNow,
      });
    }
  }, [canPayNow, cat, hasAuthMarker, order?.auth_date, order?.auth_status, order?.authenticated_at, orderNumber, status]);

  const onPayNow = useCallback(async () => {
    const clientCode = user?.client_code ?? user?.ucc_code ?? user?.ucc;
    const totalAmount = Number(String(pickOrderAmountRaw(order)).replace(/,/g, '')) || 0;
    if (!orderNumber || !clientCode || !totalAmount) {
      return;
    }
    try {
      setPaymentLoading(true);
      if (__DEV__) {
        console.log('[OrderDetail] pay-now request', {
          orderNumber,
          totalAmount,
          status: pickOrderStatus(order),
          auth_status: order?.auth_status,
          authenticated_at: order?.authenticated_at,
        });
      }
      const res = await processOrderPayment({
        clientCode,
        modeOfPayment: 'DIRECT',
        orderNumber,
        totalAmount,
      });
      const url = extractOrderAuthUrl(res?.data);
      if (__DEV__) {
        console.log('[OrderDetail] pay-now response', {orderNumber, hasUrl: !!url, data: res?.data});
      }
      if (url) {
        navigation.navigate('MandateAuthWebview', {uri: url, title: 'Complete payment'});
      }
    } finally {
      setPaymentLoading(false);
    }
  }, [navigation, order, orderNumber, user]);

  if (!order) {
    return (
      <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
        <View style={styles.topBar}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn} hitSlop={10}>
            <Text style={styles.backChevron}>‹</Text>
            <Text style={[Textstyles.medium, styles.backLabel]}>Back</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.missing}>
          <Text style={styles.missingTxt}>No order data.</Text>
        </View>
      </SafeAreaView>
    );
  }

  const summaryHead =
    cat === 'success'
      ? 'Order Completed'
      : cat === 'failed'
        ? 'Order Failed'
        : cat === 'progress'
          ? 'Order InProgress'
          : `Order ${status}`;

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn} hitSlop={10}>
          <Text style={styles.backChevron}>‹</Text>
          <Text style={[Textstyles.medium, styles.backLabel]}>Back</Text>
        </TouchableOpacity>
        <Text style={styles.navTitle}>Order Details</Text>
        <View style={styles.topRightSpacer} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.summaryCard}>
          <View style={styles.summaryTop}>
            <View style={styles.summaryLeft}>
              <Text style={styles.summaryHead}>{summaryHead}</Text>
              <Text style={styles.summaryAmt}>{amount}</Text>
              <View style={styles.typePill}>
                <Text style={styles.typePillTxt}>{typePill}</Text>
              </View>
            </View>
            <View style={styles.summaryIconWrap}>
              {cat === 'success' ? (
                <View style={[styles.statusCircle, styles.statusCircleOk]}>
                  <Text style={styles.statusIconTxt}>✓</Text>
                </View>
              ) : cat === 'failed' ? (
                <View style={[styles.statusCircle, styles.statusCircleFail]}>
                  <Text style={styles.statusIconTxt}>✕</Text>
                </View>
              ) : (
                <View style={[styles.statusCircle, styles.statusCirclePending]}>
                  <Text style={styles.clockTxt}>🕐</Text>
                </View>
              )}
            </View>
          </View>
        </View>

        <TouchableOpacity style={styles.fundCard} onPress={onOpenFund} activeOpacity={0.75}>
          {logo ? (
            <Image source={{uri: logo}} style={styles.fundLogo} resizeMode="contain" />
          ) : (
            <View style={[styles.fundLogo, styles.fundLogoPh]}>
              <Text style={styles.fundLogoLetter}>{(title || '?')[0]?.toUpperCase() ?? '?'}</Text>
            </View>
          )}
          <Text style={styles.fundName} numberOfLines={2}>
            {title}
          </Text>
          <Text style={styles.chev}>›</Text>
        </TouchableOpacity>

        <View style={styles.dateRow}>
          <View style={styles.dateHalf}>
            <Text style={styles.dateLabel}>Completed on</Text>
            <Text style={styles.dateVal}>{formatDateOnly(pickCompletedDate(order))}</Text>
          </View>
          <View style={styles.dateHalf}>
            <Text style={styles.dateLabel}>Nav. Date</Text>
            <Text style={styles.dateVal}>{formatDateOnly(pickNavDate(order))}</Text>
          </View>
        </View>

        <View style={styles.notice}>
          <Text style={styles.noticeIcon}>⚡</Text>
          <Text style={styles.noticeTxt}>Speedy order completion in just 1 working day.</Text>
        </View>

        {statusLoading ? (
          <View style={styles.statusLoadingRow}>
            <Text style={styles.statusLoadingTxt}>Refreshing order status...</Text>
          </View>
        ) : null}

        {canPayNow ? (
          <TouchableOpacity style={styles.payNowBtn} onPress={onPayNow} activeOpacity={0.9} disabled={paymentLoading}>
            <Text style={styles.payNowTxt}>{paymentLoading ? 'Processing...' : 'Pay Now'}</Text>
          </TouchableOpacity>
        ) : null}

        <Text style={styles.sectionTitle}>Order Status</Text>
        <View style={styles.timelineCard}>
          {timeline.map((step, index) => (
            <View key={step.key} style={styles.tlRow}>
              <View style={styles.tlLeft}>
                <View
                  style={[
                    styles.tlDot,
                    step.done ? styles.tlDotDone : styles.tlDotPending,
                  ]}>
                  {step.done ? <Text style={styles.tlCheck}>✓</Text> : null}
                </View>
                {index < timeline.length - 1 ? (
                  <DottedConnector completed={!!step.done} />
                ) : null}
              </View>
              <View style={styles.tlBody}>
                <Text style={[Textstyles.medium, styles.tlTitle]}>{step.title}</Text>
                <Text style={styles.tlTime}>{formatDateTime(step.at)}</Text>
              </View>
            </View>
          ))}
        </View>

        <Text style={styles.sectionTitle}>Order details</Text>
        <View style={styles.kvCard}>
          <View style={styles.kvRow}>
            <Text style={styles.kvLabel}>Placed on</Text>
            <Text style={styles.kvVal}>{formatDateTime(pickOrderDate(order))}</Text>
          </View>
          {pickFolio(order) ? (
            <View style={styles.kvRow}>
              <Text style={styles.kvLabel}>Folio no.</Text>
              <Text style={styles.kvVal}>{pickFolio(order)}</Text>
            </View>
          ) : null}
          {pickOrderIdDisplay(order) != null ? (
            <View style={styles.kvRow}>
              <Text style={styles.kvLabel}>Order ID</Text>
              <Text style={styles.kvVal} selectable>
                {String(pickOrderIdDisplay(order))}
              </Text>
            </View>
          ) : null}
        </View>

        <TouchableOpacity style={styles.helpRow} activeOpacity={0.7}>
          <View style={styles.helpIconWrap}>
            <Text style={styles.helpIconTxt}>?</Text>
          </View>
          <Text style={[Textstyles.medium, styles.helpTxt]}>Need Help?</Text>
          <Text style={styles.chev}>›</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {flex: 1, backgroundColor: PAGE_BG},
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: CARD_BORDER,
    backgroundColor: PAGE_BG,
  },
  backBtn: {flexDirection: 'row', alignItems: 'center', paddingVertical: 4},
  backChevron: {fontSize: 28, color: THEME_BLUE, marginRight: 2, fontWeight: '400'},
  backLabel: {fontSize: 16, color: THEME_BLUE, fontWeight: '600'},
  navTitle: {flex: 1, fontSize: 18, fontWeight: '700', color: Colors.TEXT_PRIMARY, textAlign: 'center'},
  topRightSpacer: {width: 72},
  scroll: {padding: 16, paddingBottom: 40},
  summaryCard: {
    backgroundColor: Colors.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: CARD_BORDER,
    padding: 16,
    marginBottom: 12,
  },
  summaryTop: {flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start'},
  summaryLeft: {flex: 1, marginRight: 12},
  summaryHead: {fontSize: 14, color: '#6B7280', marginBottom: 6},
  summaryAmt: {fontSize: 28, fontWeight: '800', color: Colors.TEXT_PRIMARY},
  typePill: {
    alignSelf: 'flex-start',
    marginTop: 10,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    backgroundColor: '#E8F0FE',
  },
  typePillTxt: {fontSize: 13, fontWeight: '700', color: THEME_BLUE},
  summaryIconWrap: {justifyContent: 'center'},
  statusCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusCircleOk: {backgroundColor: '#DCFCE7'},
  statusCircleFail: {backgroundColor: '#FEE2E2'},
  statusCirclePending: {backgroundColor: '#FEF3C7'},
  statusIconTxt: {fontSize: 22, fontWeight: '800', color: '#15803D'},
  clockTxt: {fontSize: 22},
  fundCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: CARD_BORDER,
    padding: 12,
    marginBottom: 12,
  },
  fundLogo: {width: 40, height: 40, borderRadius: 8, marginRight: 12},
  fundLogoPh: {
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  fundLogoLetter: {fontSize: 16, fontWeight: '800', color: THEME_BLUE},
  fundName: {flex: 1, fontSize: 15, fontWeight: '600', color: '#111827'},
  chev: {fontSize: 22, color: '#9CA3AF', fontWeight: '300'},
  dateRow: {flexDirection: 'row', marginBottom: 12},
  dateHalf: {flex: 1, paddingRight: 8},
  dateLabel: {fontSize: 12, color: '#9CA3AF', marginBottom: 4},
  dateVal: {fontSize: 14, fontWeight: '600', color: '#111827'},
  notice: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFBEB',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#FDE68A',
    padding: 12,
    marginBottom: 16,
  },
  noticeIcon: {fontSize: 18, marginRight: 8},
  noticeTxt: {flex: 1, fontSize: 13, color: '#92400E', lineHeight: 18},
  payNowBtn: {
    backgroundColor: '#22C55E',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    marginBottom: 14,
  },
  payNowTxt: {fontSize: 15, color: Colors.white, fontWeight: '700'},
  statusLoadingRow: {
    paddingVertical: 8,
    paddingHorizontal: 10,
    marginBottom: 10,
  },
  statusLoadingTxt: {fontSize: 12, color: '#6B7280'},
  sectionTitle: {fontSize: 15, fontWeight: '700', color: Colors.TEXT_PRIMARY, marginBottom: 10},
  timelineCard: {
    backgroundColor: Colors.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: CARD_BORDER,
    padding: 16,
    marginBottom: 16,
  },
  tlRow: {flexDirection: 'row', alignItems: 'flex-start'},
  tlLeft: {width: 28, alignItems: 'center'},
  dottedConnector: {
    alignItems: 'center',
    paddingVertical: 2,
  },
  dottedSeg: {
    width: DOT_SIZE,
    height: DOT_SIZE,
    borderRadius: DOT_SIZE / 2,
    marginBottom: DOT_GAP,
  },
  dottedSegLast: {marginBottom: 0},
  tlDot: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
  },
  tlDotDone: {backgroundColor: '#22C55E', borderColor: '#22C55E'},
  tlDotPending: {backgroundColor: Colors.white, borderColor: '#D1D5DB'},
  tlCheck: {color: Colors.white, fontSize: 11, fontWeight: '900'},
  tlBody: {flex: 1, paddingLeft: 8, paddingBottom: 12},
  tlTitle: {fontSize: 15, color: '#111827'},
  tlTime: {fontSize: 12, color: '#9CA3AF', marginTop: 4},
  kvCard: {
    backgroundColor: Colors.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: CARD_BORDER,
    padding: 4,
    marginBottom: 16,
  },
  kvRow: {
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#F3F4F6',
  },
  kvLabel: {fontSize: 12, color: '#9CA3AF', marginBottom: 4},
  kvVal: {fontSize: 15, fontWeight: '600', color: '#111827'},
  helpRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: CARD_BORDER,
    padding: 14,
  },
  helpIconWrap: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#E5E7EB',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  helpIconTxt: {fontSize: 14, fontWeight: '700', color: '#6B7280'},
  helpTxt: {flex: 1, fontSize: 15, color: THEME_BLUE},
  missing: {flex: 1, justifyContent: 'center', alignItems: 'center'},
  missingTxt: {color: Colors.GREY},
});
