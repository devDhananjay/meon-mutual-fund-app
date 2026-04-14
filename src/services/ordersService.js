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

export function buildOrderPlacePayload({
  schemeCode,
  amount,
  isSip = false,
  sipFrequency,
  sipDate,
  sipDurationYears,
  mandateId,
}) {
  return {
    transaction_code: isSip ? 'SIP' : 'NEW',
    scheme_code: schemeCode,
    buy_sell: 'P',
    buy_sell_type: 'FRESH',
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
    mandate_id: isSip ? mandateId : undefined,
  };
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
    min_redeem: 'N',
    dpc: 'Y',
    folio_number: folio,
  };

  if (allRedeem) {
    return {
      ...base,
      all_redeem: 'Y',
      amount: 1,
    };
  }

  if (redeemByAmount) {
    return {
      ...base,
      all_redeem: 'N',
      amount: Math.max(0, Math.round(Number(amount))),
    };
  }

  const u = Number(units);
  return {
    ...base,
    all_redeem: 'N',
    units: Number.isFinite(u) ? u : 0,
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

export function buildOrderCancelPayload(order) {
  const root = order ?? {};
  const amountRaw = root?.all_redeem === 'Y' ? '1' : root?.amount ?? root?.order_amount ?? root?.total_amount;
  return {
    transaction_code: 'CXL',
    scheme_code: root?.scheme_code ?? root?.schemeCode ?? root?.schemeCode?.scheme_code,
    buy_sell: root?.buy_sell ?? root?.buySell ?? 'P',
    buy_sell_type: root?.buy_sell_type ?? root?.buySellType ?? 'FRESH',
    dp_txn: root?.dp_txn ?? 'P',
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

export async function createCancelOrder(order) {
  const body = buildOrderCancelPayload(order);
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
  const numericOrder = Number(orderNumber);
  const numericAmount = Number(totalAmount);
  const payload = {
    client_code: clientCode,
    mode_of_payment: modeOfPayment,
    order_numbers: Number.isFinite(numericOrder) ? numericOrder : orderNumber,
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
