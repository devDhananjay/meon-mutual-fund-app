'use client';

import { codegenNativeComponent } from 'react-native';
import type { ColorValue, ViewProps } from 'react-native';
import type {
  DirectEventHandler,
  Float,
  WithDefault,
} from 'react-native/Libraries/Types/CodegenTypes';

// TODO: Report issue on RN repo, that nesting color value inside a struct does not work.
// Generated code is ok, but the value is not passed down correctly - whatever color is set
// host component receives RGBA(0, 0, 0, 0) anyway.
// type TabBarAppearance = {
//   backgroundColor?: ColorValue;
// };

export interface NativeProps extends ViewProps {
  // Events — inline event shape so codegen resolves DirectEventHandler (no CT. / alias issues).
  onNativeFocusChange?: DirectEventHandler<
    Readonly<{
      tabKey: string;
      repeatedSelectionHandledBySpecialEffect: boolean;
    }>
  >;

  // General
  tabBarHidden?: WithDefault<boolean, false>;
  nativeContainerBackgroundColor?: ColorValue;

  // Appearance
  // tabBarAppearance?: TabBarAppearance; // Does not work due to codegen issue.

  // Android-specific
  tabBarBackgroundColor?: ColorValue;
  tabBarItemTitleFontFamily?: string;
  tabBarItemTitleFontSize?: Float;
  tabBarItemTitleFontSizeActive?: Float;
  tabBarItemTitleFontWeight?: string;
  tabBarItemTitleFontStyle?: string;
  tabBarItemTitleFontColor?: ColorValue;
  tabBarItemTitleFontColorActive?: ColorValue;
  tabBarItemIconColor?: ColorValue;
  tabBarItemIconColorActive?: ColorValue;
  tabBarItemActiveIndicatorColor?: ColorValue;
  tabBarItemActiveIndicatorEnabled?: WithDefault<boolean, true>;
  tabBarItemRippleColor?: ColorValue;
  tabBarItemLabelVisibilityMode?: WithDefault<
    'auto' | 'selected' | 'labeled' | 'unlabeled',
    'auto'
  >;

  // iOS-specific
  tabBarTintColor?: ColorValue;
  tabBarMinimizeBehavior?: WithDefault<
    'automatic' | 'never' | 'onScrollDown' | 'onScrollUp',
    'automatic'
  >;
  tabBarControllerMode?: WithDefault<
    'automatic' | 'tabBar' | 'tabSidebar',
    'automatic'
  >;

  // Control

  // Experimental support
  controlNavigationStateInJS?: WithDefault<boolean, false>;
}

export default codegenNativeComponent<NativeProps>('RNSTabsHost', {
  interfaceOnly: true,
});
