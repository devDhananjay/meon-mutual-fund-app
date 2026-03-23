import {configureStore} from '@reduxjs/toolkit';
import authReducer from './slices/authSlice';
import cartReducer from './slices/cartSlice';
import {cartListenerMiddleware} from './cartListener';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    cart: cartReducer,
  },
  middleware: getDefaultMiddleware =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredPaths: ['auth.user', 'cart.items'],
      },
    }).prepend(cartListenerMiddleware),
});
