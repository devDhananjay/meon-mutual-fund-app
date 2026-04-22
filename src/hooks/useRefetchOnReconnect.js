import {useEffect, useRef} from 'react';
import NetInfo from '@react-native-community/netinfo';

/**
 * Auto-refetch data when connectivity returns after being offline.
 */
export function useRefetchOnReconnect(refetch, {enabled = true} = {}) {
  const wasOnlineRef = useRef(null);
  const lastRefetchAtRef = useRef(0);

  useEffect(() => {
    if (!enabled || typeof refetch !== 'function') {
      return undefined;
    }

    const computeOnline = state => Boolean(state?.isConnected && (state?.isInternetReachable ?? true));

    const maybeRefetch = isOnline => {
      if (wasOnlineRef.current === false && isOnline) {
        const now = Date.now();
        // Guard against duplicate reconnect events firing in quick succession.
        if (now - lastRefetchAtRef.current > 1500) {
          lastRefetchAtRef.current = now;
          refetch();
        }
      }
      wasOnlineRef.current = isOnline;
    };

    NetInfo.fetch().then(state => {
      wasOnlineRef.current = computeOnline(state);
    });

    const unsubscribe = NetInfo.addEventListener(state => {
      maybeRefetch(computeOnline(state));
    });

    return unsubscribe;
  }, [enabled, refetch]);
}

