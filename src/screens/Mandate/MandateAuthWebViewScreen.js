import React, {useCallback, useMemo, useState} from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  Share,
  Platform,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useNavigation, useRoute} from '@react-navigation/native';
import {WebView} from 'react-native-webview';
import {Colors} from '../../utils/AppConstant';
import Textstyles from '../../utils/text';
import {useAppTheme} from '../../theme/useAppTheme';
import AppBackButton from '../../components/AppBackButton';
import {
  downloadNachPdfToDevice,
  extractNachApiError,
  peekNachPdfBase64,
} from '../../services/mandateService';
import Snack from '../../utils/snackbar';
import {appAlert} from '../../utils/appAlert';

const PAGE_BG = '#F0F2F5';
const CARD_BORDER = '#E8E8E8';

/**
 * Android WebView cannot render application/pdf (or data: PDF URIs).
 * Render pages with PDF.js from CDN using the stashed base64.
 */
function buildAndroidPdfHtml(base64) {
  const safe = String(base64 || '').replace(/\\/g, '\\\\').replace(/'/g, "\\'");
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=4" />
  <style>
    html, body { margin: 0; padding: 0; background: #525659; }
    #wrap { padding: 10px 8px 24px; }
    canvas {
      display: block;
      margin: 0 auto 12px;
      max-width: 100%;
      height: auto;
      background: #fff;
      box-shadow: 0 1px 4px rgba(0,0,0,.35);
    }
    #err {
      color: #fff;
      font-family: sans-serif;
      padding: 20px;
      text-align: center;
    }
  </style>
  <script src="https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js"></script>
</head>
<body>
  <div id="wrap"><p id="err">Loading PDF…</p></div>
  <script>
    (function () {
      try {
        if (!window.pdfjsLib) {
          document.getElementById('err').textContent = 'PDF viewer failed to load. Check internet and retry.';
          return;
        }
        pdfjsLib.GlobalWorkerOptions.workerSrc =
          'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
        var b64 = '${safe}';
        var raw = atob(b64);
        var bytes = new Uint8Array(raw.length);
        for (var i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i);
        var wrap = document.getElementById('wrap');
        pdfjsLib.getDocument({ data: bytes }).promise.then(function (pdf) {
          wrap.innerHTML = '';
          var chain = Promise.resolve();
          for (var n = 1; n <= pdf.numPages; n++) {
            (function (pageNum) {
              chain = chain.then(function () {
                return pdf.getPage(pageNum).then(function (page) {
                  var scale = 1.35;
                  var viewport = page.getViewport({ scale: scale });
                  var canvas = document.createElement('canvas');
                  var ctx = canvas.getContext('2d');
                  canvas.width = viewport.width;
                  canvas.height = viewport.height;
                  wrap.appendChild(canvas);
                  return page.render({ canvasContext: ctx, viewport: viewport }).promise;
                });
              });
            })(n);
          }
          return chain;
        }).catch(function () {
          document.getElementById('wrap').innerHTML =
            '<p id="err">Could not render PDF on this device. Use Download instead.</p>';
        });
      } catch (e) {
        document.getElementById('wrap').innerHTML =
          '<p id="err">Could not render PDF on this device. Use Download instead.</p>';
      }
    })();
  </script>
</body>
</html>`;
}

export default function MandateAuthWebViewScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const {colors, isDark} = useAppTheme();
  const uri = route.params?.uri;
  const title = route.params?.title ?? 'Authenticate';
  const headers = route.params?.headers;
  const allowDownload = !!route.params?.allowDownload;
  const fileName = route.params?.fileName || title || 'NACH.pdf';
  const mandateId = route.params?.mandateId;
  const usePdfJs = !!route.params?.usePdfJs || Platform.OS === 'android';

  const pdfBase64 = useMemo(() => {
    if (!allowDownload) {
      return null;
    }
    return peekNachPdfBase64(mandateId);
  }, [allowDownload, mandateId]);

  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);

  const onLoadEnd = useCallback(() => {
    setLoading(false);
  }, []);

  const onLoadStart = useCallback(() => {
    setLoading(true);
  }, []);

  const webSource = useMemo(() => {
    // Android NACH PDF: render via pdf.js (native WebView cannot show PDFs).
    if (allowDownload && usePdfJs && pdfBase64) {
      return {
        html: buildAndroidPdfHtml(pdfBase64),
        baseUrl: 'https://cdnjs.cloudflare.com/',
      };
    }
    if (!uri || typeof uri !== 'string') {
      return null;
    }
    if (headers && typeof headers === 'object') {
      return {uri, headers};
    }
    return {uri};
  }, [allowDownload, headers, pdfBase64, uri, usePdfJs]);

  const onDownload = useCallback(async () => {
    if (downloading) {
      return;
    }
    setDownloading(true);
    try {
      const cached = peekNachPdfBase64(mandateId);
      const saved = await downloadNachPdfToDevice({
        uri,
        headers: headers && typeof headers === 'object' ? headers : undefined,
        fileName,
        mandateId,
        base64: cached || undefined,
      });
      console.log('[nach:download] file saved', {
        fileName: saved.fileName,
        hasBase64: Boolean(saved.base64),
      });

      try {
        if (Platform.OS === 'ios') {
          await Share.share({url: saved.fileUrl, title: saved.fileName});
        } else {
          await Share.share({
            title: saved.fileName,
            message: saved.fileName,
            url: saved.fileUrl,
          });
        }
      } catch (shareErr) {
        console.warn('[nach:download] share skipped', shareErr?.message);
        appAlert('Downloaded', `${saved.fileName} is ready to share.`);
      }
    } catch (e) {
      console.warn('[nach:download] save failed', {
        message: e?.message,
        status: e?.status,
      });
      if (e?.status === 404) {
        Snack(
          extractNachApiError(
            e,
            'NACH PDF not found. Please regenerate the form first.',
          ),
        );
      } else {
        Snack(extractNachApiError(e, 'Could not download NACH PDF.'));
      }
    } finally {
      setDownloading(false);
    }
  }, [downloading, fileName, headers, mandateId, uri]);

  if (!webSource) {
    return (
      <SafeAreaView style={[styles.safe, {backgroundColor: colors.background}]} edges={['top', 'left', 'right']}>
        <View style={[styles.topBar, {borderBottomColor: colors.border, backgroundColor: colors.background}]}>
          <View style={styles.topBarSide}>
            <AppBackButton onPress={() => navigation.goBack()} hitSlop={10} />
          </View>
          <View style={styles.topBarFill} />
          <View style={styles.topBarSide} />
        </View>
        <View style={styles.errBox}>
          <Text style={[Textstyles.medium, styles.errTxt, {color: colors.textSecondary}]}>
            {allowDownload
              ? 'PDF is not available to preview. Try Regenerate NACH PDF, then Download again.'
              : 'No authentication link available.'}
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.safe, {backgroundColor: colors.background}]} edges={['top', 'left', 'right']}>
      <View style={[styles.topBar, {borderBottomColor: colors.border, backgroundColor: colors.background}]}>
        <View style={styles.topBarSide}>
          <AppBackButton onPress={() => navigation.goBack()} hitSlop={10} />
        </View>
        <Text style={[styles.title, {color: colors.textPrimary}]} numberOfLines={1}>
          {title}
        </Text>
        <View style={[styles.topBarSide, styles.topBarSideRight]}>
          {allowDownload ? (
            <TouchableOpacity
              onPress={onDownload}
              disabled={downloading}
              hitSlop={8}
              activeOpacity={0.75}
              accessibilityLabel="Download PDF">
              {downloading ? (
                <ActivityIndicator size="small" color={colors.primary} />
              ) : (
                <Text style={[styles.downloadTxt, {color: colors.primary}]}>Download</Text>
              )}
            </TouchableOpacity>
          ) : null}
        </View>
      </View>
      {loading ? (
        <View
          style={[
            styles.loadingWrap,
            {backgroundColor: isDark ? 'rgba(0,0,0,0.5)' : 'rgba(255,255,255,0.65)'},
          ]}
          pointerEvents="none">
          <ActivityIndicator size="small" color={colors.primary} />
        </View>
      ) : null}
      <WebView
        source={webSource}
        onLoadEnd={onLoadEnd}
        onLoadStart={onLoadStart}
        startInLoadingState
        originWhitelist={['*']}
        javaScriptEnabled
        domStorageEnabled
        sharedCookiesEnabled
        allowFileAccess
        allowUniversalAccessFromFileURLs
        mixedContentMode="always"
        setSupportMultipleWindows={false}
        style={[styles.webview, {backgroundColor: colors.card}]}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {flex: 1, backgroundColor: PAGE_BG},
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    minHeight: 44,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: CARD_BORDER,
    backgroundColor: PAGE_BG,
  },
  topBarSide: {minWidth: 72, height: 44, alignItems: 'flex-start', justifyContent: 'center'},
  topBarSideRight: {alignItems: 'flex-end'},
  topBarFill: {flex: 1},
  title: {
    flex: 1,
    ...Textstyles.heading,
    fontSize: 16,
    color: Colors.TEXT_PRIMARY,
    textAlign: 'center',
    marginHorizontal: 4,
  },
  downloadTxt: {
    ...Textstyles.medium,
    fontSize: 14,
    fontWeight: '600',
  },
  webview: {flex: 1, backgroundColor: Colors.white},
  loadingWrap: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
  },
  errBox: {flex: 1, justifyContent: 'center', padding: 24},
  errTxt: {textAlign: 'center', color: Colors.GREY},
});
