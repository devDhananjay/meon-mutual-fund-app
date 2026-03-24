import React from 'react';
import {NavigationContainer} from '@react-navigation/native';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import {navigationRef} from '../navigation/navigationRef';
import Splash from '../screens/Splash';
import Login from '../screens/Login';
import ForgotPassword from '../screens/ForgotPassword';
import EmailSent from '../screens/EmailSent';
import MainTabNavigator from '../navigation/MainTabNavigator';
import FundDetailScreen from '../screens/FundDetail/FundDetailScreen';
import CartScreen from '../screens/Cart/CartScreen';
import MyOrdersScreen from '../screens/MyOrders/MyOrdersScreen';
import OrderDetailScreen from '../screens/MyOrders/OrderDetailScreen';
import AllMutualFundsScreen from '../screens/Explore/AllMutualFundsScreen';
import WatchlistScreen from '../screens/Watchlist/WatchlistScreen';
import MandateScreen from '../screens/Mandate/MandateScreen';
import MandateDetailScreen from '../screens/Mandate/MandateDetailScreen';
import MandateAuthWebViewScreen from '../screens/Mandate/MandateAuthWebViewScreen';

const Stack = createNativeStackNavigator();

export default function AppContainer() {
  return (
    <NavigationContainer ref={navigationRef}>
      <Stack.Navigator
        initialRouteName="Splash"
        screenOptions={{
          headerShown: false,
          animationEnabled: true,
          gestureEnabled: true,
          gestureDirection: 'horizontal',
          animation: 'slide_from_right',
        }}>
        <Stack.Screen name="Splash" component={Splash} />
        <Stack.Screen name="Login" component={Login} />
        <Stack.Screen name="ForgotPassword" component={ForgotPassword} />
        <Stack.Screen name="EmailSent" component={EmailSent} />
        <Stack.Screen name="MainTabs" component={MainTabNavigator} />
        <Stack.Screen name="FundDetail" component={FundDetailScreen} />
        <Stack.Screen name="Cart" component={CartScreen} />
        <Stack.Screen name="MyOrders" component={MyOrdersScreen} />
        <Stack.Screen name="OrderDetail" component={OrderDetailScreen} />
        <Stack.Screen name="AllFundsSIP" component={AllMutualFundsScreen} />
        <Stack.Screen name="Watchlist" component={WatchlistScreen} />
        <Stack.Screen name="Mandate" component={MandateScreen} />
        <Stack.Screen name="MandateDetail" component={MandateDetailScreen} />
        <Stack.Screen name="MandateAuthWebview" component={MandateAuthWebViewScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
