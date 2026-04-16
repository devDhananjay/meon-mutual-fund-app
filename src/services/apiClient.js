import axios from 'axios';
import {CommonActions} from '@react-navigation/native';
import {navigationRef} from '../navigation/navigationRef';
import {store} from '../store';
import {logout, restoreSession} from '../store/slices/authSlice';
import {clearAuthStorage, loadStoredSession, persistAuth} from './authStorage';
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

// Use a separate client for refresh calls to avoid auth interceptors.
const refreshClient = axios.create({
  baseURL: baseUrl,
  timeout: 20000,
  headers: {'Content-Type': 'application/json'},
});

function extractTokens(body) {
  // Try common shapes: {data: {tokens}}, {tokens}, {data: {access_token,...}}, raw tokens.
  const root = body?.data ?? body;
  const tokens = root?.tokens ?? root?.data?.tokens ?? body?.tokens ?? root;
  const accessToken =
    root?.access_token ??
    tokens?.access_token ??
    root?.accessToken ??
    tokens?.accessToken ??
    root?.access ??
    tokens?.access ??
    null;
  const refreshToken =
    root?.refresh_token ??
    tokens?.refresh_token ??
    root?.refreshToken ??
    tokens?.refreshToken ??
    root?.refresh ??
    tokens?.refresh ??
    null;
  return {accessToken, refreshToken};
}

async function tryRefreshWithToken(refreshToken) {
  if (!refreshToken) {
    return null;
  }

  // Candidate refresh endpoints (backend variants).
  const endpoints = [
    '/api/journey/mf/auth/token/refresh/',
    '/api/journey/mf/auth/refresh/',
    '/api/journey/mf/auth/refreshToken/',
  ];

  // Candidate payload variants (token key names).
  const payloads = [
    {refresh_token: refreshToken},
    {refresh: refreshToken},
    {refresh_token: refreshToken, refresh: refreshToken},
  ];

  for (const endpoint of endpoints) {
    for (const payload of payloads) {
      try {
        const res = await refreshClient.post(endpoint, payload);
        const tokens = extractTokens(res?.data);
        if (tokens?.accessToken) {
          return tokens;
        }
      } catch {
        // try next
      }
    }
  }

  return null;
}

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
  // schemes/list is a browsing endpoint; don't hard-logout on its 401 — let screen show error.
  if (u.includes('/api/company/schemes/list') || u.includes('/api/company/mf/schemes/list')) {
    return true;
  }
  return isPublicMfEndpoint(config);
}

apiClient.interceptors.request.use(
  async config => {
    if (__DEV__) {
      const token = store.getState().auth.accessToken;
      console.log('[apiClient] request', {
        method: (config?.method || 'get').toUpperCase(),
        url: `${config?.baseURL || ''}${config?.url || ''}`,
        params: config?.params,
        data: config?.data,
        tokenPresent: Boolean(token),
        tokenLen: token ? String(token).length : 0,
      });
    }
    config.headers = config.headers || {};
    if (isPublicMfEndpoint(config)) {
      delete config.headers.Authorization;
      return config;
    }

    // Prefer Redux token; if missing (cold start / screen race), fall back to AsyncStorage.
    let token = store.getState().auth.accessToken;
    if (!token) {
      const session = await loadStoredSession();
      token = session?.accessToken ?? null;
    }

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
  const resetToLogin = () => {
    if (navigationRef.isReady()) {
      navigationRef.dispatch(
        CommonActions.reset({
          index: 0,
          routes: [{name: 'Login'}],
        }),
      );
    }
  };

  // If navigation isn't ready yet, schedule a retry.
  resetToLogin();
  setTimeout(resetToLogin, 250);
  setTimeout(resetToLogin, 1000);
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
  async error => {
    const {response, config, message: axiosMessage} = error;
    const method = (config?.method || 'get').toUpperCase();
    const fullUrl = config ? `${config.baseURL || ''}${config.url || ''}` : '';
    const baseMessage = response?.data?.message || axiosMessage || 'Something went wrong';
    const errorObj = {
      success: false,
      status: response?.status,
      message:
        response?.status === 401 ? `401 Unauthorized${fullUrl ? `: ${fullUrl}` : ''}` : baseMessage,
      data: response?.data,
      method,
      endpoint: fullUrl,
    };

    if (response?.status === 401) {
      console.warn('[apiClient] 401 Unauthorized', {
        method,
        url: fullUrl,
        params: config?.params,
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

    if (response?.status === 401) {
      // Refresh flow:
      // 1) attempt refresh using stored refresh token
      // 2) if success, retry original request
      // 3) if fail, logout only when allowed (based on endpoint)
      if (!config?._retry401) {
        config._retry401 = true;
        try {
          const state = store.getState();
          const session = await loadStoredSession();
          const refreshToken = state?.auth?.refreshToken ?? session?.refreshToken;
          const user = state?.auth?.user ?? session?.user ?? null;

          const newTokens = await tryRefreshWithToken(refreshToken);
          if (newTokens?.accessToken) {
            const nextRefresh = newTokens?.refreshToken ?? refreshToken ?? null;
            await persistAuth({
              accessToken: newTokens.accessToken,
              refreshToken: nextRefresh,
              user,
            });
            store.dispatch(
              restoreSession({
                accessToken: newTokens.accessToken,
                refreshToken: nextRefresh,
                user,
              }),
            );
            config.headers = config.headers || {};
            config.headers.Authorization = `Bearer ${newTokens.accessToken}`;
            return apiClient.request(config);
          }
        } catch {
          // continue to logout decision below
        }
      }

      if (!shouldSkipLogoutOn401(config)) {
        handleUnauthorized();
      }
    }

    return Promise.reject(errorObj);
  },
);

export default apiClient;
