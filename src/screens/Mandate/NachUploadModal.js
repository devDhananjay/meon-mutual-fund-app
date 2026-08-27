import React, {useCallback, useMemo, useState} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Image,
} from 'react-native';
import ImagePicker from 'react-native-image-crop-picker';
import AppModal from '../../components/AppModal';
import {extractNachApiError, pickMandateApiId, uploadNachScan} from '../../services/mandateService';
import {appAlert} from '../../utils/appAlert';
import Textstyles from '../../utils/text';
import {useAppTheme} from '../../theme/useAppTheme';
import Icons from '../../utils/icons';

/** BSE upload-scan limit from API: "accepts files up to 30 KB only". */
const MAX_UPLOAD_BYTES = 30 * 1024;

function isPickerCancelled(err) {
  const code = String(err?.code || '');
  const msg = String(err?.message || err || '').toLowerCase();
  return (
    code === 'E_PICKER_CANCELLED' ||
    msg.includes('cancelled') ||
    msg.includes('canceled') ||
    msg.includes('user cancelled')
  );
}

/** Meon CRM style: FormData uses crop-picker `path` + `mime`. */
function toUploadFile(img) {
  const path = img?.path || img?.sourceURL || '';
  if (!path) {
    throw new Error('No image selected.');
  }
  let uri = String(path);
  if (!uri.startsWith('file://') && !uri.startsWith('content://') && !uri.startsWith('ph://')) {
    uri = `file://${uri}`;
  }
  // Prefer a simple stable filename — some Android servers reject odd names.
  const ext = (img?.mime || '').includes('png') ? 'png' : 'jpg';
  return {
    uri,
    type: img?.mime || 'image/jpeg',
    name: img?.filename && /\.(jpe?g|png)$/i.test(img.filename) ? img.filename : `signed_mandate.${ext}`,
    size: img?.size,
  };
}

function formatKb(bytes) {
  if (bytes == null || Number.isNaN(Number(bytes))) {
    return '—';
  }
  return `${(Number(bytes) / 1024).toFixed(1)} KB`;
}

/**
 * Pick/capture then aggressively compress until <= 30 KB (BSE limit).
 */
async function pickCompressedNachImage(type) {
  const baseOpts = {
    mediaType: 'photo',
    cropping: true,
    freeStyleCropEnabled: true,
    forceJpg: true,
    includeExif: false,
    compressImageMaxWidth: 720,
    compressImageMaxHeight: 960,
    compressImageQuality: 0.45,
    width: 720,
    height: 960,
  };

  let img =
    type === 'Camera'
      ? await ImagePicker.openCamera(baseOpts)
      : await ImagePicker.openPicker(baseOpts);

  console.log('[nach:upload] initial pick size', {
    size: img?.size,
    sizeKb: formatKb(img?.size),
    limitKb: '30.0 KB',
  });

  const steps = [
    {width: 560, height: 720, compressImageQuality: 0.35},
    {width: 420, height: 560, compressImageQuality: 0.28},
    {width: 320, height: 420, compressImageQuality: 0.22},
    {width: 260, height: 340, compressImageQuality: 0.16},
    {width: 200, height: 280, compressImageQuality: 0.12},
  ];

  for (const step of steps) {
    if (img?.size != null && Number(img.size) <= MAX_UPLOAD_BYTES) {
      break;
    }
    console.log('[nach:upload] recompressing', {
      fromKb: formatKb(img?.size),
      ...step,
    });
    img = await ImagePicker.openCropper({
      path: img.path,
      mediaType: 'photo',
      cropping: true,
      forceJpg: true,
      includeExif: false,
      compressImageMaxWidth: step.width,
      compressImageMaxHeight: step.height,
      width: step.width,
      height: step.height,
      compressImageQuality: step.compressImageQuality,
    });
    console.log('[nach:upload] after recompress', {
      size: img?.size,
      sizeKb: formatKb(img?.size),
    });
  }

  if (img?.size != null && Number(img.size) > MAX_UPLOAD_BYTES) {
    throw new Error(
      `Image is still ${formatKb(img.size)} after compression. BSE accepts max 30 KB. Please crop tighter or use a simpler photo.`,
    );
  }

  return img;
}

