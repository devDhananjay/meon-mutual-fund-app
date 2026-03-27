import {useCallback, useEffect, useState} from 'react';
import {fetchMandateList, normalizeMandateResponse} from '../services/mandateService';

const EMPTY = {results: [], count: 0};

/** Stable default — `listParams = {}` creates a new object every render and breaks useCallback/useEffect deps. */
const DEFAULT_LIST_PARAMS = Object.freeze({});

export function useMandateData(listParams = DEFAULT_LIST_PARAMS) {
  const [data, setData] = useState(null);
  const [isPending, setIsPending] = useState(true);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(
    async (isRefresh = false) => {
    try {
      if (__DEV__) {
        console.log('[useMandateData] fetchMandateList start', {isRefresh, listParams});
      }
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setIsPending(true);
      }
      setError(null);
      const res = await fetchMandateList(listParams);
      if (res?.success) {
        setData(normalizeMandateResponse(res.data));
      } else {
        setData(EMPTY);
      }
    } catch (e) {
      setError(e?.message || 'Failed to load mandates');
      setData(EMPTY);
    } finally {
      if (__DEV__) {
        console.log('[useMandateData] fetchMandateList done', {isRefresh});
      }
      setIsPending(false);
      setRefreshing(false);
    }
    },
    [listParams],
  );

  useEffect(() => {
    load(false);
  }, [load]);

  const refetch = useCallback(() => load(true), [load]);

  return {data, isPending, error, refreshing, refetch};
}
