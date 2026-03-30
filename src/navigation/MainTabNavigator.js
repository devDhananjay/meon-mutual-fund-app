import React from 'react';
import {createBottomTabNavigator} from '@react-navigation/bottom-tabs';
import {Text, View, StyleSheet, Image} from 'react-native';
import DashboardScreen from '../screens/Dashboard/DashboardScreen';
import ExplorePixelPerfectScreen from '../screens/Explore/ExplorePixelPerfectScreen';
import MyFoliosScreen from '../screens/MyFolios/MyFoliosScreen';
import ProfileScreen from '../screens/Profile/ProfileScreen';
import {Colors} from '../utils/AppConstant';
import Icons from '../utils/icons';

const Tab = createBottomTabNavigator();

function tabIcon(tabKey) {
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
        <Image source={source} style={styles.tabIconImg} resizeMode="contain" />
        {focused ? <View style={styles.tabIndicator} /> : <View style={styles.tabIndicatorOff} />}
      </View>
    );
  };
}

export default function MainTabNavigator() {
  const ACTIVE_BLUE = Colors.themeBlue;
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: ACTIVE_BLUE,
        tabBarInactiveTintColor: Colors.GREY,
        tabBarLabelStyle: {fontSize: 11, fontWeight: '600'},
        tabBarStyle: {
          borderTopColor: Colors.BORDER_GREY,
          backgroundColor: Colors.offWhite,
          paddingBottom: 8,
          paddingTop: 8,
          height: 66,
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
          tabBarIcon: tabIcon('Dashboard'),
        }}
      />
      <Tab.Screen
        name="Explore"
        component={ExplorePixelPerfectScreen}
        options={{
          tabBarLabel: 'Explore',
          tabBarIcon: tabIcon('Explore'),
        }}
      />
      <Tab.Screen
        name="MyFolios"
        component={MyFoliosScreen}
        options={{
          tabBarLabel: 'My Folios',
          tabBarIcon: tabIcon('MyFolios'),
        }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          tabBarLabel: 'Profile',
          tabBarIcon: tabIcon('Profile'),
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
