/**
 * Resolve folio / units / value from portfolio holding rows (web + API field variance).
 */

export function pickHoldingFolio(h) {
  if (h == null) {
    return '';
  }
  const raw = h.folio_no ?? h.folio_number ?? h.folio ?? h.client_folio ?? h.folio_id;
  return raw != null ? String(raw).trim() : '';
}

function addFolioCandidate(seen, value) {
  const s = value != null ? String(value).trim() : '';
  if (s) {
    seen.set(s, s);
  }
}

/** Unique folio numbers from a holding row + sip/xsip/lumpsum transactions. */
export function collectHoldingFolioNumbers(fund) {
  const seen = new Map();
  addFolioCandidate(seen, fund?.folio_no);
  addFolioCandidate(seen, fund?.folio_number);
  addFolioCandidate(seen, fund?.folio);
  addFolioCandidate(seen, fund?.client_folio);
  addFolioCandidate(seen, fund?.folio_id);
  addFolioCandidate(seen, fund?.folioNumber);
  for (const bucket of [fund?.lumpsum, fund?.sip, fund?.xsip]) {
    for (const t of bucket?.transactions || []) {
      addFolioCandidate(seen, t?.folio_no);
      addFolioCandidate(seen, t?.folio_number);
      addFolioCandidate(seen, t?.folio);
    }
  }
  return Array.from(seen.values());
}

export function pickHoldingUnits(h) {
  if (h == null) {
    return 0;
  }
  const raw =
    h.balance_units ??
    h.units ??
    h.holding_units ??
    h.quantity ??
    h.scheme_units ??
    h.available_units ??
    h.redeemable_units;
  const n = Number(raw);
  return Number.isFinite(n) && n >= 0 ? n : 0;
}

/** Current value in ₹ for redemption cap in amount mode */
export function pickHoldingCurrentValue(h) {
  if (h == null) {
    return 0;
  }
  const raw = h.current_holding ?? h.current_value ?? h.market_value ?? h.current_amount;
  const n = Number(raw);
  return Number.isFinite(n) && n >= 0 ? n : 0;
}
