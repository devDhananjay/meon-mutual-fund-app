import apiClient from './apiClient';
import {toSchemeSlugPathSegment} from '../utils/schemeCode';

export async function getSchemeByCode(schemeCode) {
  const segment = toSchemeSlugPathSegment(schemeCode);
  if (!segment) {
    return Promise.reject({
      success: false,
      status: 0,
      message: 'Missing scheme identifier',
    });
  }
  return apiClient.get(`/api/company/mf/schemes/${segment}/`);
}

export async function getSchemeHistory(schemeId, fromDate, toDate) {
  const config = {};
  if (fromDate && toDate) {
    config.params = {from_date: fromDate, to_date: toDate};
  }
  return apiClient.get(`/api/company/mf/schemes/history/${schemeId}`, config);
}

export async function getUserHoldingFolio(schemeCode) {
  return apiClient.get('/api/journey/mf/user/holdingfolio', {
    params: {scheme_code: schemeCode},
  });
}
