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
