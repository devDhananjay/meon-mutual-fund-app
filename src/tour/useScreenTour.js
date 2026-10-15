import {useCallback, useEffect, useRef, useState} from 'react';
import {DeviceEventEmitter, Dimensions, InteractionManager, Platform} from 'react-native';
import {useFocusEffect} from '@react-navigation/native';
import {
  APP_TOUR_REPLAY_EVENT,
  hasSeenScreenTour,
  markScreenTourSeen,
} from '../tour/tourStorage';
import {TOUR_SCREEN} from '../tour/tourSteps';

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
      resolve({
        x: Number(x) || 0,
        y: Number(y) || 0,
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
    async (stepId, {retries = 6, delayMs = 40} = {}) => {
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
        await new Promise(r => setTimeout(r, delayMs + attempt * 30));
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
      setTimeout(() => measureStep(first.id), 120);
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
    // Scroll/layout settle — measure twice (after scroll + a beat later).
    const t1 = setTimeout(() => measureStep(step.id), 320);
    const t2 = setTimeout(() => measureStep(step.id), 560);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
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
    measureStep(step.id, {retries: 4, delayMs: 30});
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

/** Approximate bottom tab bar hole for Dashboard “tabs” step. */
export function getTabBarTourLayout() {
  const {width: sw, height: sh} = Dimensions.get('window');
  const tabH = Platform.OS === 'ios' ? 83 : 64;
  const bottomPad = Platform.OS === 'ios' ? 8 : 4;
  return {
    x: 8,
    y: Math.round(sh - tabH - bottomPad),
    width: Math.round(sw - 16),
    height: Math.round(tabH - 4),
  };
}
