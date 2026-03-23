/**
 * Normalizes paginated / list payloads from journey MF APIs (orders, wishlist, mandates, etc.).
 */
export function normalizeJourneyListResponse(apiBody) {
  const root = apiBody?.data ?? apiBody;
  let inner = root?.data ?? root;
  if (inner && typeof inner === 'object' && inner.data && typeof inner.data === 'object' && !Array.isArray(inner)) {
    inner = inner.data;
  }
  let results = [];
  if (Array.isArray(inner)) {
    results = inner;
  } else if (inner && typeof inner === 'object') {
    const raw =
      inner.results ??
      inner.orders ??
      inner.items ??
      inner.records ??
      inner.wishlist ??
      inner.mandates ??
      inner.mandate_list ??
      inner.data_list;
    results = Array.isArray(raw) ? raw : [];
  }
  const count =
    typeof inner?.count === 'number'
      ? inner.count
      : typeof root?.count === 'number'
        ? root.count
        : results.length;
  return {results, count};
}
