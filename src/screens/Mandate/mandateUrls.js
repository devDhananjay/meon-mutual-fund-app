/** Web app (no /v1) — same host as `baseUrl` in AppConstant. */
export const WEB_ORIGIN = 'https://mutualfunds.meon.co.in';

/** Add mandate flow (same as website). Adjust path if the site route differs. */
export const WEB_MANDATE_ADD_PATH = '/mandate/add';

export function getMandateAddUrl() {
  return `${WEB_ORIGIN}${WEB_MANDATE_ADD_PATH}`;
}
