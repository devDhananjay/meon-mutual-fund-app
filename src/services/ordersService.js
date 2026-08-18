import apiClient from './apiClient';
import {normalizeJourneyListResponse} from './listResponseUtils';

/** Web parity: order history list (auth required). */
export async function fetchOrderList(params = {}) {
  const endpoint = '/api/journey/mf/order/list/';
  const payload = {
    page: 1,
    page_size: 50,
    ...params,
  };
  // Some backends expect alternate query keys — send both without overwriting explicit values.
  if (payload.status && payload.order_status == null) {
    payload.order_status = payload.status;
  }
  if (payload.type && payload.order_type == null) {
    payload.order_type = payload.type;
  }
  if (__DEV__) {
    console.log('[order/list] request', {endpoint, params: payload});
  }
  const res = await apiClient.get(endpoint, {params: payload});
  if (__DEV__) {
    console.log('[order/list] response', {
      success: res?.success,
      data: res?.data,
    });
  }
  return res;
}

/** Web parity: order detail/status by order id. */
export async function fetchOrderStatus(orderId) {
  const endpoint = `/api/journey/mf/order/${orderId}/status/`;
  if (__DEV__) {
    console.log('[order/status] request', {endpoint, orderId});
  }
  const res = await apiClient.get(endpoint);
  if (__DEV__) {
    console.log('[order/status] response', {
      success: res?.success,
      data: res?.data,
    });
  }
  return res;
}

export function normalizeOrdersResponse(apiBody) {
  return normalizeJourneyListResponse(apiBody);
}

const ORDER_PLACE_ENDPOINT = '/api/journey/mf/order/place/';
const ORDER_AUTH_ENDPOINT = '/api/journey/mf/order/authenticate/';
const ORDER_PAYMENT_PROCESS_ENDPOINT = '/api/journey/mf/payment/process/';
const SIP_REGISTER_ENDPOINT = '/api/journey/mf/sip/register/';

export function buildOrderPlacePayload({
  schemeCode,
  amount,
  isSip = false,
  sipFrequency,
  sipDate,
  sipDurationYears,
  mandateId,
  /** Lump-sum (`transaction_code: NEW`): only send `mandate_id` when user opts in (web “Use Mandate”). */
  useMandate = false,
  folioNumber,
  buySellType,
}) {
  const mandateStr = mandateId != null && String(mandateId).trim() !== '' ? String(mandateId).trim() : '';
  const mandate_id = isSip ? mandateStr || undefined : useMandate && mandateStr ? mandateStr : undefined;
  const folio = folioNumber != null ? String(folioNumber).trim() : '';
  const payload = {
    transaction_code: isSip ? 'SIP' : 'NEW',
    scheme_code: schemeCode,
    buy_sell: 'P',
    buy_sell_type: buySellType || (folio ? 'ADDITIONAL' : 'FRESH'),
    dp_txn: 'P',
    all_redeem: 'N',
    kyc_status: 'Y',
    euin_flag: 'N',
    min_redeem: 'N',
    dpc: 'Y',
    amount: Number(amount),
    sip_frequency: isSip ? sipFrequency : undefined,
    sip_date: isSip ? sipDate : undefined,
    sip_duration_years: isSip ? sipDurationYears : undefined,
    mandate_id,
  };
  if (folio) {
    payload.folio_number = folio;
  }
  return payload;
}

/**
 * Redemption order (web parity: `/api/journey/mf/order/place/` with buy_sell R).
 * - Amount mode: rupee value, all_redeem N unless full amount matches cap.
 * - Quantity / units mode: pass units; amount often 0 when API expects units only.
 * - Redeem all: all_redeem Y (amount placeholder per gateway patterns).
 * SWP is not supported in-app (separate transaction type on web).
 */
export function buildRedeemPlacePayload({
  schemeCode,
  folioNumber = '',
  redeemByAmount,
  amount,
  units,
  currentNav,
  allRedeem,
}) {
  const folio = String(folioNumber ?? '').trim();
  const base = {
    transaction_code: 'NEW',
    scheme_code: schemeCode,
    buy_sell: 'R',
    buy_sell_type: 'FRESH',
    dp_txn: 'P',
    kyc_status: 'Y',
    euin_flag: 'N',
    euin: '',
    min_redeem: 'N',
    dpc: 'Y',
    mandate_id: '',
    folio_number: folio,
  };

  if (allRedeem) {
    return {
      ...base,
      all_redeem: 'Y',
    };
  }

  if (redeemByAmount) {
    return {
      ...base,
      all_redeem: 'N',
      amount: Math.max(0, Number(amount)),
    };
  }

  const u = Number(units);
  const nav = Number(currentNav);
  const convertedAmount = Number.isFinite(u) && Number.isFinite(nav) && nav > 0 ? Number((u * nav).toFixed(0)) : 0;
  return {
    ...base,
    all_redeem: 'N',
    amount: convertedAmount,
  };
}

