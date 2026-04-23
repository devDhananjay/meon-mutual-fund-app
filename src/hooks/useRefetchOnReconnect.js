import {useEffect, useRef} from 'react';
import NetInfo from '@react-native-community/netinfo';

function computeOnline(state) {
  if (!state) {
    return false;
  }
  if (state.isConnected === false) {
    return false;
  }
  if (state.isInternetReachable === false) {
    return false;
  }
  return true;
}

/**
 * Refetch when connectivity changes (offline → online or online → offline).
 * Offline refetch lets API fail so hooks set `error` immediately without manual refresh.
 */
export function useRefetchOnReconnect(refetch, {enabled = true} = {}) {
  const wasOnlineRef = useRef(null);
  const lastRefetchAtRef = useRef(0);

  useEffect(() => {
    if (!enabled || typeof refetch !== 'function') {
      return undefined;
    }

    const throttledRefetch = () => {
      const now = Date.now();
      if (now - lastRefetchAtRef.current > 1500) {
        lastRefetchAtRef.current = now;
        refetch();
      }
    };

    const onConnectivityChange = state => {
      const isOnline = computeOnline(state);
      const prev = wasOnlineRef.current;

      if (prev === null) {
        wasOnlineRef.current = isOnline;
        return;
      }

      if (prev !== isOnline) {
        throttledRefetch();
      }
      wasOnlineRef.current = isOnline;
    };

    NetInfo.fetch().then(state => {
      wasOnlineRef.current = computeOnline(state);
    });

    const unsubscribe = NetInfo.addEventListener(onConnectivityChange);

    return unsubscribe;
  }, [enabled, refetch]);
}
