import React, {useCallback, useMemo, useRef, useState} from 'react';
import {View, PanResponder, StyleSheet, Platform} from 'react-native';

const THUMB = 22;
const TRACK_H = 6;

/**
 * Pure RN slider — always visible (no native RNCSlider width=0 issues inside ScrollView on iOS).
 */
export default function ReturnAmountSlider({
  minimumValue,
  maximumValue,
  step,
  value,
  onValueChange,
  onSlidingComplete,
  minimumTrackTintColor,
  maximumTrackTintColor,
  thumbTintColor,
  style,
}) {
  const trackWidthRef = useRef(0);
  const valueRef = useRef(value);
  const onValueChangeRef = useRef(onValueChange);
  const onSlidingCompleteRef = useRef(onSlidingComplete);
  valueRef.current = value;
  onValueChangeRef.current = onValueChange;
  onSlidingCompleteRef.current = onSlidingComplete;

  const [trackWidth, setTrackWidth] = useState(0);

  const clamp = useCallback(
    v => Math.max(minimumValue, Math.min(maximumValue, v)),
    [minimumValue, maximumValue],
  );

  const snap = useCallback(
    v => {
      const s = step || 1;
      return clamp(Math.round((v - minimumValue) / s) * s + minimumValue);
    },
    [clamp, minimumValue, step],
  );

  const valueFromX = useCallback(
    x => {
      const w = trackWidthRef.current;
      if (w <= 0) {
        return valueRef.current;
      }
      const ratio = Math.max(0, Math.min(1, x / w));
      const raw = minimumValue + ratio * (maximumValue - minimumValue);
      return snap(raw);
    },
    [maximumValue, minimumValue, snap],
  );

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderGrant: evt => {
          const v = valueFromX(evt.nativeEvent.locationX);
          onValueChangeRef.current?.(v);
        },
        onPanResponderMove: evt => {
          const v = valueFromX(evt.nativeEvent.locationX);
          onValueChangeRef.current?.(v);
        },
        onPanResponderRelease: evt => {
          const v = valueFromX(evt.nativeEvent.locationX);
          onSlidingCompleteRef.current?.(v);
        },
        onPanResponderTerminate: evt => {
          onSlidingCompleteRef.current?.(valueFromX(evt.nativeEvent.locationX));
        },
      }),
    [valueFromX],
  );

  const onLayout = e => {
    const w = e.nativeEvent.layout.width;
    trackWidthRef.current = w;
    setTrackWidth(w);
  };

  const span = maximumValue - minimumValue;
  const ratio = span <= 0 ? 0 : (value - minimumValue) / span;
  const fillW = trackWidth * ratio;
  const thumbLeft =
    trackWidth > 0
      ? Math.max(0, Math.min(trackWidth - THUMB, ratio * trackWidth - THUMB / 2))
      : 0;

  return (
    <View style={[styles.root, style]} onLayout={onLayout} collapsable={false}>
      <View style={styles.hit} {...panResponder.panHandlers}>
        <View style={[styles.trackMax, {backgroundColor: maximumTrackTintColor}]} />
        <View
          style={[
            styles.trackMin,
            {
              width: fillW,
              backgroundColor: minimumTrackTintColor,
            },
          ]}
        />
        <View
          style={[
            styles.thumb,
            {
              left: thumbLeft,
              backgroundColor: thumbTintColor,
            },
          ]}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    width: '100%',
    minHeight: 44,
    justifyContent: 'center',
  },
  hit: {
    height: 44,
    width: '100%',
    justifyContent: 'center',
  },
  trackMax: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: TRACK_H,
    borderRadius: TRACK_H / 2,
    top: '50%',
    marginTop: -TRACK_H / 2,
  },
  trackMin: {
    position: 'absolute',
    left: 0,
    height: TRACK_H,
    borderRadius: TRACK_H / 2,
    top: '50%',
    marginTop: -TRACK_H / 2,
  },
  thumb: {
    position: 'absolute',
    width: THUMB,
    height: THUMB,
    borderRadius: THUMB / 2,
    top: '50%',
    marginTop: -THUMB / 2,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: {width: 0, height: 1},
        shadowOpacity: 0.22,
        shadowRadius: 2,
      },
      android: {// elevation: 3
      },
    }),
  },
});