export async function createSingleOrder(body) {
  if (__DEV__) {
    console.log('[order/place] request', {
      endpoint: ORDER_PLACE_ENDPOINT,
      payload: body,
    });
  }
  const res = await apiClient.post(ORDER_PLACE_ENDPOINT, body);
  if (__DEV__) {
    console.log('[order/place] response', {
      success: res?.success,
      data: res?.data,
    });
  }
  return res;
}

function mapSipFrequencyUiToApi(sipFrequency) {
  const s = String(sipFrequency || '')
    .trim()
    .toLowerCase();
  if (s === 'daily') {
    return 'DAILY';
  }
  if (s === 'monthly') {
    return 'MONTHLY';
  }
  const u = String(sipFrequency || '')
    .trim()
    .toUpperCase();
  if (u === 'DAILY' || u === 'MONTHLY' || u === 'QUARTERLY') {
    return u;
  }
  return 'MONTHLY';
}

function parseDDMMYYYYToDate(str) {
  const parts = String(str || '').trim().split('/');
  if (parts.length !== 3) {
    return null;
  }
  const d = Number(parts[0]);
  const m = Number(parts[1]) - 1;
  const y = Number(parts[2]);
  if (!Number.isFinite(d) || !Number.isFinite(m) || !Number.isFinite(y)) {
    return null;
  }
  const dt = new Date(y, m, d);
  return Number.isNaN(dt.getTime()) ? null : dt;
}

/** Inclusive day count between SIP start and end (DD/MM/YYYY). */
export function sipDailyInstallmentCount(startStr, endStr) {
  const a = parseDDMMYYYYToDate(startStr);
  const b = parseDDMMYYYYToDate(endStr || startStr);
  if (!a || !b) {
    return 1;
  }
  const start = new Date(a.getFullYear(), a.getMonth(), a.getDate());
  const end = new Date(b.getFullYear(), b.getMonth(), b.getDate());
  const diff = Math.round((end - start) / 86400000);
  return Math.max(1, diff + 1);
}

/** Web `handleSipOrder`: ceil(day diff), minimum 1. */
export function sipDailyNoOfInstallmentsCeil(startStr, endStr) {
  const a = parseDDMMYYYYToDate(startStr);
  const b = parseDDMMYYYYToDate(endStr || startStr);
  if (!a || !b) {
    return 1;
  }
  const start = new Date(a.getFullYear(), a.getMonth(), a.getDate()).getTime();
  const end = new Date(b.getFullYear(), b.getMonth(), b.getDate()).getTime();
  const diff = Math.ceil((end - start) / 86400000);
  return Math.max(1, diff);
}

export function buildSipRegisterPayload({
  schemeCode,
  amount,
  sipDate,
  sipFrequency,
  sipDurationYears,
  sipEndDate,
  mandateId,
  firstOrderToday = false,
  folioNo,
  euin,
}) {
  const normalizedFrequency = mapSipFrequencyUiToApi(sipFrequency);
  const safeYears = Math.max(1, Math.min(25, Number(sipDurationYears) || 1));
  let installments =
    normalizedFrequency === 'QUARTERLY' ? safeYears * 4 : safeYears * 12;
  if (normalizedFrequency === 'DAILY') {
    installments = sipDailyNoOfInstallmentsCeil(sipDate, sipEndDate || sipDate);
  }

  const payload = {
    scheme_code: schemeCode,
    start_date: sipDate,
    frequency_type: normalizedFrequency,
    installment_amount: Number(amount),
    trans_mode: 'P',
    dp_txn_mode: 'P',
    internal_ref_no: '',
    subbroker_code: '',
    euin: '',
    euin_flag: 'N',
    dpc: 'Y',
    param2: '',
    param3: '',
    no_of_installments: installments,
    first_order_today: firstOrderToday ? 'Y' : 'N',
  };

  const mandate = mandateId != null ? String(mandateId).trim() : '';
  if (mandate) {
    payload.mandate_id = mandate;
  }

  const folio = folioNo != null ? String(folioNo).trim() : '';
  if (folio) {
    payload.folio_no = folio;
  }

  const euinStr = euin != null ? String(euin).trim() : '';
  if (euinStr) {
    payload.euin = euinStr;
    payload.euin_flag = 'Y';
  }

  if (normalizedFrequency === 'DAILY' && sipEndDate) {
    payload.sip_end_date = sipEndDate;
    payload.param3 = sipEndDate;
  }

  return payload;
}

