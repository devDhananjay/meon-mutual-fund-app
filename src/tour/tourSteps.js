/** Product tour steps by screen. Spotlight targets use `id` + refs on each screen. */

export const DASHBOARD_TOUR_STEPS = [
  {
    id: 'search',
    title: 'Search funds',
    body: 'Find any mutual fund by name and open it to invest.',
  },
  {
    id: 'holdings',
    title: 'Portfolio summary',
    body: 'Track current value, returns, invested amount, and XIRR here.',
  },
  {
    id: 'funds',
    title: 'Your holdings',
    body: 'Tap a fund to redeem or see details. Use Sort to change the view.',
  },
  {
    id: 'sip',
    title: 'Start a SIP',
    body: 'Invest every month and grow wealth systematically.',
  },
  {
    id: 'tabs',
    title: 'More to explore',
    body: 'Use tabs and Profile for Explore, Folios, Orders, Mandate, Watchlist, and more — each screen shows a short tip the first time.',
    placement: 'top',
  },
];

export const EXPLORE_TOUR_STEPS = [
  {
    id: 'search',
    title: 'Browse & search',
    body: 'Search the full fund catalog, or tap View All for filters and sorting.',
  },
  {
    id: 'filters',
    title: 'Filter funds',
    body: 'Narrow by category, risk, and returns to find funds that fit you.',
  },
];

export const FOLIOS_TOUR_STEPS = [
  {
    id: 'search',
    title: 'My Folios',
    body: 'Search your folios and open any holding for details or to invest more.',
  },
];

export const PROFILE_TOUR_STEPS = [
  {
    id: 'accounts',
    title: 'Account hub',
    body: 'Open Account Details, Orders, Mandate, Watchlist, and more from here.',
  },
  {
    id: 'settings',
    title: 'Settings',
    body: 'Theme, notifications, and replay app tips anytime.',
  },
];

export const ORDERS_TOUR_STEPS = [
  {
    id: 'search',
    title: 'My Orders',
    body: 'Search past buy, SIP, and redeem orders by fund or order id.',
  },
  {
    id: 'filter',
    title: 'Filter orders',
    body: 'Filter by status or order type to find pending payments quickly.',
  },
];

export const MANDATE_TOUR_STEPS = [
  {
    id: 'search',
    title: 'Your mandates',
    body: 'Search and filter bank mandates used for SIPs and investments.',
  },
  {
    id: 'add',
    title: 'Add a mandate',
    body: 'Tap + to create a new mandate. Authenticate it before starting SIPs.',
    placement: 'top',
  },
];

export const WATCHLIST_TOUR_STEPS = [
  {
    id: 'search',
    title: 'My Watchlist',
    body: 'Saved funds live here. Search, open a fund to invest, or remove with the bookmark.',
  },
];

export const ACCOUNT_DETAILS_TOUR_STEPS = [
  {
    id: 'tabs',
    title: 'Account details',
    body: 'Switch between Personal and Bank details. Contact support if you need updates.',
  },
];

export const INVEST_TOUR_STEPS = [
  {
    id: 'orderType',
    title: 'One-time or SIP',
    body: 'Choose a lump-sum purchase or a monthly SIP for this fund.',
  },
  {
    id: 'amount',
    title: 'Enter amount',
    body: 'Set the investment amount (and SIP date / mandate when needed), then confirm to place the order.',
  },
];

export const CART_TOUR_STEPS = [
  {
    id: 'checkout',
    title: 'Your cart',
    body: 'Add funds here from Explore, review amounts, then proceed to checkout to place the order.',
    placement: 'top',
  },
];

export const TOUR_SCREEN = {
  dashboard: 'dashboard',
  explore: 'explore',
  myFolios: 'myFolios',
  profile: 'profile',
  orders: 'orders',
  mandate: 'mandate',
  watchlist: 'watchlist',
  accountDetails: 'accountDetails',
  invest: 'invest',
  cart: 'cart',
};
