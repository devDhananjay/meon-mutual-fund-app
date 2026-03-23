import {useCallback, useEffect, useState} from 'react';
import {fetchOrderList, normalizeOrdersResponse} from '../services/ordersService';

export function useOrdersData() {
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
      const res = await fetchOrderList();
      if (res?.success) {
        setData(normalizeOrdersResponse(res.data));
      } else {
        setData({results: [], count: 0});
      }
    } catch (e) {
      setError(e?.message || 'Failed to load orders');
      setData({results: [], count: 0});
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