export async function createSipRegistration(body) {
  console.log('[sip/register] request', {
    endpoint: SIP_REGISTER_ENDPOINT,
    payload: body,
  });
  const res = await apiClient.post(SIP_REGISTER_ENDPOINT, body);
  console.log('[sip/register] raw response', {
    success: res?.success,
    data: res?.data,
  });

  const root = res?.data ?? {};
  const sipStatus = String(root?.status ?? '').toUpperCase();
  if (sipStatus === 'FAILED' || sipStatus === 'ERROR') {
    const message =
      root?.bse_remarks || root?.message || 'SIP registration failed.';
    const errObj = {
      success: false,
      status: 400,
      message,
      data: root,
      endpoint: SIP_REGISTER_ENDPOINT,
      method: 'POST',
    };
    console.error('[sip/register] failed response', errObj);
    throw errObj;
  }

  if (__DEV__) {
    console.log('[sip/register] success response', {
      status: root?.status,
      xsip_reg_id: root?.xsip_reg_id,
      unique_ref_no: root?.unique_ref_no,
    });
  }
  return res;
}

export function buildOrderCancelPayload(order) {
  const root = order ?? {};
  const amountRaw = root?.all_redeem === 'Y' ? '1' : root?.amount ?? root?.order_amount ?? root?.total_amount;
  return {
    transaction_code: 'CXL',
    scheme_code: root?.scheme_code ?? root?.schemeCode ?? root?.schemeCode?.scheme_code,
    buy_sell: root?.buy_sell ?? root?.buySell ?? 'P',
    buy_sell_type: root?.buy_sell_type ?? root?.buySellType ?? 'FRESH',
    dp_txn: root?.dp_txn ?? root?.dp_trans ?? 'P',
    all_redeem: root?.all_redeem ?? 'N',
    amount: Number(amountRaw),
    folio_number: root?.folio_number ?? root?.folio_no ?? '',
    kyc_status: root?.kyc_status ?? 'Y',
    euin_flag: root?.euin_flag ?? 'N',
    min_redeem: root?.min_redeem ?? 'N',
    dpc: root?.dpc ?? 'Y',
    order_id: root?.order_id ?? root?.orderId ?? root?.id,
  };
}

/** `YYYY-MM-DD` or ISO → `DD/MM/YYYY` for SIP cancel (web parity). */
export function formatSipCancelStartDate(dateStr) {
  if (dateStr == null || dateStr === '') {
    return '';
  }
  const s = String(dateStr).trim();
  if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(s)) {
    return s;
  }
  const ymd = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (ymd) {
    const [, y, m, d] = ymd;
    return `${d}/${m}/${y}`;
  }
  try {
    const d = new Date(s);
    if (!Number.isNaN(d.getTime())) {
      const dd = String(d.getDate()).padStart(2, '0');
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const yy = d.getFullYear();
      return `${dd}/${mm}/${yy}`;
    }
  } catch {
    /* ignore */
  }
  return s;
}

/** Use `/sip/register/` cancel path when order is SIP / XSIP registration (web parity). */
export function isSipOrderForCancel(order) {
  if (!order || typeof order !== 'object') {
    return false;
  }
  const bs = String(order.buy_sell ?? order.buySell ?? '').toUpperCase();
  if (bs === 'SIP') {
    return true;
  }
  const raw = String(
    order.transaction_type ?? order.txn_type ?? order.order_type ?? order.buy_sell_display ?? order.product_type ?? '',
  ).toUpperCase();
  if (raw.includes('SIP') || raw.includes('XSIP')) {
    return true;
  }
  if (order.isSIP || order.is_sip) {
    return true;
  }
  if (order.xsip_reg_id != null && String(order.xsip_reg_id).trim() !== '') {
    return true;
  }
  const hasSipMeta =
    (order.sip_frequency_type != null && String(order.sip_frequency_type).trim() !== '') ||
    (order.sip_frequency != null && String(order.sip_frequency).trim() !== '') ||
    (order.sip_start_date != null && String(order.sip_start_date).trim() !== '') ||
    (order.sip_date != null && String(order.sip_date).trim() !== '');
  if (hasSipMeta && bs !== 'R') {
    return true;
  }
  return false;
}

