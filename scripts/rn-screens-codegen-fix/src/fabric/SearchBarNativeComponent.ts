'use client';

import { codegenNativeCommands, codegenNativeComponent } from 'react-native';
import type { ViewProps, ColorValue, HostComponent } from 'react-native';
import type {
  DirectEventHandler,
  WithDefault,
} from 'react-native/Libraries/Types/CodegenTypes';

// eslint-disable-next-line @typescript-eslint/ban-types
export type SearchBarEvent = Readonly<{}>;

export type SearchButtonPressedEvent = Readonly<{
  text?: string;
}>;

export type ChangeTextEvent = Readonly<{
  text?: string;
}>;

export interface NativeProps extends ViewProps {
  onSearchFocus?: DirectEventHandler<Readonly<{}>> | null;
  onSearchBlur?: DirectEventHandler<Readonly<{}>> | null;
  onSearchButtonPress?: DirectEventHandler<
    Readonly<{ text?: string }>
  > | null;
  onCancelButtonPress?: DirectEventHandler<Readonly<{}>> | null;
  onChangeText?: DirectEventHandler<Readonly<{ text?: string }>> | null;
  hideWhenScrolling?: WithDefault<boolean, true>;
  autoCapitalize?: WithDefault<
    | 'systemDefault'
    | 'none'
    | 'words'
    | 'sentences'
    | 'characters',
    'systemDefault'
  >;
  placeholder?: string;
  placement?: WithDefault<
    | 'automatic'
    | 'inline'
    | 'stacked'
    | 'integrated'
    | 'integratedButton'
    | 'integratedCentered',
    'automatic'
  >;
  allowToolbarIntegration?: WithDefault<boolean, true>;
  obscureBackground?: WithDefault<'undefined' | 'false' | 'true', 'undefined'>;
  hideNavigationBar?: WithDefault<'undefined' | 'false' | 'true', 'undefined'>;
  cancelButtonText?: string;
  // TODO: implement these on iOS
  barTintColor?: ColorValue;
  tintColor?: ColorValue;
  textColor?: ColorValue;

  // Android only
  autoFocus?: WithDefault<boolean, false>;
  disableBackButtonOverride?: boolean;
  // TODO: consider creating enum here
  inputType?: string;
  onClose?: DirectEventHandler<Readonly<{}>> | null;
  onOpen?: DirectEventHandler<Readonly<{}>> | null;
  hintTextColor?: ColorValue;
  headerIconColor?: ColorValue;
  shouldShowHintSearchIcon?: WithDefault<boolean, true>;
}

type ComponentType = HostComponent<NativeProps>;

interface NativeCommands {
  blur: (viewRef: React.ElementRef<ComponentType>) => void;
  focus: (viewRef: React.ElementRef<ComponentType>) => void;
  clearText: (viewRef: React.ElementRef<ComponentType>) => void;
  toggleCancelButton: (
    viewRef: React.ElementRef<ComponentType>,
    flag: boolean,
  ) => void;
  setText: (viewRef: React.ElementRef<ComponentType>, text: string) => void;
  cancelSearch: (viewRef: React.ElementRef<ComponentType>) => void;
}

export const Commands: NativeCommands = codegenNativeCommands<NativeCommands>({
  supportedCommands: [
    'blur',
    'focus',
    'clearText',
    'toggleCancelButton',
    'setText',
    'cancelSearch',
  ],
});

export default codegenNativeComponent<NativeProps>('RNSSearchBar', {});
