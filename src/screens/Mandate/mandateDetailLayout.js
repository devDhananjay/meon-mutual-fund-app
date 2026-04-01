/**
 * Two-column detail rows (Figma: Client Data / BSE Data).
 * Uses nested `client_data` / `bse_data` when present; otherwise maps flat API fields.
 */

function first(obj, keys) {
  if (!obj || typeof obj !== 'object') {
    return '—';
  }
  for (const k of keys) {
    const v = obj[k];
    if (v != null && String(v).trim() !== '') {
      return String(v);
    }
  }
  return '—';
}

function chunkPairs(pairs, cols = 2) {
  const rows = [];
  for (let i = 0; i < pairs.length; i += cols) {
    const slice = pairs.slice(i, i + cols);
    while (slice.length < cols) {
      slice.push({label: '', value: ''});
    }
    rows.push(slice);
  }
  return rows;
}

/** @returns {{ label: string, value: string }[][]} */
export function buildClientDataRows(mandate) {
  const c = mandate?.client_data;
  if (c && typeof c === 'object' && !Array.isArray(c)) {
    const pairs = Object.keys(c).map(k => ({label: k.replace(/_/g, ' '), value: String(c[k] ?? '—')}));
    return chunkPairs(pairs);
  }

  const m = mandate || {};
  const pairs = [
    {label: 'ID', value: first(m, ['id', 'mandate_id'])},
    {label: 'Client Code', value: first(m, ['client_code', 'ucc_code', 'ucc'])},
    {label: 'Client name', value: first(m, ['client_name', 'investor_name', 'name'])},
    {label: 'Mandate Type', value: first(m, ['mandate_type', 'type'])},
    {label: 'Account Number', value: first(m, ['account_number', 'bank_account_no', 'bank_account_number'])},
    {label: 'Account Type', value: first(m, ['account_type'])},
    {label: 'IFSC Code', value: first(m, ['ifsc', 'ifsc_code'])},
    {label: 'Bank name', value: first(m, ['bank_name', 'bank'])},
    {label: 'Bank Branch', value: first(m, ['bank_branch', 'branch'])},
    {label: 'Amount', value: first(m, ['amount', 'sip_amount', 'mandate_amount'])},
    {label: 'Mandate ID', value: first(m, ['mandate_ref', 'reference_id', 'display_id'])},
    {label: 'UMRN Number', value: first(m, ['umrn', 'UMRN'])},
    {label: 'Start Date', value: first(m, ['start_date', 'mandate_start_date'])},
    {label: 'End Date', value: first(m, ['end_date', 'mandate_end_date', 'to_date'])},
  ];
  return chunkPairs(pairs);
}

/** @returns {{ label: string, value: string }[][]} */
export function buildBseDataRows(mandate) {
  const b = mandate?.bse_data;
  if (b && typeof b === 'object' && !Array.isArray(b)) {
    const pairs = Object.keys(b).map(k => ({label: k.replace(/_/g, ' '), value: String(b[k] ?? '—')}));
    return chunkPairs(pairs);
  }

  const m = mandate || {};
  const pairs = [
    {label: 'Amount', value: first(m, ['amount', 'sip_amount'])},
    {label: 'UMRNNo', value: first(m, ['umrn', 'UMRN'])},
    {label: 'Remarks', value: first(m, ['remarks', 'remark'])},
    {label: 'Bank Name', value: first(m, ['bank_name', 'bank'])},
    {label: 'Regn. Date', value: first(m, ['registration_date', 'regn_date', 'created_at'])},
    {label: 'Bank Account no.', value: first(m, ['bank_account_no', 'account_number'])},
    {label: 'Mandate ID', value: first(m, ['mandate_id', 'id', 'reference_id'])},
    {label: 'Bank Branch', value: first(m, ['bank_branch', 'branch'])},
    {label: 'Client code', value: first(m, ['client_code', 'ucc_code'])},
    {label: 'Client name', value: first(m, ['client_name', 'investor_name'])},
    {label: 'Member code', value: first(m, ['member_code', 'bse_member_code'])},
    {label: 'Upload Date', value: first(m, ['upload_date'])},
    {label: 'Mandate Type', value: first(m, ['mandate_type', 'type'])},
    {label: 'Approved Date', value: first(m, ['approved_date', 'approval_date'])},
  ];
  return chunkPairs(pairs);
}

export function formatDetailTimestamp(raw) {
  if (!raw) {
    return '—';
  }
  try {
    const d = new Date(raw);
    if (Number.isNaN(d.getTime())) {
      return String(raw);
    }
    return d.toLocaleString('en-IN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    });
  } catch {
    return String(raw);
  }
}
