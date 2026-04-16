import {useCallback, useEffect, useRef, useState} from 'react';
import {getSchemes, normalizeSchemesResponse} from '../services/fundsService';

/**
 * Port of web `useAllFunds` (React Query → local state).
 * Params match web `ExploreHooks` queryFn.
 */
export function useAllFunds({
  page,
  rowsPerPage,
  showMoreCount,
  isMobile,
  debouncedSearch,
  selectedCategory,
  selectedRisk,
}) {
  const [data, setData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const requestIdRef = useRef(0);

  const fetchFunds = useCallback(async () => {
    const reqId = ++requestIdRef.current;
    setIsLoading(true);
    setError(null);
    try {
      const q = debouncedSearch?.trim?.() ?? '';
      // Match web curl params closely (keys must be present even if empty).
      const params = {
        page: isMobile ? 1 : page + 1,
        page_size: isMobile ? showMoreCount : rowsPerPage,
        search: q,
        filter1: selectedCategory || '',
        filter2: selectedRisk || '',
      };
      const res = await getSchemes(params);
      if (reqId !== requestIdRef.current) {
        return;
      }
      if (res?.success) {
        setData(normalizeSchemesResponse(res.data));
      } else {
        setData({results: [], count: 0});
      }
    } catch (e) {
      if (reqId !== requestIdRef.current) {
        return;
      }
      setError(e?.message || 'Failed to load funds');
      setData({results: [], count: 0});
    } finally {
      if (reqId === requestIdRef.current) {
        setIsLoading(false);
      }
    }
  }, [
    page,
    rowsPerPage,
    showMoreCount,
    isMobile,
    debouncedSearch,
    selectedCategory,
    selectedRisk,
  ]);

  useEffect(() => {
    fetchFunds();
  }, [fetchFunds]);

  return {data, isLoading, error, refetch: fetchFunds};
}
