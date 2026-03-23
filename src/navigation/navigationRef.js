import {CommonActions, createNavigationContainerRef} from '@react-navigation/native';

export const navigationRef = createNavigationContainerRef();

export function navigate(name, params) {
  if (navigationRef.isReady()) {
    navigationRef.navigate(name, params);
  }
}

/**
 * Opens FundDetail on the root stack with params. Tab screens must not use
 * `navigation.navigate('FundDetail')` alone — params often get dropped; the
 * container ref navigates on the root navigator.
 */
export function navigateToFundDetail(navigation, params) {
  if (__DEV__) {
    console.log('[navigateToFundDetail]', {params, isReady: navigationRef.isReady()});
  }
  if (navigationRef.isReady()) {
    navigationRef.navigate('FundDetail', params);
    return;
  }
  const rootNav = navigation?.getParent?.()?.getParent?.();
  if (rootNav?.dispatch) {
    if (__DEV__) {
      console.log('[navigateToFundDetail] fallback: root stack dispatch');
    }
    rootNav.dispatch(
      CommonActions.navigate({
        name: 'FundDetail',
        params,
        merge: true,
      }),
    );
    return;
  }
  if (__DEV__) {
    console.warn('[navigateToFundDetail] last resort: navigation.navigate (may drop params)');
  }
  navigation?.navigate?.('FundDetail', params);
}

/** Root stack — same pattern as FundDetail (tabs must not rely on nested navigate alone). */
export function navigateToCart(navigation) {
  if (navigationRef.isReady()) {
    navigationRef.navigate('Cart');
    return;
  }
  const rootNav = navigation?.getParent?.()?.getParent?.();
  if (rootNav?.dispatch) {
    rootNav.dispatch(CommonActions.navigate({name: 'Cart', merge: true}));
    return;
  }
  navigation?.navigate?.('Cart');
}

/** Root stack — open My Orders (no longer a bottom tab). */
export function navigateToMyOrders(navigation) {
  if (navigationRef.isReady()) {
    navigationRef.navigate('MyOrders');
    return;
  }
  const rootNav = navigation?.getParent?.()?.getParent?.();
  if (rootNav?.dispatch) {
    rootNav.dispatch(CommonActions.navigate({name: 'MyOrders', merge: true}));
    return;
  }
  navigation?.navigate?.('MyOrders');
}

/** Root stack — order detail from My Orders list. */
export function navigateToOrderDetail(navigation, params) {
  if (navigationRef.isReady()) {
    navigationRef.navigate('OrderDetail', params);
    return;
  }
  const rootNav = navigation?.getParent?.()?.getParent?.();
  if (rootNav?.dispatch) {
    rootNav.dispatch(
      CommonActions.navigate({
        name: 'OrderDetail',
        params,
        merge: true,
      }),
    );
    return;
  }
  navigation?.navigate?.('OrderDetail', params);
}

export function navigateToWatchlist(navigation) {
  if (navigationRef.isReady()) {
    navigationRef.navigate('Watchlist');
    return;
  }
  const rootNav = navigation?.getParent?.()?.getParent?.();
  if (rootNav?.dispatch) {
    rootNav.dispatch(CommonActions.navigate({name: 'Watchlist', merge: true}));
    return;
  }
  navigation?.navigate?.('Watchlist');
}

export function navigateToMandate(navigation) {
  if (navigationRef.isReady()) {
    navigationRef.navigate('Mandate');
    return;
  }
  const rootNav = navigation?.getParent?.()?.getParent?.();
  if (rootNav?.dispatch) {
    rootNav.dispatch(CommonActions.navigate({name: 'Mandate', merge: true}));
    return;
  }
  navigation?.navigate?.('Mandate');
}

/** Root stack — open All Funds list for SIP start flow. */
export function navigateToAllFundsSIP(navigation) {
  if (navigationRef.isReady()) {
    navigationRef.navigate('AllFundsSIP');
    return;
  }
  const rootNav = navigation?.getParent?.()?.getParent?.();
  if (rootNav?.dispatch) {
    rootNav.dispatch(CommonActions.navigate({name: 'AllFundsSIP', merge: true}));
    return;
  }
  navigation?.navigate?.('AllFundsSIP');
}
