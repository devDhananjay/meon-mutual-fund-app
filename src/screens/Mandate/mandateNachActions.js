import {
  extractNachApiError,
  getNachFormDownloadSource,
  pickMandateApiId,
  regenerateNachForm,
  stashNachPdfBase64,
} from '../../services/mandateService';
import {appAlert} from '../../utils/appAlert';
import Snack from '../../utils/snackbar';
import {Platform} from 'react-native';

/** Opens authenticated NACH PDF in the existing WebView screen. */
export async function runDownloadNachPdf(mandate, navigation) {
  const mandateId = pickMandateApiId(mandate);
  console.log('[nach:download] action start', {
    mandateId,
    rawMandateKeys: mandate ? Object.keys(mandate) : [],
  });
  if (!mandateId) {
    console.error('[nach:download] action aborted — no mandate id');
    Snack('Mandate id is missing for this record.');
    return;
  }
  try {
    const source = await getNachFormDownloadSource(mandateId);
    if (source?.base64 && source?.mandateId) {
      stashNachPdfBase64(source.mandateId, source.base64);
    }
    console.log('[nach:download] opening webview', {
      fileName: source.fileName,
      usePdfJs: !!source.usePdfJs,
      platform: Platform.OS,
      hasAuthHeader: Boolean(source.headers?.Authorization),
      hasBase64: Boolean(source.base64),
    });
    if (!navigation?.navigate) {
      console.error('[nach:download] navigation unavailable');
      Snack('Unable to open PDF viewer.');
      return;
    }
    // Never put large base64 / data: URIs into Android navigation params.
    navigation.navigate('MandateAuthWebview', {
      uri: source.usePdfJs ? undefined : source.uri,
      headers: source.usePdfJs ? undefined : source.headers,
      title: source.fileName || 'NACH PDF',
      fileName: source.fileName,
      allowDownload: true,
      mandateId: source.mandateId || mandateId,
      usePdfJs: !!source.usePdfJs,
      remoteUri: source.remoteUri,
    });
    console.log('[nach:download] webview opened');
  } catch (e) {
    console.warn('[nach:download] action error', {
      message: e?.message,
      status: e?.status,
      data: e?.data,
    });
    if (e?.status === 404) {
      Snack(
        extractNachApiError(
          e,
          'NACH PDF not found. Please regenerate the form first.',
        ),
      );
      return;
    }
    Snack(extractNachApiError(e, 'Could not open NACH PDF.'));
  }
}

export async function runRegenerateNachPdf(mandate) {
  const mandateId = pickMandateApiId(mandate);
  console.log('[nach:regenerate] action start', {mandateId});
  if (!mandateId) {
    console.error('[nach:regenerate] action aborted — no mandate id');
    appAlert('Regenerate NACH PDF', 'Mandate id is missing for this record.');
    return;
  }
  try {
    const res = await regenerateNachForm(mandateId);
    const body = res?.data;
    console.log('[nach:regenerate] action result', {body});
    if (body?.status === 'error' || body?.success === false) {
      const msg = extractNachApiError({data: body}, 'Could not regenerate NACH PDF.');
      console.error('[nach:regenerate] API status error', {msg, body});
      appAlert('Regenerate failed', msg);
      return;
    }
    const okMsg = extractNachApiError(res, 'NACH form regenerated successfully.');
    console.log('[nach:regenerate] success', {okMsg});
    appAlert('Regenerate successful', okMsg);
  } catch (e) {
    console.error('[nach:regenerate] action error', {
      message: e?.message,
      status: e?.status,
      data: e?.data,
    });
    appAlert('Regenerate failed', extractNachApiError(e, 'Could not regenerate NACH PDF.'));
  }
}
