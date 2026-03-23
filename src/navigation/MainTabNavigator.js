import React from 'react';
import {createBottomTabNavigator} from '@react-navigation/bottom-tabs';
import {Text} from 'react-native';
import DashboardScreen from '../screens/Dashboard/DashboardScreen';
import ExploreScreen from '../screens/Explore/ExploreScreen';
import MyFoliosScreen from '../screens/MyFolios/MyFoliosScreen';
import ProfileScreen from '../screens/Profile/ProfileScreen';
import {Colors} from '../utils/AppConstant';

const Tab = createBottomTabNavigator();

function tabIcon(emoji) {
  return function TabBarIcon({focused}) {
    return <Text style={{fontSize: 20, opacity: focused ? 1 : 0.45}}>{emoji}</Text>;
  };
}

export default function MainTabNavigator() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: Colors.themeBlue,
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
        component={ExploreScreen}
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
