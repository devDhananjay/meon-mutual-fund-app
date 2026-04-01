import {useCallback, useEffect, useState} from 'react';
import {getSchemeByCode, getUserHoldingFolio} from '../services/fundSchemeService';

/**
 * Port of web `useFundData` — scheme detail + user holdings for this scheme.
 * NAV chart uses `useGraphData` separately.
 */
export function useFundData(schemeCode) {
  const [data, setData] = useState(null);
  const [isLoading, setIsLoading] = useState(!!schemeCode);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    if (!schemeCode) {
      setData(null);
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const res = await getSchemeByCode(schemeCode);
      if (!res?.success) {
        setData(null);
        return;
      }
      const body = res.data;
      const schemeData = body?.scheme_data;
      const schemeId = schemeData?.scheme_id;
      const code = schemeData?.scheme_code ?? schemeCode;

      let holdingsData = [];
      let holdingAnalysis = null;

      if (code) {
        const folioRes = await getUserHoldingFolio(code);
        if (folioRes?.success) {
          const b = folioRes.data;
          holdingsData = b?.holdings ?? [];
          holdingAnalysis = b?.holding_analysis ?? null;
        }
      }

      setData({
        schemeData,
        schemeId,
        orderInfo: body?.order_data,
        isOrder: body?.status,
        logo_url: body?.logo_url,
        wish_flag: body?.wish_flag,
        holdingsData,
        holdingAnalysis,
      });
    } catch (e) {
      setError(e?.message || 'Failed to load fund');
      setData(null);
    } finally {
      setIsLoading(false);
    }
  }, [schemeCode]);

  useEffect(() => {
    load();
  }, [load]);

  return {data, isLoading, error, refetch: load};
}
