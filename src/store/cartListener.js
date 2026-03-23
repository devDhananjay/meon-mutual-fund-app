import {createListenerMiddleware, isAnyOf} from '@reduxjs/toolkit';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {STORAGE_KEYS} from '../constants/storageKeys';
import {
  addToCart,
  removeFromCart,
  updateCartItem,
  clearCart,
  setCartItems,
} from './slices/cartSlice';

const cartListener = createListenerMiddleware();

cartListener.startListening({
  matcher: isAnyOf(addToCart, removeFromCart, updateCartItem, clearCart, setCartItems),
  async effect(_action, listenerApi) {
    const items = listenerApi.getState().cart.items;
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.CART_ITEMS, JSON.stringify(items));
    } catch {
      /* ignore */
    }
  },
});

export const cartListenerMiddleware = cartListener.middleware;
