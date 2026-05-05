import apiClient from './apiClient';

/** Company / app settings (auth). */
export async function fetchCompanyProfileSettings() {
  return apiClient.get('/api/company/profile/settings/');
}

/**
 * SIP start offset rules from settings.
 * @returns {{ daysWithFirst: number, daysWithoutFirst: number }}
 */
export function normalizeSipPlaceOrderDayDiff(apiBody) {
  const root = apiBody?.data ?? apiBody;
  const inner = root?.data ?? root;
  const block =
    inner?.sip_place_order_day_difference ?? root?.sip_place_order_day_difference ?? {};
  const withFirst = Number(block.days_diff_with_first_order);
  const withoutFirst = Number(block.days_diff_without_first_order);
  return {
    daysWithFirst: Number.isFinite(withFirst) ? withFirst : 9,
    daysWithoutFirst: Number.isFinite(withoutFirst) ? withoutFirst : 33,
  };
}
