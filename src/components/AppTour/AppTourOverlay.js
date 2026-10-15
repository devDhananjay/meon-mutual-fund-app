import React, {useEffect, useMemo, useRef, useState} from 'react';
import {
  Animated,
  Dimensions,
  Easing,
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
const TOOLTIP_GAP = 12;
const TOOLTIP_EST_H = 190;
const CARET = 9;
const SIDE_PAD = 16;

function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}

function getScreenSize() {
  return Dimensions.get('window');
}

/** Clamp layout already converted to Modal overlay space (see useScreenTour Y offset). */
function toOverlayLayout(layout) {
  if (!layout) {
    return null;
  }
  const {width: sw, height: sh} = getScreenSize();
  // Modal with statusBarTranslucent can be taller than window by the status bar.
  const overlayH = Math.max(sh, Dimensions.get('screen').height);

  let x = Math.round(layout.x);
  let y = Math.round(layout.y);
  let width = Math.round(layout.width);
  let height = Math.round(layout.height);

  x = clamp(x, 0, sw);
  y = clamp(y, 0, overlayH);
  width = clamp(width, 0, sw - x);
  height = clamp(height, 0, overlayH - y);
  if (width < 4 || height < 4) {
    return null;
  }
  return {x, y, width, height};
}

/**
 * Spotlight coach-mark overlay with pulse + tooltip motion.
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
  const [tipH, setTipH] = useState(TOOLTIP_EST_H);
  const isLast = stepIndex >= stepCount - 1;
  const isFirst = stepIndex <= 0;

  const dimOpacity = useRef(new Animated.Value(0)).current;
  const tipOpacity = useRef(new Animated.Value(0)).current;
  const tipTranslate = useRef(new Animated.Value(14)).current;
  const tipScale = useRef(new Animated.Value(0.96)).current;
  const pulse = useRef(new Animated.Value(0)).current;
  const holeBreath = useRef(new Animated.Value(0)).current;
  const contentKeyRef = useRef(0);
  const [contentKey, setContentKey] = useState(0);

  useEffect(() => {
    const sub = Dimensions.addEventListener('change', ({window}) => {
      setScreen(window);
    });
    return () => sub?.remove?.();
  }, []);

  // Overlay enter / exit
  useEffect(() => {
    if (!visible) {
      dimOpacity.setValue(0);
      tipOpacity.setValue(0);
      tipTranslate.setValue(14);
      tipScale.setValue(0.96);
      pulse.stopAnimation();
      holeBreath.stopAnimation();
      return undefined;
    }

    Animated.timing(dimOpacity, {
      toValue: 1,
      duration: 280,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();

    const pulseLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1,
          duration: 1100,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 0,
          duration: 1100,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ]),
    );
    const breathLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(holeBreath, {
          toValue: 1,
          duration: 900,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(holeBreath, {
          toValue: 0,
          duration: 900,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ]),
    );
    pulseLoop.start();
    breathLoop.start();

    return () => {
      pulseLoop.stop();
      breathLoop.stop();
    };
  }, [visible, dimOpacity, pulse, holeBreath, tipOpacity, tipTranslate, tipScale]);

  // Tooltip pop on each step
  useEffect(() => {
    if (!visible || !step) {
      return;
    }
    contentKeyRef.current += 1;
    setContentKey(contentKeyRef.current);
    setTipH(TOOLTIP_EST_H);

    tipOpacity.setValue(0);
    tipTranslate.setValue(step?.placement === 'top' ? -10 : 12);
    tipScale.setValue(0.94);

    Animated.parallel([
      Animated.timing(tipOpacity, {
        toValue: 1,
        duration: 260,
        delay: 40,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.spring(tipTranslate, {
        toValue: 0,
        friction: 8,
        tension: 80,
        useNativeDriver: true,
      }),
      Animated.spring(tipScale, {
        toValue: 1,
        friction: 7,
        tension: 90,
        useNativeDriver: true,
      }),
    ]).start();
  }, [visible, stepIndex, step, tipOpacity, tipTranslate, tipScale]);

  const hole = useMemo(() => {
    const mapped = toOverlayLayout(layout);
    if (!mapped) {
      return null;
    }
    const overlayH = Math.max(screen.height, Dimensions.get('screen').height);
    const x = Math.max(0, mapped.x - PAD);
    const y = Math.max(0, mapped.y - PAD);
    let width = Math.min(screen.width - x, mapped.width + PAD * 2);
    let height = Math.min(overlayH - y, mapped.height + PAD * 2);

    // Tall lists (holdings) — keep spotlight focused, not full-page.
    const maxHoleH = Math.round(screen.height * 0.4);
    if (height > maxHoleH) {
      height = maxHoleH;
    }

    const radius = clamp(Math.min(14, Math.round(Math.min(width, height) / 4)), 10, 16);
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
    const maxW = screen.width - SIDE_PAD * 2;
    const tipW = Math.min(maxW, 340);
    const usedTipH = tipH > 0 ? tipH : TOOLTIP_EST_H;
    const overlayH = Math.max(screen.height, Dimensions.get('screen').height);

    if (!hole) {
      return {
        style: {
          position: 'absolute',
          left: SIDE_PAD,
          width: maxW,
          top: Math.max(insets.top + 24, screen.height * 0.28),
        },
        caret: null,
        placeBelow: true,
      };
    }

    const preferBelow = step?.placement !== 'top';
    const spaceBelow = overlayH - (hole.y + hole.height) - insets.bottom - 8;
    const spaceAbove = hole.y - insets.top - 8;
    let placeBelow = preferBelow;
    if (preferBelow && spaceBelow < usedTipH + TOOLTIP_GAP) {
      placeBelow = spaceAbove > spaceBelow;
    } else if (!preferBelow && spaceAbove < usedTipH + TOOLTIP_GAP) {
      placeBelow = spaceBelow > spaceAbove;
    }

    let left = hole.cx - tipW / 2;
    left = clamp(left, SIDE_PAD, screen.width - SIDE_PAD - tipW);

    let top = placeBelow
      ? hole.y + hole.height + TOOLTIP_GAP
      : hole.y - usedTipH - TOOLTIP_GAP;

    // Keep on-screen; prefer staying close to the target (no large dead gap).
    const minTop = insets.top + 6;
    const maxTop = overlayH - insets.bottom - usedTipH - 6;
    if (top < minTop) {
      top = minTop;
      if (spaceBelow >= usedTipH + TOOLTIP_GAP) {
        placeBelow = true;
        top = hole.y + hole.height + TOOLTIP_GAP;
      }
    } else if (top > maxTop) {
      top = Math.max(minTop, maxTop);
    }

    const caretLeft = clamp(hole.cx - left - CARET, 16, tipW - 16 - CARET * 2);

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
  }, [hole, insets.bottom, insets.top, screen.height, screen.width, step?.placement, tipH]);

  const pulseScale = pulse.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.12],
  });
  const pulseOpacity = pulse.interpolate({
    inputRange: [0, 1],
    outputRange: [0.5, 0],
  });
  const holeBorderOpacity = holeBreath.interpolate({
    inputRange: [0, 1],
    outputRange: [0.7, 1],
  });

  if (!visible || !step) {
    return null;
  }

  const dimColor = isDark ? 'rgba(0,0,0,0.78)' : 'rgba(15,23,42,0.64)';
  const caretColor = colors.card;
  const progress = (stepIndex + 1) / Math.max(stepCount, 1);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      statusBarTranslucent
      onShow={() => {
        requestAnimationFrame(() => {
          onRequestRemeasure?.();
        });
      }}
      onRequestClose={onSkip}>
      <View style={styles.root} pointerEvents="box-none">
        <Animated.View style={[StyleSheet.absoluteFillObject, {opacity: dimOpacity}]} pointerEvents="none">
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
            </>
          ) : (
            <View style={[StyleSheet.absoluteFillObject, {backgroundColor: dimColor}]} />
          )}
        </Animated.View>

        {hole ? (
          <>
            <Animated.View
              pointerEvents="none"
              style={[
                styles.pulseRing,
                {
                  top: hole.y - 8,
                  left: hole.x - 8,
                  width: hole.width + 16,
                  height: hole.height + 16,
                  borderRadius: hole.radius + 6,
                  borderColor: colors.primary,
                  opacity: pulseOpacity,
                  transform: [{scale: pulseScale}],
                },
              ]}
            />
            <Animated.View
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
                  backgroundColor: isDark ? 'rgba(30,129,242,0.14)' : 'rgba(30,129,242,0.1)',
                  shadowColor: colors.primary,
                  opacity: holeBorderOpacity,
                },
              ]}
            />
          </>
        ) : null}

        <Animated.View
          onLayout={e => {
            const h = Math.round(e.nativeEvent.layout.height);
            if (h > 0 && Math.abs(h - tipH) > 2) {
              setTipH(h);
            }
          }}
          style={[
            styles.tooltip,
            tooltipBox.style,
            {
              backgroundColor: colors.card,
              borderColor: isDark ? 'rgba(255,255,255,0.08)' : colors.border,
              shadowOpacity: isDark ? 0.45 : 0.18,
              opacity: tipOpacity,
              transform: [{translateY: tipTranslate}, {scale: tipScale}],
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

          <View key={`tour-content-${contentKey}`}>
            <View style={styles.metaRow}>
              <Text style={[styles.stepMeta, {color: colors.primary}]}>
                {stepIndex + 1}/{stepCount}
              </Text>
              <View style={styles.dots}>
                {Array.from({length: stepCount}).map((_, i) => {
                  const active = i === stepIndex;
                  return (
                    <AnimatedDot
                      key={`dot-${i}`}
                      active={active}
                      primary={colors.primary}
                      idle={isDark ? '#3A3A3C' : '#D1D5DB'}
                    />
                  );
                })}
              </View>
              <TouchableOpacity onPress={onSkip} hitSlop={10} activeOpacity={0.7}>
                <Text style={[Textstyles.medium, styles.skipTop, {color: colors.textSecondary}]}>Skip</Text>
              </TouchableOpacity>
            </View>

            <View style={[styles.progressTrack, {backgroundColor: isDark ? '#2C2C2E' : '#E8EAED'}]}>
              <View
                style={[
                  styles.progressFill,
                  {
                    backgroundColor: colors.primary,
                    width: `${Math.round(progress * 100)}%`,
                  },
                ]}
              />
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
        </Animated.View>
      </View>
    </Modal>
  );
}

function AnimatedDot({active, primary, idle}) {
  const width = useRef(new Animated.Value(active ? 16 : 6)).current;

  useEffect(() => {
    Animated.spring(width, {
      toValue: active ? 16 : 6,
      friction: 7,
      tension: 120,
      useNativeDriver: false,
    }).start();
  }, [active, width]);

  return (
    <Animated.View
      style={[
        styles.dot,
        {
          width,
          backgroundColor: active ? primary : idle,
        },
      ]}
    />
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  dim: {
    position: 'absolute',
  },
  pulseRing: {
    position: 'absolute',
    borderWidth: 2,
  },
  holeFill: {
    position: 'absolute',
    borderWidth: 2.5,
    shadowOffset: {width: 0, height: 0},
    shadowOpacity: 0.55,
    elevation: 8,
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
    shadowOffset: {width: 0, height: 12},
    shadowRadius: 24,
    elevation: 12,
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
    fontWeight: '700',
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
  progressTrack: {
    height: 3,
    borderRadius: 2,
    overflow: 'hidden',
    marginBottom: 12,
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
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
