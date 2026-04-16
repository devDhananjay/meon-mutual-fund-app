'use client';

import type {ViewProps, HostComponent} from 'react-native';
import {codegenNativeCommands, codegenNativeComponent} from 'react-native';
import type {DirectEventHandler, WithDefault, Float} from 'react-native/Libraries/Types/CodegenTypes';

type DisplayModeWillChangeEvent = Readonly<{
  currentDisplayMode: string;
  nextDisplayMode: string;
}>;

type SplitViewDisplayModeButtonVisibility = 'always' | 'automatic' | 'never';
type SplitViewSplitBehavior = 'automatic' | 'displace' | 'overlay' | 'tile';
type SplitViewPrimaryEdge = 'leading' | 'trailing';
type SplitViewDisplayMode =
  | 'automatic'
  | 'secondaryOnly'
  | 'oneBesideSecondary'
  | 'oneOverSecondary'
  | 'twoBesideSecondary'
  | 'twoOverSecondary'
  | 'twoDisplaceSecondary';
type SplitViewOrientation =
  | 'inherit'
  | 'all'
  | 'allButUpsideDown'
  | 'portrait'
  | 'portraitUp'
  | 'portraitDown'
  | 'landscape'
  | 'landscapeLeft'
  | 'landscapeRight';
type SplitViewPrimaryBackgroundStyle = 'default' | 'none' | 'sidebar';
type SplitViewTopColumnForCollapsing = 'default' | 'primary' | 'supplementary' | 'secondary';

interface ColumnMetrics {
  minimumPrimaryColumnWidth?: WithDefault<Float, -1.0>;
  maximumPrimaryColumnWidth?: WithDefault<Float, -1.0>;
  preferredPrimaryColumnWidthOrFraction?: WithDefault<Float, -1.0>;
  minimumSupplementaryColumnWidth?: WithDefault<Float, -1.0>;
  maximumSupplementaryColumnWidth?: WithDefault<Float, -1.0>;
  preferredSupplementaryColumnWidthOrFraction?: WithDefault<Float, -1.0>;

  // iOS 26 only
  minimumSecondaryColumnWidth?: WithDefault<Float, -1.0>;
  preferredSecondaryColumnWidthOrFraction?: WithDefault<Float, -1.0>;
  minimumInspectorColumnWidth?: WithDefault<Float, -1.0>;
  maximumInspectorColumnWidth?: WithDefault<Float, -1.0>;
  preferredInspectorColumnWidthOrFraction?: WithDefault<Float, -1.0>;
}

interface NativeProps extends ViewProps {
  // Appearance
  preferredDisplayMode?: WithDefault<SplitViewDisplayMode, 'automatic'>;
  preferredSplitBehavior?: WithDefault<SplitViewSplitBehavior, 'automatic'>;
  primaryEdge?: WithDefault<SplitViewPrimaryEdge, 'leading'>;
  showSecondaryToggleButton?: WithDefault<boolean, false>;
  displayModeButtonVisibility?: WithDefault<SplitViewDisplayModeButtonVisibility, 'automatic'>;
  columnMetrics?: ColumnMetrics;
  orientation?: WithDefault<SplitViewOrientation, 'inherit'>;
  primaryBackgroundStyle?: WithDefault<SplitViewPrimaryBackgroundStyle, 'default'>;

  // Behavior
  topColumnForCollapsing?: WithDefault<SplitViewTopColumnForCollapsing, 'default'>;

  // Interactions
  presentsWithGesture?: WithDefault<boolean, true>;
  showInspector?: WithDefault<boolean, false>;

  // Custom events
  onCollapse?: DirectEventHandler<Readonly<{}>>;
  onDisplayModeWillChange?: DirectEventHandler<DisplayModeWillChangeEvent>;
  onExpand?: DirectEventHandler<Readonly<{}>>;
  onInspectorHide?: DirectEventHandler<Readonly<{}>>;
}

type ComponentType = HostComponent<NativeProps>;

interface NativeCommands {
  showColumn: (viewRef: React.ElementRef<ComponentType>, column: string) => void;
}

export const Commands: NativeCommands = codegenNativeCommands<NativeCommands>({
  supportedCommands: ['showColumn'],
});

export default codegenNativeComponent<NativeProps>('RNSSplitViewHost', {});
