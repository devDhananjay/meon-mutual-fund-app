import {appAlert} from '../../utils/appAlert';
import {postMandateAuth} from '../../services/mandateService';
import {buildMandateAuthPayload} from './mandateFieldUtils';

export function extractAuthUrl(resData) {
  if (resData == null) {
    return null;
  }
  const root = resData?.data ?? resData;
  const inner = root?.data ?? root;
  if (typeof inner === 'string' && /^https?:\/\//i.test(inner.trim())) {
    return inner.trim();
  }
  if (inner && typeof inner === 'object') {
    const u =
      inner.url ??
      inner.redirect_url ??
      inner.auth_url ??
      inner.web_url ??
      inner.authentication_url ??
      inner.mandate_url ??
      inner.payment_url;
    if (typeof u === 'string' && /^https?:\/\//i.test(u.trim())) {
      return u.trim();
    }
  }
  return null;
}

export function extractAuthMessage(resData) {
  const root = resData?.data ?? resData;
  const inner = root?.data ?? root;
  if (inner && typeof inner === 'object' && inner.message) {
    return String(inner.message);
  }
  if (root?.message) {
    return String(root.message);
  }
  return null;
}

/**
 * Starts e-mandate authentication (POST /mandate/auth/). Opens WebView if API returns a URL.
 */
export async function authenticateMandate(navigation, item) {
  const body = buildMandateAuthPayload(item);
  if (Object.keys(body).length === 0) {
    appAlert(
      'Authenticate',
      'This mandate is missing UMRN or ID. Try again after refreshing the list.',
    );
    return;
  }
  try {
    const res = await postMandateAuth(body);
    if (res?.success) {
      const url = extractAuthUrl(res.data);
      if (url) {
        navigation.navigate('MandateAuthWebview', {
          uri: url,
          title: 'Authenticate mandate',
        });
      } else {
        const msg =
          extractAuthMessage(res.data) ??
          'Authentication request was submitted. Check the mandate list after a short while.';
        appAlert('Authenticate', msg);
      }
    } else {
      appAlert('Authenticate', 'Request could not be completed.');
    }
  } catch (e) {
    const msg = e?.message || e?.data?.message || 'Could not start authentication.';
    appAlert('Authenticate', String(msg));
  }
}
