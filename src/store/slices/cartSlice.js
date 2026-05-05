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
      const {
        fund,
        amount,
        isSIP,
        sipFrequency,
        sipDate,
        sipEndDate,
        sipDurationYears,
        mandateId,
        mandateLabel,
        firstOrderToday,
        logo_url,
        useMandate,
      } = action.payload;
      const idx = state.items.findIndex(
        item => item.fund.scheme_code === fund.scheme_code,
      );
      const lumpUseMandate = !isSIP && !!useMandate;
      const entry = {
        id: idx >= 0 ? state.items[idx].id : Date.now().toString(),
        fund,
        amount,
        isSIP: !!isSIP,
        sipFrequency: isSIP ? sipFrequency : undefined,
        sipDate: isSIP ? sipDate : undefined,
        sipEndDate: isSIP ? sipEndDate : undefined,
        sipDurationYears: isSIP ? sipDurationYears : undefined,
        useMandate: lumpUseMandate,
        mandateId: isSIP ? mandateId : lumpUseMandate ? mandateId : undefined,
        mandateLabel: isSIP ? mandateLabel : lumpUseMandate ? mandateLabel : undefined,
        firstOrderToday: isSIP && firstOrderToday ? true : false,
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
      const {
        fundCode,
        amount,
        isSIP,
        sipFrequency,
        sipDate,
        sipEndDate,
        sipDurationYears,
        mandateId,
        mandateLabel,
        firstOrderToday,
        useMandate,
      } = action.payload;
      const idx = state.items.findIndex(item => item.fund.scheme_code === fundCode);
      if (idx >= 0) {
        const prev = state.items[idx];
        const nextIsSip = !!isSIP;
        const lumpUseMandate = !nextIsSip && (useMandate !== undefined ? !!useMandate : !!prev.useMandate);
        const resolvedMandateId = mandateId !== undefined ? mandateId : prev.mandateId;
        const resolvedMandateLabel = mandateLabel !== undefined ? mandateLabel : prev.mandateLabel;
        state.items[idx] = {
          ...prev,
          amount,
          isSIP: nextIsSip,
          sipFrequency: nextIsSip ? sipFrequency : undefined,
          sipDate: nextIsSip ? sipDate : undefined,
          sipEndDate: nextIsSip ? sipEndDate : undefined,
          sipDurationYears: nextIsSip ? sipDurationYears : undefined,
          useMandate: nextIsSip ? false : lumpUseMandate,
          mandateId: nextIsSip ? resolvedMandateId : lumpUseMandate ? resolvedMandateId : undefined,
          mandateLabel: nextIsSip ? resolvedMandateLabel : lumpUseMandate ? resolvedMandateLabel : undefined,
          firstOrderToday:
            !nextIsSip ? false : firstOrderToday !== undefined ? !!firstOrderToday : !!prev.firstOrderToday,
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
