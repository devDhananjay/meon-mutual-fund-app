'use client';

import { codegenNativeComponent } from 'react-native';
import type { ViewProps } from 'react-native';
import type { WithDefault } from 'react-native/Libraries/Types/CodegenTypes';

export interface NativeProps extends ViewProps {
  environment?: WithDefault<'regular' | 'inline', 'regular'>;
}

export default codegenNativeComponent<NativeProps>(
  'RNSTabsBottomAccessoryContent',
  {},
);
