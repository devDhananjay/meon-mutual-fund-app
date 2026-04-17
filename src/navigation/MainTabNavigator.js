import React from 'react';
import {createBottomTabNavigator} from '@react-navigation/bottom-tabs';
import {Text, View, StyleSheet, Image} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import DashboardScreen from '../screens/Dashboard/DashboardScreen';
/** Tab Explore uses this screen (not ExploreScreen.js). Theme/UI changes must be applied here too. */
import ExplorePixelPerfectScreen from '../screens/Explore/ExplorePixelPerfectScreen';
import MyFoliosScreen from '../screens/MyFolios/MyFoliosScreen';
import ProfileScreen from '../screens/Profile/ProfileScreen';
import {Colors} from '../utils/AppConstant';
import Icons from '../utils/icons';
import {useAppTheme} from '../theme/useAppTheme';

const Tab = createBottomTabNavigator();

function tabIcon(tabKey, isDark, colors, activeColor) {
  return function TabBarIcon({focused}) {
    const source =
      tabKey === 'Dashboard'
        ? focused
          ? Icons.TabHomeDark
          : Icons.TabHomeGrey
        : tabKey === 'Explore'
          ? focused
            ? Icons.TabExploreDark
            : Icons.TabExploreGrey
          : tabKey === 'MyFolios'
            ? focused
              ? Icons.TabMyFoliosDark
              : Icons.TabMyFoliosGrey
            : focused
              ? Icons.TabProfileDark
              : Icons.TabProfileGrey;
    return (
      <View style={styles.tabIconWrap}>
        <Image
          source={source}
          style={[
            styles.tabIconImg,
            focused ? {tintColor: activeColor} : null,
            !focused && isDark ? {tintColor: colors.textSecondary} : null,
          ]}
          resizeMode="contain"
        />
        {focused ? <View style={[styles.tabIndicator, {backgroundColor: activeColor}]} /> : <View style={styles.tabIndicatorOff} />}
      </View>
    );
  };
}

export default function MainTabNavigator() {
  const {isDark, colors} = useAppTheme();
  const insets = useSafeAreaInsets();
  const ACTIVE_BLUE = '#1E81F2';
  /** Push tab bar above Android 3-button / gesture nav & iOS home indicator */
  const tabBarBottomPad = Math.max(insets.bottom, 10);
  const tabBarTopPad = 8;
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: ACTIVE_BLUE,
        tabBarInactiveTintColor: colors.textSecondary,
        tabBarLabelStyle: {fontSize: 11, fontWeight: '600'},
        tabBarStyle: {
          borderTopColor: colors.border,
          backgroundColor: colors.tabBg,
          paddingBottom: tabBarBottomPad,
          paddingTop: tabBarTopPad,
          minHeight: 52 + tabBarTopPad + tabBarBottomPad,
          shadowColor: '#000',
          shadowOffset: {width: 0, height: -2},
          shadowOpacity: 0.08,
          shadowRadius: 8,
          // elevation: 8,
        },
      }}>
      <Tab.Screen
        name="Dashboard"
        component={DashboardScreen}
        options={{
          tabBarLabel: 'Dashboard',
          tabBarIcon: tabIcon('Dashboard', isDark, colors, ACTIVE_BLUE),
        }}
      />
      <Tab.Screen
        name="Explore"
        component={ExplorePixelPerfectScreen}
        options={{
          tabBarLabel: 'Explore',
          tabBarIcon: tabIcon('Explore', isDark, colors, ACTIVE_BLUE),
        }}
      />
      <Tab.Screen
        name="MyFolios"
        component={MyFoliosScreen}
        options={{
          tabBarLabel: 'My Folios',
          tabBarIcon: tabIcon('MyFolios', isDark, colors, ACTIVE_BLUE),
        }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          tabBarLabel: 'Profile',
          tabBarIcon: tabIcon('Profile', isDark, colors, ACTIVE_BLUE),
        }}
      />
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  tabIconWrap: {alignItems: 'center', justifyContent: 'center'},
  tabIconImg: {width: 22, height: 22, marginTop: 2},
  tabIndicator: {
    marginTop: 6,
    width: 22,
    height: 3,
    borderRadius: 99,
    backgroundColor: Colors.themeBlue,
  },
  tabIndicatorOff: {marginTop: 6, width: 22, height: 3, borderRadius: 99, backgroundColor: 'transparent'},
});
