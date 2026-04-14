/** Pick the best available trailing return for compact cards (prefer 1Y, then 3Y/5Y/7Y). */

function parseReturnNum(raw) {
  if (raw === null || raw === undefined || raw === '') {
    return null;
  }
  const s = String(raw).trim().replace('%', '').replace(',', '');
  if (!s) {
    return null;
  }
  const n = Number(s);
  return Number.isNaN(n) ? null : n;
}

export function pickTrailingReturn(fund) {
  const order = [
    ['1Y', fund?.return1y ?? fund?.return1yr ?? fund?.return1],
    ['3Y', fund?.return3y],
    ['5Y', fund?.return5y],
    ['7Y', fund?.return7y],
  ];
  for (const [period, raw] of order) {
    const n = parseReturnNum(raw);
    if (n != null) {
      return {period, value: n};
    }
  }
  return {period: '1Y', value: null};
}
