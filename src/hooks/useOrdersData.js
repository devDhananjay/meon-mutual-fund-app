import {useCallback, useEffect, useRef, useState} from 'react';
import {fetchOrderList, normalizeOrdersResponse} from '../services/ordersService';

/**
 * Loads orders from GET /api/journey/mf/order/list/ with optional filters (web parity).
 * @param {object} listParams
 * @param {number} [listParams.page]
 * @param {number} [listParams.page_size]
 * @param {string} [listParams.search]
 * @param {string} [listParams.status]  e.g. COMPLETED, or '' for all
 * @param {string} [listParams.type]    e.g. SIP, or '' for all
 */
export function useOrdersData(listParams = {}) {
  const {page = 1, page_size = 50, search = '', status = '', type = ''} = listParams;

  const [data, setData] = useState(null);
  const [isPending, setIsPending] = useState(true);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const firstLoadRef = useRef(true);

  const load = useCallback(
    async () => {
      try {
        if (firstLoadRef.current) {
          setIsPending(true);
        } else {
          setRefreshing(true);
        }
        setError(null);
        const res = await fetchOrderList({
          page,
          page_size,
          search,
          status,
          type,
        });
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
        firstLoadRef.current = false;
      }
    },
    [page, page_size, search, status, type],
  );

  useEffect(() => {
    load();
  }, [load]);

  const refetch = useCallback(() => load(), [load]);

  return {data, isPending, error, refreshing, refetch};
}
