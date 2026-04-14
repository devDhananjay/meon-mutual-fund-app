/**
 * Meon Mutual Funds - Root App
 * @format
 */

import React, {useEffect} from 'react';
import {StyleSheet, LogBox, Alert, Linking, Platform} from 'react-native';
import {Provider, useDispatch} from 'react-redux';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {GestureHandlerRootView} from 'react-native-gesture-handler';
import {SafeAreaProvider} from 'react-native-safe-area-context';
import VersionCheck from 'react-native-version-check';
import {store} from './src/store';
import {setCartItems} from './src/store/slices/cartSlice';
import {setThemeMode} from './src/store/slices/themeSlice';
import {STORAGE_KEYS} from './src/constants/storageKeys';
import AppContainer from './src/route/AppContainer';
import {ThemeProvider} from './src/theme/ThemeProvider';
import AppAlertHost from './src/components/AppAlertHost';

export {navigate} from './src/navigation/navigationRef';

function CartHydrate() {
  const dispatch = useDispatch();
  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEYS.CART_ITEMS);
        if (raw) {
          dispatch(setCartItems(JSON.parse(raw)));
        }
      } catch {
        /* ignore */
      }
    })();
  }, [dispatch]);
  return null;
}

function ThemeHydrate() {
  const dispatch = useDispatch();
  useEffect(() => {
    (async () => {
      try {
        const mode = await AsyncStorage.getItem(STORAGE_KEYS.THEME_MODE);
        if (mode === 'dark' || mode === 'light') {
          dispatch(setThemeMode(mode));
        }
      } catch {
        /* ignore */
      }
    })();
  }, [dispatch]);
  return null;
}

function AppVersionGate() {
  useEffect(() => {
    const ANDROID_PACKAGE = 'com.meonmutualfunds';
    const IOS_APP_ID = '6761367321';
    const ANDROID_STORE_URL =
      'https://play.google.com/store/apps/details?id=com.meonmutualfunds';
    const IOS_STORE_URL = 'https://apps.apple.com/in/app/meon-mf/id6761367321';

    const checkAppVersion = async () => {
      try {
        const currentVersion = VersionCheck.getCurrentVersion();
        const latestVersion =
          Platform.OS === 'ios'
            ? await VersionCheck.getLatestVersion({
                provider: 'appStore',
                appID: IOS_APP_ID,
                country: 'in',
                ignoreErrors: true,
              })
            : await VersionCheck.getLatestVersion({
                provider: 'playStore',
                packageName: ANDROID_PACKAGE,
                ignoreErrors: true,
              });

        if (!latestVersion || !currentVersion) {
          return;
        }

        const updateInfo = VersionCheck.needUpdate({
          currentVersion,
          latestVersion,
        });

        if (!updateInfo?.isNeeded) {
          return;
        }

        Alert.alert(
          'Update Available',
          'A new version of Meon MF is available. Please update to continue.',
          [
            {
              text: 'Update Now',
              onPress: async () => {
                try {
                  await Linking.openURL(
                    Platform.OS === 'android' ? ANDROID_STORE_URL : IOS_STORE_URL,
                  );
                } catch {
                  Alert.alert('Error', 'Unable to open app store link right now.');
                }
              },
            },
          ],
          {cancelable: false},
        );
      } catch {
        // Silent fail: app should continue even if version check fails.
      }
    };

    checkAppVersion();
  }, []);

  return null;
}

const styles = StyleSheet.create({
  root: {flex: 1},
});

export default function App() {
  useEffect(() => {
    // if (!__DEV__) {
    //   return;
    // }
    // Keep development logs visible for API debugging.
    LogBox.ignoreLogs([]);
  }, []);

  return (
    <GestureHandlerRootView style={styles.root}>
      <SafeAreaProvider>
        <Provider store={store}>
          <ThemeProvider>
            <CartHydrate />
            <ThemeHydrate />
            <AppVersionGate />
            <AppAlertHost />
            <AppContainer />
          </ThemeProvider>
        </Provider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
