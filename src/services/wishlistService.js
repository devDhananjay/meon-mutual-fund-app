import apiClient from './apiClient';
import {normalizeJourneyListResponse} from './listResponseUtils';

/** Web parity: saved watchlist (GET). */
export async function fetchWishlist() {
  return apiClient.get('/api/journey/mf/wishlist/');
}

export function normalizeWishlistResponse(apiBody) {
  return normalizeJourneyListResponse(apiBody);
}

export async function addToWishlist(body) {
  return apiClient.post('/api/journey/mf/wishlist/add/', body);
}

export async function removeFromWishlist(schemeCode) {
  return apiClient.delete(`/api/journey/mf/wishlist/remove/${schemeCode}/`);
}
