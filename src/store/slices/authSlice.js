import {createSlice} from '@reduxjs/toolkit';
import {isBsePostAllowed} from '../../utils/bsePostAllow';

const initialState = {
  isAuthenticated: false,
  user: null,
  accessToken: null,
  refreshToken: null,
  bsePostAllow: true,
};

function resolveBsePostAllow(payload) {
  if (payload?.bsePostAllow === true || payload?.bsePostAllow === false) {
    return payload.bsePostAllow;
  }
  return isBsePostAllowed(payload?.user);
}

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    login(state, action) {
      state.isAuthenticated = true;
      state.user = action.payload.user;
      state.accessToken = action.payload.accessToken;
      state.refreshToken = action.payload.refreshToken ?? null;
      state.bsePostAllow = resolveBsePostAllow(action.payload);
    },
    restoreSession(state, action) {
      state.isAuthenticated = true;
      state.user = action.payload.user;
      state.accessToken = action.payload.accessToken;
      state.refreshToken = action.payload.refreshToken ?? null;
      if (action.payload.bsePostAllow === true || action.payload.bsePostAllow === false) {
        state.bsePostAllow = action.payload.bsePostAllow;
      } else if (action.payload.user && Object.prototype.hasOwnProperty.call(action.payload.user, 'bse_post_allow')) {
        state.bsePostAllow = action.payload.user.bse_post_allow !== false;
      }
    },
    logout(state) {
      state.isAuthenticated = false;
      state.user = null;
      state.accessToken = null;
      state.refreshToken = null;
      state.bsePostAllow = true;
    },
  },
});

export const {login, restoreSession, logout} = authSlice.actions;
export const selectCanPostToBse = state => state.auth.bsePostAllow !== false;
export default authSlice.reducer;
