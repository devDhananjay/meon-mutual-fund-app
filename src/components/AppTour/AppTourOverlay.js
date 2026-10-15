import React, {useEffect, useMemo, useState} from 'react';
import {
  Dimensions,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import Textstyles from '../../utils/text';
import {useAppTheme} from '../../theme/useAppTheme';

const PAD = 6;
const TOOLTIP_GAP = 16;
const TOOLTIP_EST_H = 200;
const CARET = 10;

function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}

function getScreenSize() {
  return Dimensions.get('window');
}

/** Round + clamp measureInWindow into Modal overlay space (statusBarTranslucent). */
function toOverlayLayout(layout) {
  if (!layout) {
    return null;
  }
  const {width: sw, height: sh} = getScreenSize();
  let x = Math.round(layout.x);
  let y = Math.round(layout.y);
  let width = Math.round(layout.width);
  let height = Math.round(layout.height);

  x = clamp(x, 0, sw);
  y = clamp(y, 0, sh);
  width = clamp(width, 0, sw - x);
  height = clamp(height, 0, sh - y);
  if (width < 4 || height < 4) {
    return null;
  }
  return {x, y, width, height};
}

/**
 * Spotlight coach-mark overlay.
 * `layout` = {x,y,width,height} from measureInWindow, or null for centered tip.
 * `onRequestRemeasure` — called when Modal finishes showing (coords more stable).
 */
