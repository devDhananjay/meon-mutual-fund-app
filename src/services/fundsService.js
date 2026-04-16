import apiClient from './apiClient';

/** MF scheme list. Primary path confirmed working via curl; mf/ variant tried as fallback. */
export async function getSchemes(params = {}) {
  return apiClient.get('/api/company/schemes/list', {params});
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
