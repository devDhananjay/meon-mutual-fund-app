import {useCallback, useEffect, useState} from 'react';
import {fetchMandateList, normalizeMandateResponse} from '../services/mandateService';

const EMPTY = {results: [], count: 0};

export function useMandateData() {
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
      const res = await fetchMandateList();
      if (res?.success) {
        setData(normalizeMandateResponse(res.data));
      } else {
        setData(EMPTY);
      }
    } catch (e) {
      setError(e?.message || 'Failed to load mandates');
      setData(EMPTY);
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
