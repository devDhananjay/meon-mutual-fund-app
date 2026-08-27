import apiClient from './apiClient';
import {normalizeJourneyListResponse} from './listResponseUtils';
import {baseUrl} from '../utils/AppConstant';
import {store} from '../store';
import {loadStoredSession} from './authStorage';
import {Platform} from 'react-native';

/** Web parity: SIP / mandate list (auth required). */
export async function fetchMandateList(params = {}) {
  return apiClient.get('/api/journey/mf/mandate/list/', {
    params: {
      page: 1,
      page_size: 50,
      ...params,
    },
  });
}

export function normalizeMandateResponse(apiBody) {
  return normalizeJourneyListResponse(apiBody);
}

/**
 * Web parity: e-mandate authentication (POST). Server may return a URL to complete in WebView.
 */
export async function postMandateAuth(body) {
  return apiClient.post('/api/journey/mf/mandate/auth/', body);
}

/**
 * Register new mandate (web parity). Body example:
 * { mandateType, mandate_amount, start_date, end_date } — dates as DD/MM/YYYY strings.
 */
export async function postMandateRegister(body) {
  return apiClient.post('/api/journey/mf/mandate/register/', body);
}

/** Resolve mandate id for NACH / auth APIs. */
export function pickMandateApiId(item) {
  const id = item?.mandate_id ?? item?.id ?? item?.pk ?? null;
  if (id == null || String(id).trim() === '') {
    return '';
  }
  return String(id).trim();
}

