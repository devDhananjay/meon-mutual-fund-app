import React, {useCallback, useEffect, useRef, useState} from 'react';
import {Modal, View, Text, TouchableOpacity, Pressable, StyleSheet, Platform} from 'react-native';
import {useAppTheme} from '../theme/useAppTheme';
import {registerAppAlert} from '../utils/appAlert';
import Textstyles from '../utils/text';

/** Light card — frosted off-white */
const CARD_BG_LIGHT = 'rgba(248, 248, 250, 0.96)';
const CARD_BG_DARK = 'rgba(44, 44, 46, 0.98)';
const TITLE_COLOR_LIGHT = '#000000';
const MSG_COLOR_LIGHT = '#666666';
const PILL_BG_LIGHT = '#D1D1D6';
const PILL_BG_DARK = '#48484A';
const DESTRUCTIVE_TEXT = '#FF3B30';
const ACCENT_TEXT_LIGHT = '#007AFF';
const ACCENT_TEXT_DARK = '#0A84FF';

export default function AppAlertHost() {
  const {isDark} = useAppTheme();
  const [queue, setQueue] = useState([]);
  const idRef = useRef(0);

  const enqueue = useCallback(payload => {
    const id = ++idRef.current;
    setQueue(q => [...q, {...payload, id}]);
  }, []);

  useEffect(() => {
    registerAppAlert(enqueue);
    return () => registerAppAlert(null);
  }, [enqueue]);

  const onPressButton = useCallback(btn => {
    const cb = btn?.onPress;
    setQueue(q => q.slice(1));
    if (typeof cb === 'function') {
      setTimeout(cb, 0);
    }
  }, []);

  const current = queue[0];
  if (!current) {
    return null;
  }

  const {title, message, buttons} = current;
  const hasTitle = Boolean(title && String(title).trim());
  const hasMessage = Boolean(message && String(message).trim());

  return (
    <Modal visible transparent animationType="fade" statusBarTranslucent onRequestClose={() => {}}>
      <View style={styles.wrap}>
        <Pressable style={styles.dim} onPress={() => {}} accessibilityRole="none" />
        <View style={styles.center} pointerEvents="box-none">
          <View
            style={[
              styles.card,
              isDark ? {backgroundColor: CARD_BG_DARK} : {backgroundColor: CARD_BG_LIGHT},
            ]}>
            {hasTitle ? (
              <Text style={[styles.title, isDark && styles.titleDark]} numberOfLines={5}>
                {title}
              </Text>
            ) : null}
            {hasMessage ? (
              <Text
                style={[
                  styles.message,
                  hasTitle && styles.messageAfterTitle,
                  isDark && styles.messageDark,
                ]}
                numberOfLines={12}>
                {message}
              </Text>
            ) : null}

            <View style={styles.btnColumn}>
              {buttons.map((btn, i) => {
                const isDest = btn.style === 'destructive';
                const isCancel = btn.style === 'cancel';
                let textColor = isDark ? '#FFFFFF' : '#000000';
                if (isDest) {
                  textColor = DESTRUCTIVE_TEXT;
                } else if (isCancel) {
                  textColor = isDark ? ACCENT_TEXT_DARK : ACCENT_TEXT_LIGHT;
                }

                return (
                  <TouchableOpacity
                    key={`${current.id}-${i}-${btn.text}`}
                    style={[
                      styles.pillBtn,
                      isDest ? styles.pillBtnDestructive : isDark ? styles.pillBtnDark : styles.pillBtnLight,
                      i > 0 && styles.pillBtnGap,
                    ]}
                    activeOpacity={0.55}
                    onPress={() => onPressButton(btn)}>
                    <Text
                      style={[
                        styles.pillLabel,
                        Textstyles.heading,
                        {color: textColor},
                        isCancel && styles.pillLabelCancel,
                      ]}>
                      {btn.text}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  center: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 28,
  },
  card: {
    width: '100%',
    maxWidth: 320,
    borderRadius: 28,
    paddingHorizontal: 20,
    paddingTop: 22,
    paddingBottom: 20,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: {width: 0, height: 10},
        shadowOpacity: 0.18,
        shadowRadius: 28,
      },
      android: {elevation: 12},
    }),
  },
  title: {
    ...Textstyles.heading,
    fontSize: 18,
    color: TITLE_COLOR_LIGHT,
    textAlign: 'left',
    lineHeight: 24,
    width: '100%',
  },
  titleDark: {
    color: '#FFFFFF',
  },
  message: {
    ...Textstyles.normal,
    fontSize: 15,
    color: MSG_COLOR_LIGHT,
    textAlign: 'left',
    lineHeight: 22,
    width: '100%',
  },
  messageAfterTitle: {
    marginTop: 10,
  },
  messageDark: {
    color: '#AEAEB2',
  },
  btnColumn: {
    marginTop: 22,
    width: '100%',
  },
  pillBtnGap: {
    marginTop: 10,
  },
  pillBtn: {
    minHeight: 48,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 20,
  },
  pillBtnLight: {
    backgroundColor: PILL_BG_LIGHT,
  },
  pillBtnDark: {
    backgroundColor: PILL_BG_DARK,
  },
  pillBtnDestructive: {
    backgroundColor: 'rgba(255, 59, 48, 0.12)',
  },
  pillLabel: {
    fontSize: 16,
  },
  pillLabelCancel: {
    fontWeight: '600',
  },
});
