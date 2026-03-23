/** Shared order field pickers for list + detail screens. */

export function pickOrderTitle(item) {
  return (
    item.scheme_name ??
    item.base_scheme_name ??
    item.scheme?.scheme_name ??
    item.fund_name ??
    'Order'
  );
}

export function pickOrderAmountRaw(item) {
  return item.amount ?? item.order_amount ?? item.total_amount ?? item.investment_amount ?? item.nav_amount;
}

export function pickOrderStatus(item) {
  return String(item.status ?? item.order_status ?? item.state ?? '—').trim();
}

export function pickOrderType(item) {
  return String(item.buy_sell_display ?? item.buy_sell_display ?? item.buy_sell_display ?? item.buy_sell_display ?? '').trim();
}

export function pickOrderDate(item) {
  return (
    item.created_at ??
    item.order_date ??
    item.date ??
    item.nav_date ??
    item.updated_at
  );
}

export function pickCompletedDate(item) {
  return (
    item.completed_at ??
    item.completed_on ??
    item.execution_date ??
    item.settlement_date ??
    item.updated_at
  );
}

export function pickNavDate(item) {
  return item.nav_date ?? item.nav_applicable_date ?? item.price_date ?? null;
}

export function pickFolio(item) {
  const v =
    item.folio_no ??
    item.folio_number ??
    item.folio ??
    item.folio_id ??
    item.client_folio;
  return v != null && String(v).trim() !== '' ? String(v) : null;
}

export function pickOrderIdDisplay(item) {
  return (
    item.order_id ??
    item.order_reference ??
    item.reference_id ??
    item.transaction_id ??
    item.id ??
    null
  );
}

export function normalizeStatusKey(s) {
  return String(s || '').replace(/\s+/g, '_').toUpperCase();
}

/** Human-readable type label for UI (Figma: One-time, Redeem, SIP). */
export function formatOrderTypeLabel(raw) {
  const t = String(raw || '').toLowerCase();
  if (!t) {
    return '—';
  }
  if (t.includes('redeem') || t.includes('redemption') || t === 'sell') {
    return 'Redeem';
  }
  if (t.includes('sip')) {
    return 'SIP';
  }
  if (t.includes('lump') || t.includes('one') || t.includes('purchase') || t === 'buy') {
    return 'One-time';
  }
  return raw || '—';
}

export function statusCategory(status) {
  const key = normalizeStatusKey(status);
  if (key.includes('FAIL') || key.includes('REJECT')) {
    return 'failed';
  }
  if (
    key.includes('SUCCESS') ||
    key.includes('COMPLETE') ||
    key.includes('EXECUTED') ||
    key.includes('SETTLED')
  ) {
    return 'success';
  }
  if (key.includes('PROGRESS') || key.includes('PENDING') || key.includes('PROCESS')) {
    return 'progress';
  }
  return 'other';
}
