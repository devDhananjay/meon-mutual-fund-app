/**
 * Group portfolio holdings by folio id (web-style folio buckets).
 * API may expose `folio_number`, `folio_no`, `folio`, `folio_name`, etc.
 */
export function folioGroupKey(item) {
  if (!item || typeof item !== 'object') {
    return 'default';
  }
  const k =
    item.folio_number ??
    item.folio_no ??
    item.folio_id ??
    item.folio ??
    item.folio_name ??
    item.folioNumber;
  if (k != null && String(k).trim() !== '') {
    return String(k).trim();
  }
  return 'default';
}

export function folioGroupTitle(key) {
  if (key === 'default') {
    return 'All holdings';
  }
  return `Folio ${key}`;
}

export function groupHoldingsByFolio(holdings) {
  if (!Array.isArray(holdings) || holdings.length === 0) {
    return [];
  }
  const map = new Map();
  for (const h of holdings) {
    const key = folioGroupKey(h);
    if (!map.has(key)) {
      map.set(key, []);
    }
    map.get(key).push(h);
  }
  return Array.from(map.entries()).map(([folioKey, data]) => ({
    folioKey,
    title: folioGroupTitle(folioKey),
    data,
  }));
}
