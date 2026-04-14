import {Alert} from 'react-native';

let enqueue = null;

/** Called from AppAlertHost on mount — do not use directly. */
export function registerAppAlert(fn) {
  enqueue = fn;
}

function normalizeButtons(buttons) {
  if (!buttons || !Array.isArray(buttons) || buttons.length === 0) {
    return [{text: 'OK'}];
  }
  return buttons.map(b => ({
    text: b.text ?? 'OK',
    style: b.style,
    onPress: b.onPress,
  }));
}

function buildPayload(title, message, buttons) {
  const t = title == null ? '' : String(title);
  const m = message == null ? '' : String(message);
  return {title: t, message: m, buttons: normalizeButtons(buttons)};
}

/**
 * iOS-style in-app alert (via AppAlertHost). Same call shapes as Alert.alert:
 * - appAlert('Title')
 * - appAlert('Title', 'Message')
 * - appAlert('Title', 'Message', [{ text, onPress?, style? }])
 * - appAlert('Title', undefined, buttons)  // message optional
 */
export function appAlert(title, message, buttons) {
  let payload;
  if (arguments.length === 1) {
    payload = buildPayload(title, '', [{text: 'OK'}]);
  } else if (arguments.length === 2) {
    if (typeof message === 'object' && message !== null && Array.isArray(message)) {
      payload = buildPayload(title, '', message);
    } else {
      payload = buildPayload(title, message, [{text: 'OK'}]);
    }
  } else {
    payload = buildPayload(title, message, buttons);
  }

  if (enqueue) {
    enqueue(payload);
    return;
  }

  const {title: t, message: m, buttons: btns} = payload;
  if (btns?.length) {
    Alert.alert(t, m || undefined, btns);
  } else if (m) {
    Alert.alert(t, m);
  } else {
    Alert.alert(t);
  }
}
