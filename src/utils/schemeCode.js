/**
 * Web uses kebab-case slugs for scheme URLs, e.g.
 * `/mf/schemes/360-one-balanced-hybrid-fund/` — not URL-encoded display names with spaces.
 */
export function toSchemeSlugPathSegment(identifier) {
  if (identifier == null || identifier === '') {
    return '';
  }
  const s = String(identifier).trim();
  if (s === '') {
    return '';
  }
  if (/\s/.test(s)) {
    return s
      .toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9-]/g, '')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
  }
  return encodeURIComponent(s);
}

/**
 * Resolves a value the detail API can use in `/mf/schemes/{id}` — slug (e.g. "02T-GR"),
 * numeric ids, `isin`, or (last resort) `base_scheme_name` / `scheme_name` when code is absent.
 */
export function pickSchemeCode(raw) {
  if (raw == null) {
    return undefined;
  }
  if (typeof raw === 'string') {
    const t = raw.trim();
    return t === '' ? undefined : t;
  }
  if (typeof raw !== 'object') {
    return undefined;
  }
  const candidates = [
    raw.scheme_code,
    raw.schemeCode,
    raw.code,
    raw.slug,
    raw.scheme_slug,
    raw.scheme?.scheme_code,
    raw.scheme_data?.scheme_code,
    raw.fund?.scheme_code,
    raw.scheme_data?.scheme?.scheme_code,
    raw.scheme_master?.scheme_code,
    raw.scheme_master_code,
    raw.order_scheme_code,
    raw.scheme_id,
    raw.scheme_master_id,
    raw.schemeMasterId,
    raw.isin,
    raw.scheme_isin,
    raw.plan_id,
    raw.base_scheme_name,
    raw.scheme_name,
  ];
  for (const c of candidates) {
    if (c != null && String(c).trim() !== '') {
      return String(c).trim();
    }
  }
  return undefined;
}
