import {useCallback, useEffect, useState} from 'react';
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

  const fetchFunds = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const params = {
        page: isMobile ? 1 : page + 1,
        page_size: isMobile ? showMoreCount : rowsPerPage,
        search: debouncedSearch,
        filter1: selectedCategory,
        filter2: selectedRisk,
      };
      const res = await getSchemes(params);
      if (res?.success) {
        setData(normalizeSchemesResponse(res.data));
      } else {
        setData({results: [], count: 0});
      }
    } catch (e) {
      setError(e?.message || 'Failed to load funds');
      setData({results: [], count: 0});
    } finally {
      setIsLoading(false);
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
