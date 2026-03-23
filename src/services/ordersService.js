import apiClient from './apiClient';
import {normalizeJourneyListResponse} from './listResponseUtils';

/** Web parity: order history list (auth required). */
export async function fetchOrderList(params = {}) {
  return apiClient.get('/api/journey/mf/order/list/', {
    params: {
      page: 1,
      page_size: 50,
      ...params,
    },
  });
}

export function normalizeOrdersResponse(apiBody) {
  return normalizeJourneyListResponse(apiBody);
}
