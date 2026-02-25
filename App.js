/**
 * Meon Mutual Funds - Root App
 * @format
 */

import React, {createRef} from 'react';
import AppContainer from './src/route/AppContainer';

export const navigationRef = createRef();

export function navigate(name, params) {
  navigationRef.current?.navigate(name, params);
}

export default function App() {
  return <AppContainer />;
}