export default function NachUploadModal({visible, mandate, onClose, onSuccess}) {
  const {colors, isDark} = useAppTheme();
  const styles = useMemo(() => createStyles(colors, isDark), [colors, isDark]);
  const [uploading, setUploading] = useState(false);

  const mandateId = useMemo(() => pickMandateApiId(mandate || {}), [mandate]);

  const showUploadMessage = useCallback(
    msg => {
      const text = String(msg || 'Something went wrong.').trim();
      // Close sheet first — AppModal sits above AppAlertHost and hides the alert.
      onClose?.();
      setTimeout(() => {
        appAlert('', text, [{text: 'OK'}]);
      }, 280);
    },
    [onClose],
  );

  const uploadPickedImage = useCallback(
    async img => {
      console.log('[nach:upload] picker result', {
        path: img?.path,
        mime: img?.mime,
        filename: img?.filename,
        size: img?.size,
        sizeKb: formatKb(img?.size),
        width: img?.width,
        height: img?.height,
      });
      if (!mandateId) {
        const msg = 'Mandate id is missing for this record.';
        console.warn('[nach:upload] action aborted — no mandate id');
        showUploadMessage(msg);
        return;
      }
      setUploading(true);
      try {
        const file = toUploadFile(img);
        console.log('[nach:upload] prepared file', {
          ...file,
          sizeKb: formatKb(file.size),
          maxKb: '30.0 KB',
        });
        const res = await uploadNachScan(mandateId, file);
        const body = res?.data;
        console.log('[nach:upload] action result', {body});
        if (body?.status === 'error' || body?.success === false || body?.status === false) {
          const msg = extractNachApiError({data: body}, 'Upload failed. Please try again.');
          console.warn('[nach:upload] API response', {msg, body});
          showUploadMessage(msg);
          return;
        }
        const okMsg = extractNachApiError(res, 'Signed NACH uploaded successfully.');
        console.log('[nach:upload] success', {okMsg});
        showUploadMessage(okMsg);
        onSuccess?.();
      } catch (e) {
        const msg = extractNachApiError(e, 'Could not upload signed NACH. Please try again.');
        console.warn('[nach:upload] action response', {
          message: msg,
          status: e?.status,
          data: e?.data,
        });
        showUploadMessage(msg);
      } finally {
        setUploading(false);
      }
    },
    [mandateId, onSuccess, showUploadMessage],
  );

  const imageEdit = useCallback(
    type => {
      if (uploading) {
        return;
      }
      console.log('[nach:upload] opening picker', {type, mandateId, maxBytes: MAX_UPLOAD_BYTES});
      pickCompressedNachImage(type)
        .then(img => uploadPickedImage(img))
        .catch(err => {
          if (isPickerCancelled(err)) {
            console.log('[nach:upload] picker cancelled', {type});
            return;
          }
          console.warn('[nach:upload] picker error', {
            type,
            code: err?.code,
            message: err?.message,
          });
          showUploadMessage(
            extractNachApiError(
              err,
              'Could not open camera or gallery. Please check permissions and try again.',
            ),
          );
        });
    },
    [mandateId, showUploadMessage, uploadPickedImage, uploading],
  );

  if (!visible) {
    return null;
  }

  return (
    <AppModal
      visible={visible}
      onClose={() => {
        if (!uploading) {
          onClose?.();
        }
      }}
      title="Upload signed NACH"
      subtitle="Choose camera or gallery. Image is auto-compressed to max 30 KB (BSE limit)."
      isBottomSheet
      maxHeight="56%">
      {!mandateId ? (
        <Text style={styles.hintTxt}>Mandate id is missing for this record.</Text>
      ) : (
        <View style={styles.list}>
          <TouchableOpacity
            style={[styles.row, styles.rowBorder]}
            onPress={() => imageEdit('Camera')}
            disabled={uploading}
            activeOpacity={0.85}>
            <View style={[styles.iconWrap, {backgroundColor: isDark ? 'rgba(30,129,242,0.18)' : '#EAF4FF'}]}>
              <Image source={Icons.EyeIcon} style={[styles.rowIcon, {tintColor: colors.primary}]} resizeMode="contain" />
            </View>
            <View style={styles.rowTextWrap}>
              <Text style={styles.rowTitle}>Camera</Text>
              <Text style={styles.rowSub}>Capture signed NACH form</Text>
            </View>
            <Image source={Icons.GoIcon} style={styles.chevron} resizeMode="contain" />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.row}
            onPress={() => imageEdit('Album')}
            disabled={uploading}
            activeOpacity={0.85}>
            <View style={[styles.iconWrap, {backgroundColor: isDark ? 'rgba(30,129,242,0.18)' : '#EAF4FF'}]}>
              <Image
                source={Icons.ImportExternalFunds}
                style={[styles.rowIcon, {tintColor: colors.primary}]}
                resizeMode="contain"
              />
            </View>
            <View style={styles.rowTextWrap}>
              <Text style={styles.rowTitle}>Gallery</Text>
              <Text style={styles.rowSub}>Choose an existing photo</Text>
            </View>
            <Image source={Icons.GoIcon} style={styles.chevron} resizeMode="contain" />
          </TouchableOpacity>
        </View>
      )}

      <Text style={styles.hintTxt}>BSE accepts scan files up to 30 KB only.</Text>

      {uploading ? (
        <View style={styles.uploadingRow}>
          <ActivityIndicator color={colors.primary} />
          <Text style={styles.uploadingTxt}>Compressing & uploading…</Text>
        </View>
      ) : null}
    </AppModal>
  );
}

function createStyles(colors, isDark) {
  return StyleSheet.create({
    list: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 12,
      backgroundColor: colors.card,
      overflow: 'hidden',
    },
    row: {
      minHeight: 72,
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 12,
      paddingVertical: 12,
      backgroundColor: colors.card,
    },
    rowBorder: {
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.border,
    },
    iconWrap: {
      width: 40,
      height: 40,
      borderRadius: 10,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 12,
    },
    rowIcon: {width: 18, height: 18},
    rowTextWrap: {flex: 1, minWidth: 0},
    rowTitle: {
      ...Textstyles.medium,
      fontSize: 16,
      fontWeight: '600',
      color: colors.textPrimary,
    },
    rowSub: {
      ...Textstyles.normal,
      fontSize: 12,
      color: colors.textSecondary,
      marginTop: 2,
    },
    chevron: {width: 12, height: 12, tintColor: colors.textSecondary, marginLeft: 8},
    hintTxt: {
      ...Textstyles.normal,
      marginTop: 10,
      fontSize: 12,
      color: colors.textSecondary,
    },
    uploadingRow: {
      marginTop: 14,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
    },
    uploadingTxt: {
      ...Textstyles.medium,
      fontSize: 13,
      color: colors.textSecondary,
      marginLeft: 8,
    },
  });
}