export default function AppTourOverlay({
  visible,
  step,
  stepIndex,
  stepCount,
  layout,
  onNext,
  onBack,
  onSkip,
  onRequestRemeasure,
}) {
  const {colors, isDark} = useAppTheme();
  const insets = useSafeAreaInsets();
  const [screen, setScreen] = useState(getScreenSize);
  const isLast = stepIndex >= stepCount - 1;
  const isFirst = stepIndex <= 0;

  useEffect(() => {
    const sub = Dimensions.addEventListener('change', ({window}) => {
      setScreen(window);
    });
    return () => sub?.remove?.();
  }, []);

  const hole = useMemo(() => {
    const mapped = toOverlayLayout(layout);
    if (!mapped) {
      return null;
    }
    const x = Math.max(0, mapped.x - PAD);
    const y = Math.max(0, mapped.y - PAD);
    const width = Math.min(screen.width - x, mapped.width + PAD * 2);
    const height = Math.min(screen.height - y, mapped.height + PAD * 2);
    const radius = clamp(Math.min(14, Math.round(Math.min(width, height) / 4)), 8, 16);
    return {
      x,
      y,
      width,
      height,
      radius,
      cx: x + width / 2,
      cy: y + height / 2,
    };
  }, [layout, screen.height, screen.width]);

  const tooltipBox = useMemo(() => {
    const sidePad = 16;
    const maxW = screen.width - sidePad * 2;
    const tipW = Math.min(maxW, 360);

    if (!hole) {
      return {
        style: {
          position: 'absolute',
          left: sidePad,
          width: maxW,
          top: Math.max(insets.top + 24, screen.height * 0.28),
        },
        caret: null,
        placeBelow: true,
      };
    }

    const preferBelow = step?.placement !== 'top';
    const spaceBelow = screen.height - (hole.y + hole.height) - insets.bottom;
    const spaceAbove = hole.y - insets.top;
    const placeBelow =
      preferBelow && spaceBelow >= TOOLTIP_EST_H + TOOLTIP_GAP
        ? true
        : spaceAbove < TOOLTIP_EST_H + TOOLTIP_GAP && spaceBelow > spaceAbove;

    // Horizontally center tip on the hole, clamped to screen.
    let left = hole.cx - tipW / 2;
    left = clamp(left, sidePad, screen.width - sidePad - tipW);

    const top = placeBelow
      ? Math.min(hole.y + hole.height + TOOLTIP_GAP, screen.height - TOOLTIP_EST_H - insets.bottom)
      : clamp(hole.y - TOOLTIP_EST_H - TOOLTIP_GAP, insets.top + 8, screen.height);

    // Caret points at hole center along the tip edge.
    const caretLeft = clamp(hole.cx - left - CARET, 18, tipW - 18 - CARET * 2);

    return {
      style: {
        position: 'absolute',
        left,
        width: tipW,
        top,
      },
      caret: {left: caretLeft, placeBelow},
      placeBelow,
    };
  }, [hole, insets.bottom, insets.top, screen.height, screen.width, step?.placement]);

  if (!visible || !step) {
    return null;
  }

  const dimColor = isDark ? 'rgba(0,0,0,0.76)' : 'rgba(15,23,42,0.62)';
  const caretColor = colors.card;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onShow={() => {
        // Modal attach ke baad dubara measure — pehli baar aksar off hota hai.
        onRequestRemeasure?.();
      }}
      onRequestClose={onSkip}>
      <View style={styles.root} pointerEvents="box-none">
        {hole ? (
          <>
            <View style={[styles.dim, {backgroundColor: dimColor, top: 0, left: 0, right: 0, height: hole.y}]} />
            <View
              style={[
                styles.dim,
                {backgroundColor: dimColor, top: hole.y + hole.height, left: 0, right: 0, bottom: 0},
              ]}
            />
            <View
              style={[
                styles.dim,
                {backgroundColor: dimColor, top: hole.y, left: 0, width: hole.x, height: hole.height},
              ]}
            />
            <View
              style={[
                styles.dim,
                {
                  backgroundColor: dimColor,
                  top: hole.y,
                  left: hole.x + hole.width,
                  right: 0,
                  height: hole.height,
                },
              ]}
            />
            {/* Soft fill so the selected control reads clearly */}
            <View
              pointerEvents="none"
              style={[
                styles.holeFill,
                {
                  top: hole.y,
                  left: hole.x,
                  width: hole.width,
                  height: hole.height,
                  borderRadius: hole.radius,
                  borderColor: colors.primary,
                  backgroundColor: isDark ? 'rgba(30,129,242,0.12)' : 'rgba(30,129,242,0.08)',
                  shadowColor: colors.primary,
                },
              ]}
            />
          </>
        ) : (
          <View style={[StyleSheet.absoluteFillObject, {backgroundColor: dimColor}]} />
        )}

        <View
          style={[
            styles.tooltip,
            tooltipBox.style,
            {
              backgroundColor: colors.card,
              borderColor: isDark ? 'rgba(255,255,255,0.08)' : colors.border,
              shadowOpacity: isDark ? 0.4 : 0.16,
            },
          ]}>
          {tooltipBox.caret ? (
            <View
              pointerEvents="none"
              style={[
                tooltipBox.caret.placeBelow ? styles.caretUp : styles.caretDown,
                {
                  left: tooltipBox.caret.left,
                  borderBottomColor: tooltipBox.caret.placeBelow ? caretColor : 'transparent',
                  borderTopColor: tooltipBox.caret.placeBelow ? 'transparent' : caretColor,
                },
              ]}
            />
          ) : null}

          <View style={styles.metaRow}>
            <Text style={[styles.stepMeta, {color: colors.primary}]}>
              {stepIndex + 1}/{stepCount}
            </Text>
            <View style={styles.dots}>
              {Array.from({length: stepCount}).map((_, i) => (
                <View
                  key={`dot-${i}`}
                  style={[
                    styles.dot,
                    {
                      backgroundColor: i === stepIndex ? colors.primary : isDark ? '#3A3A3C' : '#D1D5DB',
                      width: i === stepIndex ? 16 : 6,
                    },
                  ]}
                />
              ))}
            </View>
            <TouchableOpacity onPress={onSkip} hitSlop={10} activeOpacity={0.7}>
              <Text style={[Textstyles.medium, styles.skipTop, {color: colors.textSecondary}]}>Skip</Text>
            </TouchableOpacity>
          </View>

          <Text style={[Textstyles.heading, styles.title, {color: colors.textPrimary}]}>{step.title}</Text>
          <Text style={[Textstyles.normal, styles.body, {color: colors.textSecondary}]}>{step.body}</Text>

          <View style={styles.actions}>
            {isFirst ? (
              <View style={styles.backSpacer} />
            ) : (
              <TouchableOpacity onPress={onBack} hitSlop={10} activeOpacity={0.7} style={styles.backBtn}>
                <Text style={[Textstyles.medium, styles.backTxt, {color: colors.textPrimary}]}>Back</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              onPress={onNext}
              activeOpacity={0.88}
              style={[styles.nextBtn, {backgroundColor: colors.primary}]}>
              <Text style={[Textstyles.medium, styles.nextTxt]}>{isLast ? 'Got it' : 'Next'}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  dim: {
    position: 'absolute',
  },
  holeFill: {
    position: 'absolute',
    borderWidth: 2.5,
    shadowOffset: {width: 0, height: 0},
    shadowOpacity: 0.45,
    shadowRadius: 10,
    elevation: 6,
  },
  caretUp: {
    position: 'absolute',
    top: -CARET,
    width: 0,
    height: 0,
    borderLeftWidth: CARET,
    borderRightWidth: CARET,
    borderBottomWidth: CARET,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
  },
  caretDown: {
    position: 'absolute',
    bottom: -CARET,
    width: 0,
    height: 0,
    borderLeftWidth: CARET,
    borderRightWidth: CARET,
    borderTopWidth: CARET,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
  },
  tooltip: {
    borderRadius: 18,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 14,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 10},
    shadowRadius: 22,
    elevation: 10,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    gap: 8,
  },
  stepMeta: {
    fontSize: 12,
    letterSpacing: 0.3,
    minWidth: 28,
  },
  dots: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  dot: {
    height: 6,
    borderRadius: 3,
  },
  skipTop: {
    fontSize: 13,
  },
  title: {
    fontSize: 18,
    lineHeight: 24,
    marginBottom: 6,
  },
  body: {
    fontSize: 14,
    lineHeight: 21,
    marginBottom: 16,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  backSpacer: {
    flex: 1,
  },
  backBtn: {
    paddingVertical: 12,
    paddingHorizontal: 8,
    minWidth: 64,
  },
  backTxt: {
    fontSize: 15,
  },
  nextBtn: {
    minWidth: 112,
    paddingVertical: 12,
    paddingHorizontal: 22,
    borderRadius: 12,
    alignItems: 'center',
  },
  nextTxt: {
    color: '#FFFFFF',
    fontSize: 15,
  },
});
