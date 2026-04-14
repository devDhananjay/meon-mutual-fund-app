/** Shared field helpers for mandate list + detail (same as MandateScreen). */

export function formatInr(value) {
  if (value === null || value === undefined || value === '') {
    return '—';
  }
  const n = Number(value);
  if (Number.isNaN(n)) {
    return String(value);
  }
  return `₹${n.toLocaleString('en-IN', {minimumFractionDigits: 2, maximumFractionDigits: 2})}`;
}

export function formatDate(raw) {
  if (!raw) {
    return '—';
  }
  try {
    const d = new Date(raw);
    if (Number.isNaN(d.getTime())) {
      return String(raw);
    }
    return d.toLocaleDateString('en-IN', {day: '2-digit', month: 'short', year: 'numeric'});
  } catch {
    return String(raw);
  }
}

export function pickSchemeTitle(item) {
  return (
    item.scheme_name ??
    item.scheme?.scheme_name ??
    item.sip_name ??
    item.fund_name ??
    item.plan_name ??
    'Mandate'
  );
}

export function pickStatus(item) {
  return String(
    item.status ??
      item.mandate_status ??
      item.state ??
      item.approval_status ??
      item.sip_status ??
      '—',
  ).trim();
}

export function pickBank(item) {
  return String(
    item.bank_name ??
      item.bankName ??
      item.bank ??
      item.bank_details?.bank_name ??
      item.bank_details?.bankName ??
      item.ifsc_bank_name ??
      item.bank_master_name ??
      '—',
  ).trim();
}

export function pickAmount(item) {
  const v =
    item.amount ??
    item.sip_amount ??
    item.max_amount ??
    item.mandate_amount ??
    item.installment_amount;
  if (v === null || v === undefined || v === '') {
    return '—';
  }
  return formatInr(v);
}

export function pickFrequency(item) {
  return String(item.frequency ?? item.sip_frequency ?? item.interval ?? '').trim() || '—';
}

export function pickUmrn(item) {
  const u = item.umrn ?? item.UMRN ?? item.mandate_id ?? item.id ?? item.reference_id;
  return u != null && String(u).trim() !== '' ? String(u) : '—';
}

export function pickNextDebit(item) {
  return formatDate(
    item.next_debit_date ??
      item.next_sip_date ??
      item.next_execution_date ??
      item.next_payment_date,
  );
}

export function pickStartDate(item) {
  return formatDate(item.start_date ?? item.created_at ?? item.mandate_date ?? item.from_date);
}

/** DD-MM-YYYY (Figma list cards). */
export function formatDateDDMMYYYY(raw) {
  if (!raw) {
    return '—';
  }
  try {
    const d = new Date(raw);
    if (Number.isNaN(d.getTime())) {
      return String(raw);
    }
    const dd = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const yyyy = d.getFullYear();
    return `${dd}-${mm}-${yyyy}`;
  } catch {
    return String(raw);
  }
}

export function pickStartDateDD(item) {
  return formatDateDDMMYYYY(
    item.start_date ??
      item.startDate ??
      item.mandate_start_date ??
      item.mandateStartDate ??
      item.from_date ??
      item.fromDate ??
      item.created_at ??
      item.mandate_date,
  );
}

export function pickEndDateDD(item) {
  return formatDateDDMMYYYY(
    item.end_date ??
      item.endDate ??
      item.mandate_end_date ??
      item.mandateEndDate ??
      item.to_date ??
      item.toDate ??
      item.expiry_date ??
      item.expiryDate ??
      item.valid_till ??
      item.validTill,
  );
}

/** Display id e.g. #6562299 */
export function pickMandateListId(item) {
  const id =
    item.reference_id ??
    item.mandate_ref ??
    item.mandate_number ??
    item.display_id ??
    item.id ??
    item.mandate_id;
  if (id == null || String(id).trim() === '') {
    return '—';
  }
  const s = String(id).trim();
  return s.startsWith('#') ? s : `#${s}`;
}

/**
 * Payload for POST /mandate/auth/ — keys aligned with common backend patterns.
 */
export function buildMandateAuthPayload(item) {
  const umrn = item.umrn ?? item.UMRN ?? null;
  const mandateId = item.mandate_id ?? item.id ?? item.pk ?? null;
  const schemeCode =
    item.scheme_code ??
    item.scheme?.scheme_code ??
    item.scheme_code_master ??
    null;
  const payload = {};
  if (umrn != null && String(umrn).trim() !== '') {
    payload.umrn = String(umrn).trim();
  }
  if (mandateId != null && String(mandateId).trim() !== '') {
    payload.mandate_id = mandateId;
    payload.id = mandateId;
  }
  if (schemeCode != null && String(schemeCode).trim() !== '') {
    payload.scheme_code = String(schemeCode).trim();
  }
  return payload;
}
