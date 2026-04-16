'use client';

import type {ViewProps} from 'react-native';
import {codegenNativeComponent} from 'react-native';
import type {DirectEventHandler, WithDefault} from 'react-native/Libraries/Types/CodegenTypes';

type OnDismissEventPayload = Readonly<{
  isNativeDismiss: boolean;
}>;

export interface NativeProps extends ViewProps {
  // Control
  // Codegen does not currently support non-optional enum.
  activityMode?: WithDefault<'detached' | 'attached', 'detached'>;
  screenKey: string;

  // Events
  onWillAppear?: DirectEventHandler<Readonly<{}>>;
  onDidAppear?: DirectEventHandler<Readonly<{}>>;
  onWillDisappear?: DirectEventHandler<Readonly<{}>>;
  onDidDisappear?: DirectEventHandler<Readonly<{}>>;
  onDismiss?: DirectEventHandler<OnDismissEventPayload>;
  onNativeDismissPrevented?: DirectEventHandler<Readonly<{}>>;

  // Configuration
  preventNativeDismiss?: WithDefault<boolean, false>;
}

export default codegenNativeComponent<NativeProps>('RNSStackScreen', {});
