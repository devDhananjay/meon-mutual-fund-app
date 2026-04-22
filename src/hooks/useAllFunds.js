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
  /** Last successful fetch for this search + filters (not page_size). Used to avoid showing stale rows while a new query loads. */
  const appliedFilterKeyRef = useRef(null);

  const fetchFunds = useCallback(async () => {
    const q = debouncedSearch?.trim?.() ?? '';
    const filterKey = `${q}\u0000${selectedCategory || ''}\u0000${selectedRisk || ''}`;

    const reqId = ++requestIdRef.current;
    const prevApplied = appliedFilterKeyRef.current;
    const filterOnlyChanged = prevApplied !== null && prevApplied !== filterKey;

    if (filterOnlyChanged) {
      setData(null);
    }

    setIsLoading(true);
    setError(null);
    try {
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
      appliedFilterKeyRef.current = filterKey;
    } catch (e) {
      if (reqId !== requestIdRef.current) {
        return;
      }
      setError(e?.message || 'Failed to load funds');
      setData({results: [], count: 0});
      appliedFilterKeyRef.current = filterKey;
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
