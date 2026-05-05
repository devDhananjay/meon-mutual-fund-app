import apiClient from './apiClient';

/** Same endpoint as web `usePortfolioData` / Dashboard */
export async function fetchUserPortfolio() {
  return apiClient.get('/api/journey/mf/user/portfolio/');
}

/** My Folios list — scheme-level holdings with SIP / XSIP / lumpsum breakdown (web `detailedfolio`). */
export async function fetchDetailedFolio() {
  return apiClient.get('/api/journey/mf/user/detailedfolio/');
}