/**
 * SIP / XSIP cancellation — POST `/api/journey/mf/sip/register/` with `transaction_code: CXL` (web parity).
 */
export function buildSipCancelPayload(order, extras = {}) {
  const base = buildOrderCancelPayload(order);
  const root = order ?? {};
  const allRedeem = String(base.all_redeem ?? root.all_redeem ?? 'N').toUpperCase();
  const installmentRaw =
    allRedeem === 'Y'
      ? '1'
      : root.amount ?? root.order_amount ?? root.installment_amount ?? base.amount ?? '';
  const installment_amount =
    installmentRaw === '' || installmentRaw == null ? String(base.amount ?? '') : String(installmentRaw);

  const frequencyRaw = root.sip_frequency_type ?? root.sip_frequency ?? root.frequency_type ?? 'MONTHLY';
  const frequency_type = String(frequencyRaw).trim().toUpperCase() || 'MONTHLY';

  const startRaw = root.sip_start_date ?? root.sip_date ?? root.start_date ?? '';
  const start_date = formatSipCancelStartDate(startRaw);

  return {
    ...base,
    buy_sell: 'SIP',
    euin: extras.euin ?? root.euin ?? '',
    frequency_type,
    installment_amount,
    start_date,
  };
}

export async function createCancelOrder(order, extras = {}) {
  const euin = extras.euin ?? '';

  if (isSipOrderForCancel(order)) {
    const body = buildSipCancelPayload(order, {euin});
    if (__DEV__) {
      console.log('[order/sip-cancel] request', {
        endpoint: SIP_REGISTER_ENDPOINT,
        payload: body,
      });
    }
    const res = await apiClient.post(SIP_REGISTER_ENDPOINT, body);
    const root = res?.data?.data ?? res?.data ?? {};
    const st = String(root?.status ?? '').trim();
    const stUp = st.toUpperCase();
    const stLo = st.toLowerCase();
    const ok = stUp === 'CANCELLED' || stUp === 'SUCCESS' || stLo === 'success';
    if (__DEV__) {
      console.log('[order/sip-cancel] response', {
        success: res?.success,
        status: root?.status,
        data: root,
      });
    }
    if (!ok) {
      const msg = root?.message ?? root?.bse_remarks ?? 'Failed to cancel order';
      throw new Error(msg);
    }
    return res;
  }

  const body = {...buildOrderCancelPayload(order), euin};
  if (__DEV__) {
    console.log('[order/cancel] request', {
      endpoint: ORDER_PLACE_ENDPOINT,
      payload: body,
    });
  }
  const res = await apiClient.post(ORDER_PLACE_ENDPOINT, body);
  if (__DEV__) {
    console.log('[order/cancel] response', {
      success: res?.success,
      data: res?.data,
    });
  }
  return res;
}

export async function createCartOrder(orderBodies = []) {
  const responses = [];
  for (const body of orderBodies) {
    // Single place endpoint per scheme order (web parity payload).
    // Sequential to preserve deterministic auth/order flow.
    // eslint-disable-next-line no-await-in-loop
    const res = await createSingleOrder(body);
    responses.push(res);
  }
  if (__DEV__) {
    console.log('[order/place] cart batch complete', {
      orders: orderBodies.length,
      responses: responses.length,
    });
  }
  return responses;
}

export function extractOrderId(resData) {
  if (resData == null) {
    return null;
  }
  const root = resData?.data ?? resData;
  const inner = root?.data ?? root;
  if (inner && typeof inner === 'object') {
    const id =
      inner.bse_order_id ??
      inner.order_id ??
      inner.id ??
      inner.orderId ??
      inner.transaction_id;
    if (id != null && String(id).trim() !== '') {
      return id;
    }
  }
  return null;
}

export async function authenticateOrder(orderId) {
  const payload = {order_id: orderId};
  if (__DEV__) {
    console.log('[order/authenticate] request', {
      endpoint: ORDER_AUTH_ENDPOINT,
      payload,
    });
  }
  const res = await apiClient.post(ORDER_AUTH_ENDPOINT, payload);
  if (__DEV__) {
    console.log('[order/authenticate] response', {
      success: res?.success,
      data: res?.data,
    });
  }
  return res;
}

