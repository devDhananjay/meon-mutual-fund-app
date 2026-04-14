/**
 * Patches react-native Text / TextInput so all usages get Figtree weight→file mapping.
 * Import once from index.js before App. Uses a global native ref so HMR does not double-wrap.
 */
import React from 'react';
import * as RN from 'react-native';
import {resolveTextStyle} from './typography';

const g = global;
if (!g.__FIGTREE_RAW_TEXT__) {
  g.__FIGTREE_RAW_TEXT__ = RN.Text;
}
if (!g.__FIGTREE_RAW_TEXT_INPUT__) {
  g.__FIGTREE_RAW_TEXT_INPUT__ = RN.TextInput;
}

const RawText = g.__FIGTREE_RAW_TEXT__;
const RawTextInput = g.__FIGTREE_RAW_TEXT_INPUT__;

const WrappedText = React.forwardRef((props, ref) => (
  <RawText {...props} ref={ref} style={resolveTextStyle(props.style)} />
));
WrappedText.displayName = 'Text';

const WrappedTextInput = React.forwardRef((props, ref) => (
  <RawTextInput {...props} ref={ref} style={resolveTextStyle(props.style)} />
));
WrappedTextInput.displayName = 'TextInput';

RN.Text = WrappedText;
RN.TextInput = WrappedTextInput;
