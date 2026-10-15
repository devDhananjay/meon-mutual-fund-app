import {useCallback, useEffect, useRef, useState} from 'react';
import {
  DeviceEventEmitter,
  Dimensions,
  InteractionManager,
  Platform,
  StatusBar,
} from 'react-native';
import {useFocusEffect} from '@react-navigation/native';
import {
  APP_TOUR_REPLAY_EVENT,
  hasSeenScreenTour,
  markScreenTourSeen,
} from '../tour/tourStorage';
import {TOUR_SCREEN} from '../tour/tourSteps';

/** Matches MainTabNavigator LiquidGlassTabBar height. */
export const TAB_BAR_HEIGHT = Platform.OS === 'ios' ? 95 : 70;

/**
 * Translucent Modal draws from the physical top of the screen. On Android,
 * measureInWindow / window height are often relative to the area below the
 * status bar — shift Y so the spotlight lands on the real target.
 */
export function getTourOverlayYOffset() {
  if (Platform.OS !== 'android') {
    return 0;
  }
  return Math.round(StatusBar.currentHeight || 0);
}

function readNodeLayout(node) {
  return new Promise(resolve => {
    if (!node?.measureInWindow) {
      resolve(null);
      return;
    }
    node.measureInWindow((x, y, width, height) => {
      if (width == null || height == null || width < 2 || height < 2) {
        resolve(null);
        return;
      }
      const yOffset = getTourOverlayYOffset();
      resolve({
        x: Number(x) || 0,
        y: (Number(y) || 0) + yOffset,
        width: Number(width) || 0,
        height: Number(height) || 0,
      });
    });
  });
}

/**
 * First-visit coach marks for a screen.
 * `targetRefs` = { [stepId]: ref }
 * Optional `resolveLayout(stepId)` for synthetic targets (e.g. tab bar).
 * Optional `onStepChange(step)` for scroll / prep.
 */
export function useScreenTour({
  screenKey,
  steps,
  targetRefs,
  resolveLayout,
  onStepChange,
  enabled = true,
  autoStartDelayMs = 420,
  listenReplay = false,
}) {
  const [visible, setVisible] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const [layout, setLayout] = useState(null);
  const startedRef = useRef(false);
  const stepsRef = useRef(steps);
  const measureGenRef = useRef(0);
  stepsRef.current = steps;

  const measureStep = useCallback(
    async (stepId, {retries = 8, delayMs = 50} = {}) => {
      const gen = ++measureGenRef.current;

      if (typeof resolveLayout === 'function') {
        const custom = resolveLayout(stepId);
        if (custom) {
          if (gen === measureGenRef.current) {
            setLayout(custom);
          }
          return;
        }
      }

      for (let attempt = 0; attempt < retries; attempt += 1) {
        if (gen !== measureGenRef.current) {
          return;
        }
        const node = targetRefs?.[stepId]?.current;
        const next = await readNodeLayout(node);
        if (next) {
          if (gen === measureGenRef.current) {
            setLayout(next);
          }
          return;
        }
        await new Promise(r => setTimeout(r, delayMs + attempt * 40));
      }
      if (gen === measureGenRef.current) {
        setLayout(null);
      }
    },
    [resolveLayout, targetRefs],
  );

  const finish = useCallback(async () => {
    measureGenRef.current += 1;
    setVisible(false);
    setLayout(null);
    setStepIndex(0);
    startedRef.current = false;
    await markScreenTourSeen(screenKey);
  }, [screenKey]);

  const start = useCallback(() => {
    if (!stepsRef.current?.length) {
      return;
    }
    setStepIndex(0);
    setVisible(true);
    startedRef.current = true;
    const first = stepsRef.current[0];
    onStepChange?.(first, 0);
    InteractionManager.runAfterInteractions(() => {
      setTimeout(() => measureStep(first.id), 160);
    });
  }, [measureStep, onStepChange]);

  const tryAutoStart = useCallback(async () => {
    if (!enabled || startedRef.current || visible) {
      return;
    }
    const seen = await hasSeenScreenTour(screenKey);
    if (seen) {
      return;
    }
    start();
  }, [enabled, screenKey, start, visible]);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      const t = setTimeout(() => {
        if (!cancelled) {
          tryAutoStart();
        }
      }, autoStartDelayMs);
      return () => {
        cancelled = true;
        clearTimeout(t);
      };
    }, [autoStartDelayMs, tryAutoStart]),
  );

  useEffect(() => {
    if (!listenReplay) {
      return undefined;
    }
    const sub = DeviceEventEmitter.addListener(APP_TOUR_REPLAY_EVENT, () => {
      if (screenKey === TOUR_SCREEN.dashboard) {
        start();
      }
    });
    return () => sub.remove();
  }, [listenReplay, screenKey, start]);

  useEffect(() => {
    if (!visible) {
      return undefined;
    }
    const step = stepsRef.current[stepIndex];
    if (!step) {
      return undefined;
    }
    onStepChange?.(step, stepIndex);
    // Scroll/layout settle — measure a few times so spotlight tracks the target.
    const t1 = setTimeout(() => measureStep(step.id), 280);
    const t2 = setTimeout(() => measureStep(step.id), 520);
    const t3 = setTimeout(() => measureStep(step.id), 820);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, [stepIndex, visible, measureStep, onStepChange]);

  const onNext = useCallback(() => {
    if (stepIndex >= stepsRef.current.length - 1) {
      finish();
      return;
    }
    setStepIndex(i => i + 1);
  }, [finish, stepIndex]);

  const onBack = useCallback(() => {
    setStepIndex(i => Math.max(0, i - 1));
  }, []);

  const onRequestRemeasure = useCallback(() => {
    const step = stepsRef.current[stepIndex];
    if (!step || !visible) {
      return;
    }
    measureStep(step.id, {retries: 5, delayMs: 40});
  }, [measureStep, stepIndex, visible]);

  return {
    visible,
    stepIndex,
    step: steps[stepIndex],
    stepCount: steps.length,
    layout,
    onNext,
    onBack,
    onSkip: finish,
    onRequestRemeasure,
    start,
  };
}

/** Bottom tab bar hole for Dashboard “tabs” step (Modal overlay coords). */
export function getTabBarTourLayout() {
  const {width: sw, height: sh} = Dimensions.get('window');
  const yOffset = getTourOverlayYOffset();
  const height = TAB_BAR_HEIGHT;
  return {
    x: 4,
    y: Math.round(yOffset + sh - height),
    width: Math.round(sw - 8),
    height: Math.round(height),
  };
}
