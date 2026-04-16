import React from 'react';
import {StyleSheet} from 'react-native';
import {
  NavigationContainer,
  DefaultTheme as NavDefaultTheme,
  DarkTheme as NavDarkTheme,
} from '@react-navigation/native';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import {useSelector} from 'react-redux';
import {navigationRef} from '../navigation/navigationRef';
import Splash from '../screens/Splash';
import Login from '../screens/Login';
import ForgotPassword from '../screens/ForgotPassword';
import EmailSent from '../screens/EmailSent';
import ResetPassword from '../screens/ResetPassword';
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
import NotificationsScreen from '../screens/Notifications/NotificationsScreen';
import RedeemScreen from '../screens/Redeem/RedeemScreen';
import FundInvestmentScreen from '../screens/FundDetail/FundInvestmentScreen';
import SupportArticleScreen from '../screens/Profile/SupportArticleScreen';
import DeleteAccountScreen from '../screens/Profile/DeleteAccountScreen';
import ProfileSettingsScreen from '../screens/Profile/ProfileSettingsScreen';
import AccountDetailsScreen from '../screens/Profile/AccountDetailsScreen';
import ChangePasswordScreen from '../screens/Profile/ChangePasswordScreen';
import PrivacyPolicyScreen from '../legal/PRIVACY_POLICY';

const Stack = createNativeStackNavigator();

const navStyles = StyleSheet.create({
  flex: {flex: 1},
});

export default function AppContainer() {
  const themeMode = useSelector(s => s.theme.mode);
  const isDark = themeMode === 'dark';
  const navigationTheme = isDark
    ? {
        ...NavDarkTheme,
        colors: {
          ...NavDarkTheme.colors,
          background: '#121212',
          card: '#1E1E1E',
          text: '#FFFFFF',
          border: '#2C2C2C',
          primary: '#1E81F2',
        },
      }
    : {
        ...NavDefaultTheme,
        colors: {
          ...NavDefaultTheme.colors,
          background: '#F8FAFC',
          card: '#FFFFFF',
          text: '#111827',
          border: '#E5E7EB',
          primary: '#1E81F2',
        },
      };

  return (
    <NavigationContainer ref={navigationRef} style={navStyles.flex} theme={navigationTheme}>
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
        <Stack.Screen name="ResetPassword" component={ResetPassword} />
        <Stack.Screen name="MainTabs" component={MainTabNavigator} />
        <Stack.Screen name="FundDetail" component={FundDetailScreen} />
        <Stack.Screen name="Cart" component={CartScreen} />
        <Stack.Screen name="Notifications" component={NotificationsScreen} />
        <Stack.Screen name="Redeem" component={RedeemScreen} />
        <Stack.Screen name="FundInvestment" component={FundInvestmentScreen} />
        <Stack.Screen name="MyOrders" component={MyOrdersScreen} />
        <Stack.Screen name="OrderDetail" component={OrderDetailScreen} />
        <Stack.Screen name="AllFundsSIP" component={AllMutualFundsScreen} />
        <Stack.Screen name="Watchlist" component={WatchlistScreen} />
        <Stack.Screen name="Mandate" component={MandateScreen} />
        <Stack.Screen name="MandateDetail" component={MandateDetailScreen} />
        <Stack.Screen name="MandateAuthWebview" component={MandateAuthWebViewScreen} />
        <Stack.Screen name="SupportArticle" component={SupportArticleScreen} />
        <Stack.Screen name="PrivacyPolicy" component={PrivacyPolicyScreen} />
        <Stack.Screen name="DeleteAccount" component={DeleteAccountScreen} />
        <Stack.Screen name="ProfileSettings" component={ProfileSettingsScreen} />
        <Stack.Screen name="AccountDetails" component={AccountDetailsScreen} />
        <Stack.Screen name="ChangePassword" component={ChangePasswordScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