export async function processOrderPayment({
  clientCode,
  modeOfPayment = 'DIRECT',
  orderNumber,
  vpaId = '',
  neftReference = '',
  totalAmount,
}) {
  const numericAmount = Number(totalAmount);
  const payload = {
    client_code: clientCode,
    mode_of_payment: modeOfPayment,
    order_numbers: orderNumber == null ? orderNumber : String(orderNumber),
    vpa_id: vpaId,
    NEFTReference: neftReference || undefined,
    total_amount: Number.isFinite(numericAmount) ? numericAmount : totalAmount,
  };
  if (__DEV__) {
    console.log('[payment/process] request', {
      endpoint: ORDER_PAYMENT_PROCESS_ENDPOINT,
      payload,
    });
  }
  const res = await apiClient.post(ORDER_PAYMENT_PROCESS_ENDPOINT, payload);
  if (__DEV__) {
    console.log('[payment/process] response', {
      success: res?.success,
      data: res?.data,
    });
  }
  return res;
}

export function extractPaymentProcessMessage(resData) {
  if (resData == null) {
    return '';
  }
  const layers = [resData, resData?.data, resData?.data?.data];
  for (const layer of layers) {
    if (!layer || typeof layer !== 'object') {
      continue;
    }
    const msg =
      layer.responsestring ?? layer.ResponseString ?? layer.response_string ?? layer.message;
    if (msg != null && String(msg).trim() !== '') {
      return String(msg).trim();
    }
  }
  return '';
}

export function isPaymentProcessPending(resData) {
  const layers = [resData, resData?.data, resData?.data?.data];
  return layers.some(layer => String(layer?.status ?? '').toLowerCase() === 'pending');
}

/** Map BSE payment errors to a user-facing message. */
export function formatPaymentProcessUserMessage(resData) {
  const raw = extractPaymentProcessMessage(resData);
  const normalized = raw.replace(/\s+/g, ' ').toUpperCase();
  if (normalized.includes('INVALID ORDER NO')) {
    return 'A payment link has already been generated';
  }
  return raw;
}

/** Returns an alert message when payment/process should be treated as an error. */
export function getPaymentProcessErrorMessage(res) {
  const body = res?.data ?? res;
  const raw = extractPaymentProcessMessage(res) || extractPaymentProcessMessage(body);
  const mapped = formatPaymentProcessUserMessage(res) || formatPaymentProcessUserMessage(body);
  const code = String(
    body?.data?.statuscode ?? body?.statuscode ?? res?.data?.data?.statuscode ?? '',
  );
  const pending = isPaymentProcessPending(res) || isPaymentProcessPending(body);
  if (pending || /INVALID ORDER NO/i.test(raw) || code === '101') {
    if (/INVALID ORDER NO/i.test(raw) || code === '101') {
      return 'A payment link has already been generated';
    }
    return mapped || 'Payment is pending. Please try again.';
  }
  return null;
}

export function isAuthenticatedOrderState(raw) {
  const s = String(raw ?? '').toUpperCase();
  return (
    s.includes('AUTHENTICATED') ||
    s.includes('PAYMENT_REQUIRED') ||
    s.includes('AUTHENTICATION_REQUIRED') ||
    s.includes('AUTH_REQUIRED') ||
    s.includes('PAYMENT_PENDING') ||
    s.includes('READY_FOR_PAYMENT')
  );
}

export function extractOrderAuthUrl(resData) {
  if (resData == null) {
    return null;
  }
  const root = resData?.data ?? resData;
  const inner = root?.data ?? root;

  // authenticate response shape:
  // { data: { response_data: { ResponseString: "https://..." } } }
  const responseString =
    inner?.response_data?.ResponseString ??
    inner?.response_data?.responseString ??
    inner?.response_data?.redirect_url;
  if (typeof responseString === 'string' && /^https?:\/\//i.test(responseString.trim())) {
    return responseString.trim();
  }

  if (typeof inner === 'string' && /^https?:\/\//i.test(inner.trim())) {
    return inner.trim();
  }
  if (inner && typeof inner === 'object') {
    const u =
      inner.auth_url ??
      inner.authentication_url ??
      inner.payment_url ??
      inner.redirect_url ??
      inner.checkout_url ??
      inner.url;
    if (typeof u === 'string' && /^https?:\/\//i.test(u.trim())) {
      return u.trim();
    }
  }
  return null;
}
