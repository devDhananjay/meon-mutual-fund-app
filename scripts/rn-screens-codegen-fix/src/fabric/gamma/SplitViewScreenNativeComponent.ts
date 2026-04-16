'use client';

import type {ViewProps} from 'react-native';
import {codegenNativeComponent} from 'react-native';
import type {DirectEventHandler, WithDefault} from 'react-native/Libraries/Types/CodegenTypes';

interface NativeProps extends ViewProps {
  // Config
  columnType?: WithDefault<'column' | 'inspector', 'column'>;

  // Events
  onWillAppear?: DirectEventHandler<Readonly<{}>>;
  onDidAppear?: DirectEventHandler<Readonly<{}>>;
  onWillDisappear?: DirectEventHandler<Readonly<{}>>;
  onDidDisappear?: DirectEventHandler<Readonly<{}>>;
}

export default codegenNativeComponent<NativeProps>('RNSSplitViewScreen', {
  interfaceOnly: true,
});
