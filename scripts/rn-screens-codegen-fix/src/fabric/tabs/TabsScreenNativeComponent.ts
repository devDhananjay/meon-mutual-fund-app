'use client';

import { codegenNativeComponent } from 'react-native';
import type {
  ColorValue,
  ImageSource,
  ProcessedColorValue,
  ViewProps,
} from 'react-native';
import type {
  DirectEventHandler,
  Float,
  Int32,
  WithDefault,
} from 'react-native/Libraries/Types/CodegenTypes';

import { UnsafeMixed } from './codegenUtils';

// iOS-specific: SFSymbol, image as a template usage
export type IconType = 'image' | 'template' | 'sfSymbol' | 'xcasset';

type BlurEffect =
  | 'none'
  | 'systemDefault'
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
  | 'systemChromeMaterialDark';

export type ItemStateAppearance = {
  tabBarItemTitleFontFamily?: string;
  tabBarItemTitleFontSize?: Float;
  tabBarItemTitleFontWeight?: string;
  tabBarItemTitleFontStyle?: string;
  tabBarItemTitleFontColor?: ProcessedColorValue | null;
  tabBarItemTitlePositionAdjustment?: {
    horizontal?: Float;
    vertical?: Float;
  };
  tabBarItemIconColor?: ProcessedColorValue | null;
  tabBarItemBadgeBackgroundColor?: ProcessedColorValue | null;
};

export type ItemAppearance = {
  normal?: ItemStateAppearance;
  selected?: ItemStateAppearance;
  focused?: ItemStateAppearance;
  disabled?: ItemStateAppearance;
};

export type Appearance = {
  stacked?: ItemAppearance;
  inline?: ItemAppearance;
  compactInline?: ItemAppearance;

  tabBarBackgroundColor?: ProcessedColorValue | null;
  tabBarShadowColor?: ProcessedColorValue | null;
  tabBarBlurEffect?: WithDefault<BlurEffect, 'systemDefault'>;
};

type Orientation =
  | 'inherit'
  | 'all'
  | 'allButUpsideDown'
  | 'portrait'
  | 'portraitUp'
  | 'portraitDown'
  | 'landscape'
  | 'landscapeLeft'
  | 'landscapeRight';

type SystemItem =
  | 'none'
  | 'bookmarks'
  | 'contacts'
  | 'downloads'
  | 'favorites'
  | 'featured'
  | 'history'
  | 'more'
  | 'mostRecent'
  | 'mostViewed'
  | 'recents'
  | 'search'
  | 'topRated';

type ScrollEdgeEffect = 'automatic' | 'hard' | 'soft' | 'hidden';

type UserInterfaceStyle = 'unspecified' | 'light' | 'dark';

export interface NativeProps extends ViewProps {
  // Events
  onLifecycleStateChange?: DirectEventHandler<
    Readonly<{
      previousState: Int32;
      newState: Int32;
    }>
  >;
  onWillAppear?: DirectEventHandler<Readonly<{}>>;
  onDidAppear?: DirectEventHandler<Readonly<{}>>;
  onWillDisappear?: DirectEventHandler<Readonly<{}>>;
  onDidDisappear?: DirectEventHandler<Readonly<{}>>;

  // Control
  isFocused?: boolean;
  tabKey: string;

  // General
  title?: string | undefined | null;
  isTitleUndefined?: WithDefault<boolean, true>;
  badgeValue?: string;

  // Accessibility
  tabBarItemTestID?: string;
  tabBarItemAccessibilityLabel?: string;

  // Currently iOS-only
  orientation?: WithDefault<Orientation, 'inherit'>;

  // Android-specific image handling
  drawableIconResourceName?: string;
  imageIconResource?: ImageSource;
  tabBarItemBadgeTextColor?: ColorValue;
  tabBarItemBadgeBackgroundColor?: ColorValue;

  // iOS-specific
  standardAppearance?: UnsafeMixed<Appearance>;
  scrollEdgeAppearance?: UnsafeMixed<Appearance>;

  iconType?: WithDefault<
    'image' | 'template' | 'sfSymbol' | 'xcasset',
    'sfSymbol'
  >;

  iconImageSource?: ImageSource;
  iconResourceName?: string;

  selectedIconImageSource?: ImageSource;
  selectedIconResourceName?: string;

  systemItem?: WithDefault<SystemItem, 'none'>;

  specialEffects?: {
    repeatedTabSelection?: {
      popToRoot?: WithDefault<boolean, true>;
      scrollToTop?: WithDefault<boolean, true>;
    };
  };

  overrideScrollViewContentInsetAdjustmentBehavior?: WithDefault<
    boolean,
    true
  >;

  bottomScrollEdgeEffect?: WithDefault<ScrollEdgeEffect, 'automatic'>;
  leftScrollEdgeEffect?: WithDefault<ScrollEdgeEffect, 'automatic'>;
  rightScrollEdgeEffect?: WithDefault<ScrollEdgeEffect, 'automatic'>;
  topScrollEdgeEffect?: WithDefault<ScrollEdgeEffect, 'automatic'>;

  // Experimental
  userInterfaceStyle?: WithDefault<UserInterfaceStyle, 'unspecified'>;
}

export default codegenNativeComponent<NativeProps>('RNSTabsScreen', {});
