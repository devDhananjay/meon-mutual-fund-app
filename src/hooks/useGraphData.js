import {useCallback, useEffect, useState} from 'react';
import {getSchemeHistory} from '../services/fundSchemeService';

function dateRangeForTimeFrame(timeFrame) {
  const toDate = new Date();
  const fromDate = new Date();
  switch (timeFrame) {
    case '1M':
      fromDate.setMonth(toDate.getMonth() - 1);
      break;
    case '2M':
      fromDate.setMonth(toDate.getMonth() - 2);
      break;
    case '3M':
      fromDate.setMonth(toDate.getMonth() - 3);
      break;
    case '6M':
      fromDate.setMonth(toDate.getMonth() - 6);
      break;
    case '1Y':
      fromDate.setFullYear(toDate.getFullYear() - 1);
      break;
    default:
      fromDate.setMonth(toDate.getMonth() - 6);
  }
  const fmt = d => d.toISOString().split('T')[0];
  return {from_date: fmt(fromDate), to_date: fmt(toDate)};
}

/** Port of web `useGraphData` using `apiClient` (auth from Redux). */
export function useGraphData(schemeId, timeFrame) {
  const [data, setData] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  const load = useCallback(async () => {
    if (!schemeId) {
      setData([]);
      return;
    }
    setIsLoading(true);
    try {
      const {from_date, to_date} = dateRangeForTimeFrame(timeFrame);
      const res = await getSchemeHistory(schemeId, from_date, to_date);
      if (res?.success) {
        const body = res.data;
        const results = body?.results;
        const nav =
          Array.isArray(results) ? results : results?.nav_history != null ? results.nav_history : [];
        setData(Array.isArray(nav) ? nav : []);
      } else {
        setData([]);
      }
    } catch {
      setData([]);
    } finally {
      setIsLoading(false);
    }
  }, [schemeId, timeFrame]);

  useEffect(() => {
    load();
  }, [load]);

  return {data, isLoading, refetch: load};
}
