/**
 * @format
 */

import 'react-native';
import React from 'react';
import {it} from '@jest/globals';
import renderer from 'react-test-renderer';

jest.mock('../src/route/AppContainer', () => {
  const React = require('react');
  const {View, Text} = require('react-native');
  function MockShell() {
    return React.createElement(
      View,
      null,
      React.createElement(Text, null, 'MeonMutualFunds'),
    );
  }
  return MockShell;
});

import App from '../App';

it('renders correctly', () => {
  const tree = renderer.create(<App />);
  expect(tree.toJSON()).toBeTruthy();
});
