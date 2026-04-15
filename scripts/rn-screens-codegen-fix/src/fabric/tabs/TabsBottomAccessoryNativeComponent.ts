'use client';

import { codegenNativeComponent } from 'react-native';
import type { ViewProps } from 'react-native';
import type { DirectEventHandler } from 'react-native/Libraries/Types/CodegenTypes';

export interface NativeProps extends ViewProps {
  onEnvironmentChange?: DirectEventHandler<
    Readonly<{
      environment: 'regular' | 'inline';
    }>
  >;
}

export default codegenNativeComponent<NativeProps>('RNSTabsBottomAccessory', {
  interfaceOnly: true,
});
