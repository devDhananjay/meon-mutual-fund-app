import {useCallback, useEffect, useState} from 'react';
import {fetchUserPortfolio} from '../services/portfolioService';

/** Normalizes API body whether wrapped in `{ data: { holdings, portfolio } }` or flat. */
export function normalizePortfolioPayload(apiBody) {
  const root = apiBody?.data ?? apiBody;
  const inner = root?.data ?? root;
  return {
    holdings: Array.isArray(inner?.holdings) ? inner.holdings : [],
    portfolio: inner?.portfolio && typeof inner.portfolio === 'object' ? inner.portfolio : {},
  };
}

/**
 * Port of web `DashboradHooks` `usePortfolioData` (React Query → hooks state).
 */
export function usePortfolioData() {
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
      const res = await fetchUserPortfolio();
      if (res?.success) {
        setData(normalizePortfolioPayload(res.data));
      } else {
        setData({holdings: [], portfolio: {}});
      }
    } catch (e) {
      setError(e?.message || 'Failed to load portfolio');
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
