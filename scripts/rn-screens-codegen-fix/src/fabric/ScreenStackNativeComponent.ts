'use client';

import { codegenNativeComponent } from 'react-native';
import type { ViewProps } from 'react-native';
import type {
  DirectEventHandler,
  WithDefault,
} from 'react-native/Libraries/Types/CodegenTypes';

export interface NativeProps extends ViewProps {
  iosPreventReattachmentOfDismissedScreens?: WithDefault<boolean, true>;

  onFinishTransitioning?: DirectEventHandler<Readonly<{}>>;
}

export default codegenNativeComponent<NativeProps>('RNSScreenStack', {});
