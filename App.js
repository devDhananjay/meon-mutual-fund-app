/**
 * Meon Mutual Funds - Root App
 * @format
 */

import React, {useEffect} from 'react';
import {StyleSheet} from 'react-native';
import {Provider, useDispatch} from 'react-redux';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {GestureHandlerRootView} from 'react-native-gesture-handler';
import {SafeAreaProvider} from 'react-native-safe-area-context';
import {store} from './src/store';
import {setCartItems} from './src/store/slices/cartSlice';
import {STORAGE_KEYS} from './src/constants/storageKeys';
import AppContainer from './src/route/AppContainer';

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

const styles = StyleSheet.create({
  root: {flex: 1},
});

export default function App() {
  return (
    <GestureHandlerRootView style={styles.root}>
      <SafeAreaProvider>
        <Provider store={store}>
          <CartHydrate />
          <AppContainer />
        </Provider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
