import {createSlice} from '@reduxjs/toolkit';

const cartSlice = createSlice({
  name: 'cart',
  initialState: {
    items: [],
  },
  reducers: {
    setCartItems(state, action) {
      state.items = action.payload;
    },
    addToCart(state, action) {
      const {fund, amount, isSIP, sipFrequency, sipDate, sipDurationYears, mandateId, mandateLabel, logo_url} =
        action.payload;
      const idx = state.items.findIndex(
        item => item.fund.scheme_code === fund.scheme_code,
      );
      const entry = {
        id: idx >= 0 ? state.items[idx].id : Date.now().toString(),
        fund,
        amount,
        isSIP: !!isSIP,
        sipFrequency: isSIP ? sipFrequency : undefined,
        sipDate: isSIP ? sipDate : undefined,
        sipDurationYears: isSIP ? sipDurationYears : undefined,
        mandateId: isSIP ? mandateId : undefined,
        mandateLabel: isSIP ? mandateLabel : undefined,
        addedAt: idx >= 0 ? state.items[idx].addedAt : new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        logo_url: logo_url ?? fund?.logo_url,
      };
      if (idx >= 0) {
        state.items[idx] = {...state.items[idx], ...entry};
      } else {
        state.items.push(entry);
      }
    },
    removeFromCart(state, action) {
      const code = action.payload;
      state.items = state.items.filter(item => item.fund.scheme_code !== code);
    },
    updateCartItem(state, action) {
      const {fundCode, amount, isSIP, sipFrequency, sipDate, sipDurationYears, mandateId, mandateLabel} =
        action.payload;
      const idx = state.items.findIndex(item => item.fund.scheme_code === fundCode);
      if (idx >= 0) {
        state.items[idx] = {
          ...state.items[idx],
          amount,
          isSIP: !!isSIP,
          sipFrequency: isSIP ? sipFrequency : undefined,
          sipDate: isSIP ? sipDate : undefined,
          sipDurationYears: isSIP ? sipDurationYears : undefined,
          mandateId: isSIP ? mandateId : undefined,
          mandateLabel: isSIP ? mandateLabel : undefined,
          updatedAt: new Date().toISOString(),
        };
      }
    },
    clearCart(state) {
      state.items = [];
    },
  },
});

export const {setCartItems, addToCart, removeFromCart, updateCartItem, clearCart} =
  cartSlice.actions;

export const selectCartItems = state => state.cart.items;
export const selectCartItemCount = state => state.cart.items.length;
export const selectCartTotal = state =>
  state.cart.items.reduce((sum, item) => sum + Number(item.amount || 0), 0);

export default cartSlice.reducer;
