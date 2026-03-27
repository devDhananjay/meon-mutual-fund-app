import apiClient from './apiClient';

/**
 * Request account deactivation (same path as web / Postman).
 * POST /api/journey/mf/user/deactivation/request/
 * Body: { mobile: string, reason: string }
 */
export async function requestAccountDeactivation({mobile, reason}) {
  return apiClient.post('/api/journey/mf/user/deactivation/request/', {
    mobile,
    reason: reason?.trim() || 'I no longer want to use this service',
  });
}
