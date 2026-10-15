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

/** Prefer OrNull for display/validation; this keeps cart/stepper callers working. */
export function pickMaxSipInvestment(scheme) {
  return pickMaxSipInvestmentOrNull(scheme) ?? Number.POSITIVE_INFINITY;
}

export function pickMaxPurchaseAmountOrNull(scheme) {
  if (!scheme || typeof scheme !== 'object') {
    return null;
  }
  const candidates = [
    scheme.max_purchase_amount,
    scheme.max_investment_amount,
    scheme?.holdings?.max_purchase_amount,
    scheme?.holdings?.max_investment_amount,
  ];
  for (const raw of candidates) {
    if (raw == null || raw === '') {
      continue;
    }
    const n = Number(raw);
    if (Number.isFinite(n) && n > 0) {
      return Math.floor(n);
    }
  }
  return null;
}

export function pickMinLumpsumAmount(scheme, {additionalPurchase = false} = {}) {
  if (additionalPurchase) {
    const add = Number(scheme?.additional_purchase_amount);
    if (Number.isFinite(add) && add > 0) {
      return add;
    }
  }
  const first = Number(scheme?.min_purchase_amount);
  if (Number.isFinite(first) && first > 0) {
    return first;
  }
  return 500;
}

/**
 * Quick chips always start at min (e.g. 1000 → 1000, 2000, 5000).
 * When max < min, returns [min] so UI is never blank.
 * When min === max, returns a single chip.
 */
export function buildQuickAmounts(minAmount, maxAmount) {
  const min = Math.max(1, Math.round(Number(minAmount) || 500));
  const maxRaw = Number(maxAmount);
  const maxCap =
    Number.isFinite(maxRaw) && maxRaw > 0 && maxRaw !== Number.POSITIVE_INFINITY
      ? Math.round(maxRaw)
      : null;

  if (maxCap != null && maxCap < min) {
    return [min];
  }

  const pushUnique = (list, value) => {
    let v = Math.round(value);
    if (maxCap != null) {
      v = Math.min(v, maxCap);
    }
    if (v < min || list.includes(v)) {
      return false;
    }
    list.push(v);
    return true;
  };

  const amounts = [];
  pushUnique(amounts, min);
  pushUnique(amounts, min * 2);
  pushUnique(amounts, min * 5);

  if (maxCap != null && amounts.length < 3 && amounts[amounts.length - 1] < maxCap) {
    let step = min;
    let guard = 0;
    while (amounts.length < 3 && guard < 12) {
      guard += 1;
      step *= 2;
      const grew = pushUnique(amounts, min + step);
      if (!grew && amounts[amounts.length - 1] >= maxCap) {
        break;
      }
      if (!grew && step > maxCap) {
        break;
      }
    }
  }

  return amounts.slice(0, 3);
}
