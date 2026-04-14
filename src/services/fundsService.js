import apiClient from './apiClient';

/** MF scheme list — same family as `/mf/schemes/<slug>/`. Falls back if host only exposes legacy path. */
export async function getSchemes(params = {}) {
  try {
    return await apiClient.get('/api/company/mf/schemes/list', {params});
  } catch (e) {
    if (e?.status === 404) {
      return apiClient.get('/api/company/schemes/list', {params});
    }
    throw e;
  }
}

/**
 * List API often nests identifiers under `scheme_data`, `scheme`, or `scheme_master`.
 */
function flattenSchemeListItem(item) {
  if (!item || typeof item !== 'object') {
    return item;
  }
  const nested = [
    item.scheme_master,
    item.scheme_data,
    item.scheme,
    item.fund,
  ].filter(x => x && typeof x === 'object');
  return Object.assign({}, ...nested, item);
}

export function normalizeSchemesResponse(apiBody) {
  const root = apiBody?.data ?? apiBody;
  const inner = root?.data ?? root;
  const raw = Array.isArray(inner?.results) ? inner.results : [];
  return {
    results: raw.map(flattenSchemeListItem),
    count: typeof inner?.count === 'number' ? inner.count : 0,
  };
}
