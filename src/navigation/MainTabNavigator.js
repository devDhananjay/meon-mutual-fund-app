import React from 'react';
import {
  createBottomTabNavigator
} from '@react-navigation/bottom-tabs';
import {
  View,
  StyleSheet,
  Image,
  Platform,
  TouchableOpacity,
  Text,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BlurView } from '@react-native-community/blur';
import DashboardScreen from '../screens/Dashboard/DashboardScreen';
import ExplorePixelPerfectScreen from '../screens/Explore/ExplorePixelPerfectScreen';
import MyFoliosScreen from '../screens/MyFolios/MyFoliosScreen';
import ProfileScreen from '../screens/Profile/ProfileScreen';
import { Colors } from '../utils/AppConstant';
import Icons from '../utils/icons';
import { useAppTheme } from '../theme/useAppTheme';

const Tab = createBottomTabNavigator();
const ACTIVE_BLUE = '#1E81F2';
const TAB_BOX_SIZE = 74;

// ─── Liquid Glass Tab Bar ─────────────────────────────────────────────────────
function LiquidGlassTabBar({ state, descriptors, navigation }) {
  const { isDark, colors } = useAppTheme();
  const insets = useSafeAreaInsets();
  const tabBarBottomPad = Math.max(insets.bottom, 10);

  const tabIcons = {
    // Use single source per tab + tint color change to prevent image-source flicker.
    Dashboard: Icons.TabHomeGrey,
    Explore: Icons.TabExploreGrey,
    MyFolios: Icons.TabMyFoliosGrey,
    Profile: Icons.TabProfileGrey,
  };

  const tabLabels = {
    Dashboard: 'Dashboard',
    Explore: 'Explore',
    MyFolios: 'My Folios',
    Profile: 'Profile',
  };

  const BarWrapper = Platform.OS === 'ios' ? BlurView : View;
  const blurProps =
    Platform.OS === 'ios'
      ? {
        blurType: isDark ? 'ultraThinMaterialDark' : 'ultraThinMaterialLight',
        blurAmount: 40,
        reducedTransparencyFallbackColor: isDark ? '#1C1C1E' : '#F2F2F7',
      }
      : {
        style: { backgroundColor: isDark ? '#1C1C1E' : '#FFFFFF' },
      };

  return (
    <BarWrapper
      {...blurProps}
      style={[
        styles.tabBar,
        { paddingBottom: tabBarBottomPad },
        Platform.OS !== 'ios' && {
          backgroundColor: isDark ? '#1C1C1E' : '#FFFFFF',
          borderTopColor: isDark
            ? 'rgba(255,255,255,0.1)'
            : 'rgba(0,0,0,0.08)',
          borderTopWidth: StyleSheet.hairlineWidth,
        },
      ]}>

      {/* iOS top specular edge */}
      {Platform.OS === 'ios' && (
        <>
          <View style={styles.tabBarTopEdge} />
          <View
            style={[
              styles.tabBarTintOverlay,
              {
                backgroundColor: isDark
                  ? 'rgba(0,0,0,0.15)'
                  : 'rgba(255,255,255,0.25)',
              },
            ]}
          />
        </>
      )}

      {/* Tab buttons */}
      <View style={styles.tabRow}>
        {state.routes.map((route, index) => {
          const focused = state.index === index;
          const iconSource = tabIcons[route.name];
          const label = tabLabels[route.name] || route.name;

          const onPress = () => {
            const event = navigation.emit({
              type: 'tabPress',
              target: route.key,
              canPreventDefault: true,
            });
            if (!focused && !event.defaultPrevented) {
              navigation.navigate(route.name);
            }
          };

          return (
            <TouchableOpacity
              key={route.key}
              onPress={onPress}
              activeOpacity={0.8}
              style={styles.tabItem}>

              {focused ? (
                // ── Active: liquid glass pill ──
                <View
                  style={[
                    styles.activePillOuter,
                    {
                      borderColor: isDark ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.55)',
                      backgroundColor: isDark ? 'rgba(255,255,255,0.09)' : 'rgba(255,255,255,0.18)',
                    },
                  ]}>
                  {Platform.OS === 'ios' && (
                    <BlurView
                      style={StyleSheet.absoluteFillObject}
                      blurType={isDark ? 'ultraThinMaterialDark' : 'ultraThinMaterialLight'}
                      blurAmount={isDark ? 28 : 20}
                      reducedTransparencyFallbackColor={isDark ? 'rgba(26,26,30,0.72)' : 'rgba(255,255,255,0.3)'}
                    />
                  )}
                  {/* specular shimmer on pill top */}
                  <View
                    style={[
                      styles.pillSpecular,
                      {
                        backgroundColor: isDark ? 'rgba(255,255,255,0.35)' : 'rgba(255,255,255,0.9)',
                      },
                    ]}
                  />
                  {/* inner border for glass depth */}
                  <View
                    style={[
                      styles.pillInnerBorder,
                      {
                        borderColor: isDark ? 'rgba(255,255,255,0.14)' : 'rgba(255,255,255,0.22)',
                      },
                    ]}
                  />

                  <Image
                    source={iconSource}
                    style={[styles.tabIcon, { tintColor: ACTIVE_BLUE }]}
                    resizeMode="contain"
                  />
                  <Text style={[styles.tabLabel, { color: ACTIVE_BLUE }]}>
                    {label}
                  </Text>
                </View>
              ) : (
                // ── Inactive ──
                <View style={styles.inactiveWrap}>
                  <Image
                    source={iconSource}
                    style={[
                      styles.tabIcon,
                      {
                        tintColor: isDark
                          ? colors.textSecondary
                          : colors.textSecondary,
                      },
                    ]}
                    resizeMode="contain"
                  />
                  <Text
                    style={[
                      styles.tabLabel,
                      { color: colors.textSecondary },
                    ]}>
                    {label}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </View>
    </BarWrapper>
  );
}

// ─── Navigator ────────────────────────────────────────────────────────────────
export default function MainTabNavigator() {
  const { isDark, colors } = useAppTheme();

  return (
    <Tab.Navigator
      tabBar={props => <LiquidGlassTabBar {...props} />}
      sceneContainerStyle={{ backgroundColor: colors.background }}
      screenOptions={{
        headerShown: false,
        // Keep tab screens mounted to avoid white flash / flicker.
        lazy: false,
        detachInactiveScreens: false,
      }}>
      <Tab.Screen name="Dashboard" component={DashboardScreen} />
      <Tab.Screen name="Explore" component={ExplorePixelPerfectScreen} />
      <Tab.Screen name="MyFolios" component={MyFoliosScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  tabBar: {
    overflow: 'hidden',
    height: 95,
  },
  tabBarTopEdge: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: StyleSheet.hairlineWidth,
    backgroundColor: 'rgba(255,255,255,0.7)',
  },
  tabBarTintOverlay: {
    ...StyleSheet.absoluteFillObject,
  },

  tabRow: {
    flexDirection: 'row',
    paddingTop: 10,
    paddingHorizontal: 8,
  },

  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Inactive wrap — same size as active pill
  inactiveWrap: {
    width: TAB_BOX_SIZE,
    height: TAB_BOX_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 20,
  },

  // Active pill — fixed dimensions
  activePillOuter: {
    width: TAB_BOX_SIZE,
    height: TAB_BOX_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  pillSpecular: {
    position: 'absolute',
    top: 0,
    left: '20%',
    right: '20%',
    height: StyleSheet.hairlineWidth * 2,
    borderRadius: 99,
  },
  pillInnerBorder: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 20,
    borderWidth: 1,
  },

  tabIcon: {
    width: 22,
    height: 22,
    marginBottom: 5,
  },
  tabLabel: {
    fontSize: 11,
    fontWeight: '600',
  },
});