function normalizeErrorText(value) {
  return String(value ?? '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * User-facing message from NACH / journey API success or error payloads.
 * Handles apiClient reject shape, Django `errors`, nested `data`, etc.
 */
export function extractNachApiError(resOrErr, fallback = 'Something went wrong.') {
  if (resOrErr == null) {
    return fallback;
  }

  const status = resOrErr?.status;
  const payload = resOrErr?.data ?? resOrErr;
  const root = payload?.data != null && typeof payload.data === 'object' ? payload.data : payload;
  const nested = root?.data != null && typeof root.data === 'object' ? root.data : root;
  const bse = payload?.bse_response ?? root?.bse_response ?? nested?.bse_response;

  const readable =
    payload?.readable_message ??
    root?.readable_message ??
    nested?.readable_message ??
    bse?.readable_message ??
    bse?.message;
  if (readable != null && String(readable).trim() !== '') {
    return normalizeErrorText(readable);
  }

  const candidates = [];

  const push = value => {
    if (value == null) {
      return;
    }
    if (Array.isArray(value)) {
      value.forEach(push);
      return;
    }
    if (typeof value === 'object') {
      Object.values(value).forEach(push);
      return;
    }
    const text = normalizeErrorText(value);
    if (text) {
      candidates.push(text);
    }
  };

  push(payload?.errors);
  push(root?.errors);
  push(nested?.errors);
  push(bse?.errors);
  push(payload?.message);
  push(root?.message);
  push(nested?.message);
  push(bse?.message);
  push(payload?.detail);
  push(root?.detail);
  push(payload?.error);
  push(root?.error);
  push(payload?.responsestring);
  push(root?.responsestring);
  push(resOrErr?.message);

  const skipped = new Set([
    'validation failed',
    'validation error',
    'bad request',
    'request failed',
    'error',
    'failed',
  ]);
  const firstUseful = candidates.find(c => !skipped.has(c.toLowerCase()));
  if (firstUseful) {
    return firstUseful;
  }

  if (status === 413) {
    return 'File is too large. Please upload a smaller image.';
  }
  if (status === 415) {
    return 'Unsupported file type. Please upload a JPG or PNG image.';
  }
  if (status === 401 || status === 403) {
    return 'Session expired or permission denied. Please sign in again.';
  }
  if (status >= 500) {
    return 'Server error while uploading. Please try again in a moment.';
  }

  const rawMsg = normalizeErrorText(resOrErr?.message);
  if (/network/i.test(rawMsg)) {
    return 'Network error. Please check your connection and try again.';
  }
  if (/timeout/i.test(rawMsg)) {
    return 'Upload timed out. Please try again.';
  }

  return fallback;
}

async function resolveAccessToken() {
  let token = store.getState()?.auth?.accessToken;
  if (!token) {
    const session = await loadStoredSession();
    token = session?.accessToken ?? null;
  }
  return token ? String(token).trim() : '';
}

/** In-memory PDF bytes so Android nav params don't carry huge data: URIs. */
const nachPdfBase64ById = new Map();

export function stashNachPdfBase64(mandateId, base64) {
  const id = String(mandateId || '').trim();
  if (!id || !base64) {
    return;
  }
  nachPdfBase64ById.set(id, base64);
}

export function peekNachPdfBase64(mandateId) {
  const id = String(mandateId || '').trim();
  if (!id) {
    return null;
  }
  return nachPdfBase64ById.get(id) || null;
}

/**
 * Authenticated NACH PDF source for in-app WebView.
 * Uses fetch (not apiClient) so a file-endpoint 401 never triggers global logout.
 * Also avoids axios default Content-Type: application/json on this GET.
 */
export async function getNachFormDownloadSource(mandateId) {
  const id = String(mandateId || '').trim();
  console.log('[nach:download] start', {mandateId: id});
  if (!id) {
    console.error('[nach:download] missing mandate id');
    throw new Error('Mandate id is missing.');
  }

  const token = await resolveAccessToken();
  if (!token) {
    console.error('[nach:download] missing access token');
    throw new Error('Please sign in again to download the NACH form.');
  }

  const endpoint = `/api/journey/mf/nach/form/${encodeURIComponent(id)}`;
  const remoteUri = `${baseUrl}${endpoint}`;
  const fileName = `Bank_Mandate_${id}.pdf`;
  const authHeaders = {
    Authorization: `Bearer ${token}`,
    Accept: 'application/pdf,application/octet-stream,*/*',
  };

  console.log('[nach:download] request', {
    method: 'GET',
    endpoint,
    fileName,
    tokenLen: token.length,
  });

  const notFoundError = (message, data) => {
    const err = new Error(
      message || 'NACH PDF not found. Please regenerate the form first.',
    );
    err.status = 404;
    err.data = data;
    return err;
  };

  const bytesToText = data => {
    try {
      if (data == null) {
        return '';
      }
      if (typeof data === 'string') {
        return data;
      }
      const bytes =
        data instanceof ArrayBuffer
          ? new Uint8Array(data)
          : data?.byteLength != null
            ? new Uint8Array(data)
            : null;
      if (!bytes) {
        return '';
      }
      if (typeof TextDecoder !== 'undefined') {
        return new TextDecoder('utf-8').decode(bytes.subarray(0, Math.min(bytes.length, 8192)));
      }
      let out = '';
      const n = Math.min(bytes.length, 8192);
      for (let i = 0; i < n; i += 1) {
        out += String.fromCharCode(bytes[i]);
      }
      return out;
    } catch {
      return '';
    }
  };

  const messageFromBody = (data, fallback) => {
    const text = bytesToText(data);
    if (!text) {
      return fallback;
    }
    try {
      const json = JSON.parse(text);
      return (
        json?.readable_message ||
        json?.message ||
        json?.data?.readable_message ||
        json?.data?.message ||
        fallback
      );
    } catch {
      return fallback;
    }
  };

  const looksLikePdf = data => {
    try {
      const bytes =
        data instanceof ArrayBuffer
          ? new Uint8Array(data)
          : data?.byteLength != null
            ? new Uint8Array(data)
            : null;
      if (!bytes || bytes.length < 4) {
        return false;
      }
      return bytes[0] === 0x25 && bytes[1] === 0x50 && bytes[2] === 0x44 && bytes[3] === 0x46;
    } catch {
      return false;
    }
  };

  try {
    const probe = await fetch(remoteUri, {
      method: 'GET',
      headers: authHeaders,
    });

    console.log('[nach:download] probe', {
      status: probe.status,
      contentType: probe.headers?.get?.('content-type'),
    });

    const buf = await probe.arrayBuffer();

    if (probe.status === 404) {
      throw notFoundError(
        messageFromBody(buf, 'NACH PDF not found. Please regenerate the form first.'),
        buf,
      );
    }

    if (probe.status === 401 || probe.status === 403) {
      // File endpoint rejected fetch auth — don't logout; open WebView with Bearer headers
      // (same pattern that previously loaded the PDF in-app).
      console.warn('[nach:download] fetch unauthorized — fallback WebView with auth headers', {
        status: probe.status,
      });
      return {
        uri: remoteUri,
        headers: authHeaders,
        fileName,
        mandateId: id,
        remoteUri,
      };
    }

    if (!probe.ok) {
      const err = new Error(
        messageFromBody(buf, `Could not open NACH PDF (${probe.status}).`),
      );
      err.status = probe.status;
      throw err;
    }

    if (!looksLikePdf(buf)) {
      const maybeJson = messageFromBody(buf, '');
      throw notFoundError(
        maybeJson || 'NACH PDF not found. Please regenerate the form first.',
        buf,
      );
    }

    const base64 = arrayBufferToBase64(buf);
    if (!base64) {
      throw new Error('Downloaded PDF was empty.');
    }

    stashNachPdfBase64(id, base64);

    // iOS WKWebView can open data: PDFs. Android WebView cannot — viewer uses pdf.js + stash.
    const useDataUri = Platform.OS === 'ios';
    return {
      uri: useDataUri ? `data:application/pdf;base64,${base64}` : remoteUri,
      headers: useDataUri ? undefined : authHeaders,
      fileName,
      base64,
      mandateId: id,
      remoteUri,
      usePdfJs: Platform.OS === 'android',
    };
  } catch (e) {
    if (e?.status === 404 || e?.status === 401 || e?.status === 403) {
      throw e;
    }
    console.warn('[nach:download] probe failed', {
      message: e?.message,
      status: e?.status,
    });
    const err = new Error(extractNachApiError(e, e?.message || 'Could not open NACH PDF.'));
    err.status = e?.status;
    err.data = e?.data;
    throw err;
  }
}

function arrayBufferToBase64(data) {
  const bytes =
    data instanceof ArrayBuffer
      ? new Uint8Array(data)
      : data?.byteLength != null
        ? new Uint8Array(data)
        : null;
  if (!bytes || bytes.length === 0) {
    return '';
  }
  const chunkSize = 0x8000;
  let binary = '';
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode.apply(null, bytes.subarray(i, i + chunkSize));
  }
  if (typeof globalThis.btoa === 'function') {
    return globalThis.btoa(binary);
  }
  const chars =
    'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=';
  let output = '';
  for (let i = 0; i < binary.length; i += 3) {
    const a = binary.charCodeAt(i);
    const b = binary.charCodeAt(i + 1);
    const c = binary.charCodeAt(i + 2);
    const bitmap = (a << 16) | ((b || 0) << 8) | (c || 0);
    output +=
      chars.charAt((bitmap >> 18) & 63) +
      chars.charAt((bitmap >> 12) & 63) +
      (Number.isNaN(b) ? '=' : chars.charAt((bitmap >> 6) & 63)) +
      (Number.isNaN(c) ? '=' : chars.charAt(bitmap & 63));
  }
  return output;
}

/**
 * Prepare NACH PDF for device share/export.
 * Prefers an already-fetched data URI / base64; otherwise fetches via apiClient.
 */
export async function downloadNachPdfToDevice(source) {
  const fileName = String(source?.fileName || `Bank_Mandate_${Date.now()}.pdf`).replace(
    /[^\w.\-]+/g,
    '_',
  );

  const cached =
    source?.base64 ||
    (source?.mandateId ? peekNachPdfBase64(source.mandateId) : null);

  if (cached) {
    return {
      path: null,
      fileUrl: `data:application/pdf;base64,${cached}`,
      fileName,
      base64: cached,
    };
  }

  if (typeof source?.uri === 'string' && source.uri.startsWith('data:application/pdf')) {
    return {
      path: null,
      fileUrl: source.uri,
      fileName,
      base64: null,
    };
  }

  const mandateId = source?.mandateId;
  if (!mandateId) {
    throw new Error('Download URL is missing.');
  }

  console.log('[nach:download] fetching for share', {
    mandateId,
    fileName,
    platform: Platform.OS,
  });

  const fetched = await getNachFormDownloadSource(mandateId);
  const b64 = fetched.base64 || peekNachPdfBase64(mandateId);
  return {
    path: null,
    fileUrl: b64 ? `data:application/pdf;base64,${b64}` : fetched.uri,
    fileName: fetched.fileName || fileName,
    base64: b64,
  };
}

/** POST `/api/journey/mf/nach/regenerate-form/` */
export async function regenerateNachForm(mandateId) {
  const id = String(mandateId || '').trim();
  const payload = {mandate_id: id};
  console.log('[nach:regenerate] request', {
    method: 'POST',
    endpoint: '/api/journey/mf/nach/regenerate-form/',
    payload,
  });
  try {
    const res = await apiClient.post('/api/journey/mf/nach/regenerate-form/', payload);
    console.log('[nach:regenerate] response', {
      success: res?.success,
      data: res?.data,
    });
    return res;
  } catch (e) {
    console.error('[nach:regenerate] error', {
      message: e?.message,
      status: e?.status,
      endpoint: e?.endpoint,
      data: e?.data,
    });
    throw e;
  }
}

/**
 * POST multipart `/api/journey/mf/nach/upload-scan/`
 * `file` shape: { uri, type?, name? } from image picker / document.
 */
export async function uploadNachScan(mandateId, file) {
  const id = String(mandateId || '').trim();
  if (!id) {
    console.error('[nach:upload] missing mandate id');
    throw new Error('Mandate id is missing.');
  }
  if (!file?.uri) {
    console.error('[nach:upload] missing file uri', file);
    throw new Error('Please choose a signed mandate file.');
  }

  let uri = String(file.uri).trim();
  // Android crop-picker may return absolute path without scheme.
  if (Platform.OS === 'android') {
    if (uri.startsWith('/') && !uri.startsWith('file://') && !uri.startsWith('content://')) {
      uri = `file://${uri}`;
    }
  } else if (!uri.startsWith('file://') && !uri.startsWith('ph://') && !uri.startsWith('assets-library://')) {
    uri = `file://${uri}`;
  }
  if (uri.includes(' ')) {
    uri = uri.replace(/ /g, '%20');
  }

  const rawName = file.name || file.fileName || `signed_mandate_${Date.now()}.jpg`;
  const lower = String(rawName).toLowerCase();
  const name = lower.endsWith('.png') || lower.endsWith('.jpg') || lower.endsWith('.jpeg')
    ? rawName
    : `${rawName}.jpg`;
  const type =
    file.type ||
    (String(name).toLowerCase().endsWith('.png') ? 'image/png' : 'image/jpeg');

  const formData = new FormData();
  formData.append('mandate_id', id);
  formData.append('mandate_file', {
    uri,
    type,
    name,
  });

  console.log('[nach:upload] request', {
    method: 'POST',
    endpoint: '/api/journey/mf/nach/upload-scan/',
    platform: Platform.OS,
    payload: {
      mandate_id: id,
      mandate_file: {uri, type, name},
    },
  });

  try {
    const res = await apiClient.post('/api/journey/mf/nach/upload-scan/', formData, {
      headers: {
        Accept: 'application/json',
        'Content-Type': 'multipart/form-data',
      },
      timeout: 90000,
    });
    console.log('[nach:upload] response', {
      success: res?.success,
      data: res?.data,
    });
    return res;
  } catch (e) {
    const isNetwork =
      !e?.status && /network error/i.test(String(e?.message || ''));

    // Android axios + FormData often surfaces as Network Error; retry once with fetch.
    if (isNetwork && Platform.OS === 'android') {
      console.warn('[nach:upload] axios network error — retrying with fetch');
      try {
        const token = await resolveAccessToken();
        const fetchForm = new FormData();
        fetchForm.append('mandate_id', id);
        fetchForm.append('mandate_file', {uri, type, name});
        const fetchRes = await fetch(`${baseUrl}/api/journey/mf/nach/upload-scan/`, {
          method: 'POST',
          headers: {
            Accept: 'application/json',
            ...(token ? {Authorization: `Bearer ${token}`} : {}),
            // Do not set Content-Type — fetch/RN sets multipart boundary.
          },
          body: fetchForm,
        });
        const text = await fetchRes.text();
        let body = null;
        try {
          body = text ? JSON.parse(text) : null;
        } catch {
          body = {message: text};
        }
        console.log('[nach:upload] fetch retry', {
          status: fetchRes.status,
          body,
        });
        if (!fetchRes.ok) {
          const err = new Error(
            body?.readable_message ||
              body?.message ||
              `Upload failed (${fetchRes.status}).`,
          );
          err.status = fetchRes.status;
          err.data = body;
          throw err;
        }
        if (body?.success === false || body?.status === false || body?.status === 'error') {
          const err = new Error(
            body?.readable_message || body?.message || 'Upload failed. Please try again.',
          );
          err.status = fetchRes.status;
          err.data = body;
          throw err;
        }
        return {success: true, data: body};
      } catch (fetchErr) {
        console.warn('[nach:upload] fetch retry failed', {
          message: fetchErr?.message,
          status: fetchErr?.status,
        });
        if (fetchErr?.status) {
          throw fetchErr;
        }
      }
    }

    console.warn('[nach:upload] error', {
      message: e?.message,
      status: e?.status,
      endpoint: e?.endpoint,
      data: e?.data,
    });
    if (isNetwork) {
      const err = new Error(
        'Upload failed due to a network/file error. Please try again with a smaller photo.',
      );
      err.status = e?.status;
      err.data = e?.data;
      throw err;
    }
    throw e;
  }
}
