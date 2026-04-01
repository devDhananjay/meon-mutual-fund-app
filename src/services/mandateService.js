import apiClient from './apiClient';
import {normalizeJourneyListResponse} from './listResponseUtils';

/** Web parity: SIP / mandate list (auth required). */
export async function fetchMandateList(params = {}) {
  return apiClient.get('/api/journey/mf/mandate/list/', {
    params: {
      page: 1,
      page_size: 50,
      ...params,
    },
  });
}

export function normalizeMandateResponse(apiBody) {
  return normalizeJourneyListResponse(apiBody);
}

/**
 * Web parity: e-mandate authentication (POST). Server may return a URL to complete in WebView.
 */
export async function postMandateAuth(body) {
  return apiClient.post('/api/journey/mf/mandate/auth/', body);
}

/**
 * Register new mandate (web parity). Body example:
 * { mandateType, mandate_amount, start_date, end_date } — dates as DD/MM/YYYY strings.
 */
export async function postMandateRegister(body) {
  return apiClient.post('/api/journey/mf/mandate/register/', body);
}
