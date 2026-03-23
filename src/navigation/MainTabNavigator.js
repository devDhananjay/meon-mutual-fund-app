import React from 'react';
import {createBottomTabNavigator} from '@react-navigation/bottom-tabs';
import {Text, View, StyleSheet} from 'react-native';
import DashboardScreen from '../screens/Dashboard/DashboardScreen';
import ExplorePixelPerfectScreen from '../screens/Explore/ExplorePixelPerfectScreen';
import MyFoliosScreen from '../screens/MyFolios/MyFoliosScreen';
import ProfileScreen from '../screens/Profile/ProfileScreen';
import {Colors} from '../utils/AppConstant';

const Tab = createBottomTabNavigator();

function tabIcon(emoji) {
  return function TabBarIcon({focused}) {
    return (
      <View style={styles.tabIconWrap}>
        <Text style={[styles.tabIconTxt, focused && styles.tabIconTxtOn]}>{emoji}</Text>
        {focused ? <View style={styles.tabIndicator} /> : <View style={styles.tabIndicatorOff} />}
      </View>
    );
  };
}

export default function MainTabNavigator() {
  const ACTIVE_GREEN = '#00B386';
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: ACTIVE_GREEN,
        tabBarInactiveTintColor: Colors.GREY,
        tabBarLabelStyle: {fontSize: 11, fontWeight: '600'},
        tabBarStyle: {
          borderTopColor: Colors.BORDER_GREY,
          paddingBottom: 4,
          paddingTop: 4,
          height: 58,
        },
      }}>
      <Tab.Screen
        name="Dashboard"
        component={DashboardScreen}
        options={{
          tabBarLabel: 'Dashboard',
          tabBarIcon: tabIcon('◫'),
        }}
      />
      <Tab.Screen
        name="Explore"
        component={ExplorePixelPerfectScreen}
        options={{
          tabBarLabel: 'Explore',
          tabBarIcon: tabIcon('◎'),
        }}
      />
      <Tab.Screen
        name="MyFolios"
        component={MyFoliosScreen}
        options={{
          tabBarLabel: 'My Folios',
          tabBarIcon: tabIcon('◈'),
        }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          tabBarLabel: 'Profile',
          tabBarIcon: tabIcon('◉'),
        }}
      />
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  tabIconWrap: {alignItems: 'center', justifyContent: 'center'},
  tabIconTxt: {fontSize: 20, opacity: 0.45},
  tabIconTxtOn: {opacity: 1},
  tabIndicator: {
    marginTop: 6,
    width: 22,
    height: 3,
    borderRadius: 99,
    backgroundColor: '#00B386',
  },
  tabIndicatorOff: {marginTop: 6, width: 22, height: 3, borderRadius: 99, backgroundColor: 'transparent'},
});
