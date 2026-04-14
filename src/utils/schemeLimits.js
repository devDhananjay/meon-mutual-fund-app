/**
 * Scheme detail API (`GET /api/company/mf/schemes/<slug>/`) exposes SIP bounds on
 * `scheme_data` (often root) — fall back to `holdings.*` when present.
 */

export function pickMinSipInvestmentOrNull(scheme) {
  if (!scheme || typeof scheme !== 'object') {
    return null;
  }
  if (scheme.min_sip_investment != null && scheme.min_sip_investment !== '') {
    const direct = Number(scheme.min_sip_investment);
    if (Number.isFinite(direct) && direct > 0) {
      return direct;
    }
  }
  const nested = Number(scheme?.holdings?.min_sip_investment);
  if (Number.isFinite(nested) && nested > 0) {
    return nested;
  }
  return null;
}

export function pickMaxSipInvestmentOrNull(scheme) {
  if (!scheme || typeof scheme !== 'object') {
    return null;
  }
  if (scheme.max_sip_investment != null && scheme.max_sip_investment !== '') {
    const direct = Number(scheme.max_sip_investment);
    if (Number.isFinite(direct) && direct > 0) {
      return Math.floor(direct);
    }
  }
  const nested = Number(scheme?.holdings?.max_sip_investment);
  if (Number.isFinite(nested) && nested > 0) {
    return Math.floor(nested);
  }
  return null;
}

export function pickMinSipInvestment(scheme) {
  return pickMinSipInvestmentOrNull(scheme) ?? 500;
}

export function pickMaxSipInvestment(scheme) {
  return pickMaxSipInvestmentOrNull(scheme) ?? 999999999;
}
