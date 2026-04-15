// Implementation adapted from `react-native-safe-area-context`:
// https://github.com/AppAndFlow/react-native-safe-area-context/blob/v5.6.1/src/specs/NativeSafeAreaView.ts

import { codegenNativeComponent } from 'react-native';
import type { ViewProps } from 'react-native';
// Unqualified WithDefault: RN codegen getTypeAnnotationName() only reads typeName.name;
// `CT.WithDefault` / `CodegenTypes.WithDefault` is a TSQualifiedName and breaks codegen.
import type { WithDefault } from 'react-native/Libraries/Types/CodegenTypes';

export interface NativeProps extends ViewProps {
  edges?: Readonly<{
    top: boolean;
    right: boolean;
    bottom: boolean;
    left: boolean;
  }>;
  // Android-only
  insetType?: WithDefault<'all' | 'system' | 'interface', 'all'>;
}

export default codegenNativeComponent<NativeProps>('RNSSafeAreaView', {
  interfaceOnly: true,
});
