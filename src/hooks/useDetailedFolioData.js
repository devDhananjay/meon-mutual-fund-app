import {useCallback, useEffect, useState} from 'react';
import {fetchDetailedFolio} from '../services/portfolioService';

function pickFirstFolioNo(fund) {
  for (const bucket of [fund?.lumpsum, fund?.sip, fund?.xsip]) {
    for (const t of bucket?.transactions || []) {
      const fn = t?.folio_no;
      if (fn != null && String(fn).trim() !== '') {
        return String(fn).trim();
      }
    }
  }
  return null;
}

function pickAmcName(fund) {
  if (fund?.amc_name != null && String(fund.amc_name).trim() !== '') {
    return String(fund.amc_name).trim();
  }
  for (const bucket of [fund?.lumpsum, fund?.sip, fund?.xsip]) {
    for (const t of bucket?.transactions || []) {
      const a = t?.amc_name;
      if (a != null && String(a).trim() !== '') {
        return String(a).trim();
      }
    }
  }
  return undefined;
}

function sumTxnUnits(fund) {
  let u = 0;
  let any = false;
  for (const bucket of [fund?.lumpsum, fund?.sip, fund?.xsip]) {
    for (const t of bucket?.transactions || []) {
      const n = Number(t?.units);
      if (!Number.isNaN(n)) {
        u += n;
        any = true;
      }
    }
  }
  return any ? u : null;
}

/**
 * Maps `/detailedfolio/` fund rows + legacy holding rows to what My Folios / Folio Detail expect
 * (`amount`, `total_return_per`, `folio_no`, `units`, `amc_name`).
 */
export function enrichHoldingForUi(h) {
  if (!h || typeof h !== 'object') {
    return h;
  }
  const out = {...h};

  if (out.amount == null && out.total_invested != null) {
    out.amount = out.total_invested;
  }

  if (out.total_return_per == null && out.total_invested != null && out.total_return != null) {
    const inv = Number(out.total_invested);
    const tr = Number(out.total_return);
    if (inv && !Number.isNaN(tr)) {
      out.total_return_per = (tr / inv) * 100;
    }
  }

  const existingFolio = out.folio_no != null && String(out.folio_no).trim() !== '' ? String(out.folio_no).trim() : null;
  if (!existingFolio) {
    const picked = pickFirstFolioNo(out);
    if (picked) {
      out.folio_no = picked;
    }
  }

  if (out.units == null || out.units === '') {
    const s = sumTxnUnits(out);
    if (s != null) {
      out.units = s;
    }
  }

  if (out.amc_name == null || String(out.amc_name).trim() === '') {
    const amc = pickAmcName(out);
    if (amc) {
      out.amc_name = amc;
    }
  }

  return out;
}

/**
 * Normalizes detailed folio API body to the same `{ holdings, portfolio }` shape as portfolio.
 * Live API: `{ fund_count, funds: [...] }` (each fund has sip / xsip / lumpsum + transactions).
 */
export function normalizeDetailedFolioPayload(apiBody) {
  const root = apiBody?.data ?? apiBody;
  const inner = root?.data ?? root;

  let holdings = [];
  if (Array.isArray(inner?.funds)) {
    holdings = inner.funds;
  } else if (Array.isArray(inner)) {
    holdings = inner;
  } else if (Array.isArray(inner?.holdings)) {
    holdings = inner.holdings;
  } else if (Array.isArray(inner?.results)) {
    holdings = inner.results;
  } else if (Array.isArray(inner?.detailed_holdings)) {
    holdings = inner.detailed_holdings;
  } else if (Array.isArray(inner?.detailed_folios)) {
    holdings = inner.detailed_folios;
  } else if (Array.isArray(inner?.folios)) {
    holdings = inner.folios;
  }

  const portfolio =
    inner?.portfolio && typeof inner.portfolio === 'object'
      ? inner.portfolio
      : root?.portfolio && typeof root.portfolio === 'object'
        ? root.portfolio
        : {};

  return {
    holdings: holdings.map(enrichHoldingForUi),
    portfolio,
  };
}

/** My Folios tab — uses `/user/detailedfolio/` instead of portfolio summary. */
export function useDetailedFolioData() {
  const [data, setData] = useState(null);
  const [isPending, setIsPending] = useState(true);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setIsPending(true);
      }
      setError(null);
      const res = await fetchDetailedFolio();
      if (res?.success) {
        setData(normalizeDetailedFolioPayload(res.data));
      } else {
        setData({holdings: [], portfolio: {}});
      }
    } catch (e) {
      setError(e?.message || 'Failed to load folios');
      setData({holdings: [], portfolio: {}});
    } finally {
      setIsPending(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load(false);
  }, [load]);

  const refetch = useCallback(() => load(true), [load]);

  return {data, isPending, error, refreshing, refetch};
}
