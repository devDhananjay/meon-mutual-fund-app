import apiClient from './apiClient';

/** Same endpoint as web `usePortfolioData` / Dashboard */
export async function fetchUserPortfolio() {
  return apiClient.get('/api/journey/mf/user/portfolio/');
}
