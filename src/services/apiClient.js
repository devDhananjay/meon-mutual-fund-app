import axios from 'axios';
import {CommonActions} from '@react-navigation/native';
import {navigationRef} from '../navigation/navigationRef';
import {store} from '../store';
import {logout} from '../store/slices/authSlice';
import {clearAuthStorage} from './authStorage';
import {baseUrl} from '../utils/AppConstant';

/**
 * Mirrors web `apiClient`: same base URL, Bearer token, success unwrap, 401 cleanup.
 */
const apiClient = axios.create({
  baseURL: baseUrl,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

/**
 * No Bearer: NAV history + holding folio only (public curl style).
 * Scheme detail `GET /mf/schemes/<slug>/` sends Bearer — same as web.
 */
function isPublicMfEndpoint(config) {
  const u = config.url || '';
  return (
    u.includes('/api/company/mf/schemes/history/') ||
    u.includes('/api/journey/mf/user/holdingfolio')
  );
}

/** 401 here is often bad slug / browse — not always session expiry. */
function shouldSkipLogoutOn401(config) {
  const u = config?.url || '';
  return (
    isPublicMfEndpoint(config) ||
    (u.includes('/api/company/mf/schemes/') && !u.includes('/history/'))
  );
}

apiClient.interceptors.request.use(
  config => {
    if (__DEV__) {
      console.log('[apiClient] request', {
        method: (config?.method || 'get').toUpperCase(),
        url: `${config?.baseURL || ''}${config?.url || ''}`,
        params: config?.params,
        data: config?.data,
      });
    }
    if (isPublicMfEndpoint(config)) {
      delete config.headers.Authorization;
      return config;
    }
    const token = store.getState().auth.accessToken;
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  error => Promise.reject(error),
);

async function handleUnauthorized() {
  await clearAuthStorage();
  store.dispatch(logout());
  if (navigationRef.isReady()) {
    navigationRef.dispatch(
      CommonActions.reset({
        index: 0,
        routes: [{name: 'Login'}],
      }),
    );
  }
}

apiClient.interceptors.response.use(
  response => {
    if (__DEV__) {
      console.log('[apiClient] response', {
        status: response?.status,
        method: (response?.config?.method || 'get').toUpperCase(),
        url: `${response?.config?.baseURL || ''}${response?.config?.url || ''}`,
        data: response?.data,
      });
    }
    if (response.data?.success === false) {
      return Promise.reject({
        success: false,
        data: response.data.data,
        status: response.data.status,
        message: response.data.message,
      });
    }
    return {
      success: true,
      data: response.data,
    };
  },
  error => {
    const {response, config, message: axiosMessage} = error;
    const method = (config?.method || 'get').toUpperCase();
    const fullUrl = config ? `${config.baseURL || ''}${config.url || ''}` : '';
    const errorObj = {
      success: false,
      status: response?.status,
      message:
        response?.data?.message || axiosMessage || 'Something went wrong',
      data: response?.data,
      method,
      endpoint: fullUrl,
    };

    if (response?.status === 401) {
      console.warn('[apiClient] 401 Unauthorized', {
        method,
        url: fullUrl,
        skipLogout: shouldSkipLogoutOn401(config),
        serverMessage: response?.data?.message,
      });
    } else if (__DEV__) {
      console.warn('[apiClient] HTTP error', {
        status: response?.status,
        method,
        url: fullUrl,
        message: errorObj.message,
      });
    }

    if (response?.status === 401 && !shouldSkipLogoutOn401(config)) {
      handleUnauthorized();
    }

    return Promise.reject(errorObj);
  },
);

export default apiClient;
