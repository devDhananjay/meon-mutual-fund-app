'use client';

import { codegenNativeComponent } from 'react-native';
import type { ViewProps, ColorValue } from 'react-native';
import type {
  DirectEventHandler,
  WithDefault,
  Int32,
  UnsafeMixed,
} from 'react-native/Libraries/Types/CodegenTypes';

export interface NativeProps extends ViewProps {
  onAttached?: DirectEventHandler<Readonly<{}>>;
  onDetached?: DirectEventHandler<Readonly<{}>>;
  backgroundColor?: ColorValue;
  backTitle?: string;
  backTitleFontFamily?: string;
  backTitleFontSize?: Int32;
  backTitleVisible?: WithDefault<boolean, 'true'>;
  color?: ColorValue;
  direction?: WithDefault<'rtl' | 'ltr', 'ltr'>;
  hidden?: boolean;
  hideShadow?: boolean;
  largeTitle?: boolean;
  largeTitleFontFamily?: string;
  largeTitleFontSize?: Int32;
  largeTitleFontWeight?: string;
  largeTitleBackgroundColor?: ColorValue;
  largeTitleHideShadow?: boolean;
  largeTitleColor?: ColorValue;
  translucent?: boolean;
  title?: string;
  titleFontFamily?: string;
  titleFontSize?: Int32;
  titleFontWeight?: string;
  titleColor?: ColorValue;
  disableBackButtonMenu?: boolean;
  backButtonDisplayMode?: WithDefault<
    'minimal' | 'default' | 'generic',
    'default'
  >;
  hideBackButton?: boolean;
  backButtonInCustomView?: boolean;
  blurEffect?: WithDefault<
    | 'none'
    | 'extraLight'
    | 'light'
    | 'dark'
    | 'regular'
    | 'prominent'
    | 'systemUltraThinMaterial'
    | 'systemThinMaterial'
    | 'systemMaterial'
    | 'systemThickMaterial'
    | 'systemChromeMaterial'
    | 'systemUltraThinMaterialLight'
    | 'systemThinMaterialLight'
    | 'systemMaterialLight'
    | 'systemThickMaterialLight'
    | 'systemChromeMaterialLight'
    | 'systemUltraThinMaterialDark'
    | 'systemThinMaterialDark'
    | 'systemMaterialDark'
    | 'systemThickMaterialDark'
    | 'systemChromeMaterialDark',
    'none'
  >;
  // TODO: implement this props on iOS
  topInsetEnabled?: boolean;
  headerLeftBarButtonItems?: UnsafeMixed[];
  headerRightBarButtonItems?: UnsafeMixed[];
  onPressHeaderBarButtonItem?: DirectEventHandler<
    Readonly<{ buttonId: string }>
  >;
  onPressHeaderBarButtonMenuItem?: DirectEventHandler<
    Readonly<{ menuId: string }>
  >;
  synchronousShadowStateUpdatesEnabled?: WithDefault<boolean, false>;

  // Experimental
  userInterfaceStyle?: WithDefault<
    'unspecified' | 'light' | 'dark',
    'unspecified'
  >;
}

export default codegenNativeComponent<NativeProps>(
  'RNSScreenStackHeaderConfig',
  {
    interfaceOnly: true,
  },
);
