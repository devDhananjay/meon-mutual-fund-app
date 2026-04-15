'use client';

import { codegenNativeComponent } from 'react-native';
import type { ViewProps, ColorValue } from 'react-native';
import type {
  DirectEventHandler,
  WithDefault,
  Int32,
  Double,
  Float,
} from 'react-native/Libraries/Types/CodegenTypes';

export interface NativeProps extends ViewProps {
  onAppear?: DirectEventHandler<Readonly<{}>>;
  onDisappear?: DirectEventHandler<Readonly<{}>>;
  onDismissed?: DirectEventHandler<
    Readonly<{
      dismissCount: Int32;
    }>
  >;
  onNativeDismissCancelled?: DirectEventHandler<
    Readonly<{
      dismissCount: Int32;
    }>
  >;
  onWillAppear?: DirectEventHandler<Readonly<{}>>;
  onWillDisappear?: DirectEventHandler<Readonly<{}>>;
  onHeaderHeightChange?: DirectEventHandler<
    Readonly<{
      headerHeight: Double;
    }>
  >;
  onTransitionProgress?: DirectEventHandler<
    Readonly<{
      progress: Double;
      closing: Int32;
      goingForward: Int32;
    }>
  >;
  onGestureCancel?: DirectEventHandler<Readonly<{}>>;
  onHeaderBackButtonClicked?: DirectEventHandler<Readonly<{}>>;
  onSheetDetentChanged?: DirectEventHandler<
    Readonly<{
      index: Int32;
      isStable: boolean;
    }>
  >;
  screenId?: WithDefault<string, ''>;
  sheetAllowedDetents?: number[];
  sheetLargestUndimmedDetent?: WithDefault<Int32, -1>;
  sheetGrabberVisible?: WithDefault<boolean, false>;
  sheetCornerRadius?: WithDefault<Float, -1.0>;
  sheetExpandsWhenScrolledToEdge?: WithDefault<boolean, false>;
  sheetInitialDetent?: WithDefault<Int32, 0>;
  sheetElevation?: WithDefault<Int32, 24>;
  sheetShouldOverflowTopInset?: WithDefault<boolean, false>;
  sheetDefaultResizeAnimationEnabled?: WithDefault<boolean, true>;
  customAnimationOnSwipe?: boolean;
  fullScreenSwipeEnabled?: WithDefault<'undefined' | 'false' | 'true', 'undefined'>;
  fullScreenSwipeShadowEnabled?: WithDefault<boolean, true>;
  homeIndicatorHidden?: boolean;
  preventNativeDismiss?: boolean;
  gestureEnabled?: WithDefault<boolean, true>;
  statusBarColor?: ColorValue;
  statusBarHidden?: boolean;
  screenOrientation?: string;
  statusBarAnimation?: string;
  statusBarStyle?: string;
  statusBarTranslucent?: boolean;
  gestureResponseDistance?: Readonly<{
    start: Float;
    end: Float;
    top: Float;
    bottom: Float;
  }>;
  stackPresentation?: WithDefault<
    | 'push'
    | 'modal'
    | 'transparentModal'
    | 'fullScreenModal'
    | 'formSheet'
    | 'pageSheet'
    | 'containedModal'
    | 'containedTransparentModal',
    'push'
  >;
  stackAnimation?: WithDefault<
    | 'default'
    | 'flip'
    | 'simple_push'
    | 'none'
    | 'fade'
    | 'slide_from_right'
    | 'slide_from_left'
    | 'slide_from_bottom'
    | 'fade_from_bottom'
    | 'ios_from_right'
    | 'ios_from_left',
    'default'
  >;
  transitionDuration?: WithDefault<Int32, 500>;
  replaceAnimation?: WithDefault<'pop' | 'push', 'pop'>;
  swipeDirection?: WithDefault<'vertical' | 'horizontal', 'horizontal'>;
  hideKeyboardOnSwipe?: boolean;
  activityState?: WithDefault<Float, -1.0>;
  navigationBarColor?: ColorValue;
  navigationBarTranslucent?: boolean;
  navigationBarHidden?: boolean;
  nativeBackButtonDismissalEnabled?: boolean;
  synchronousShadowStateUpdatesEnabled?: WithDefault<boolean, false>;
}

export default codegenNativeComponent<NativeProps>('RNSModalScreen', {
  interfaceOnly: true,
});
