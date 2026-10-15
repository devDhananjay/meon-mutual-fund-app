/** AsyncStorage keys — keep in sync with web session keys where applicable */
export const STORAGE_KEYS = {
  ACCESS_TOKEN: 'access_token',
  REFRESH_TOKEN: 'refresh_token',
  USER_DATA: 'user_data',
  REMEMBERED_USERNAME: 'remembered_username',
  CART_ITEMS: 'cartItems',
  THEME_MODE: 'theme_mode',
  /** JSON map of screenKey -> "1" for first-visit coach marks */
  APP_TOUR_SCREENS: 'app_tour_screens',
  /** Legacy single flag — migrated into APP_TOUR_SCREENS.dashboard */
  HAS_SEEN_APP_TOUR: 'has_seen_app_tour',
};
