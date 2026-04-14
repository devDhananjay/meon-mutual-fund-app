import {createSlice} from '@reduxjs/toolkit';

const initialState = {
  mode: 'light',
};

const themeSlice = createSlice({
  name: 'theme',
  initialState,
  reducers: {
    setThemeMode: (state, action) => {
      const nextMode = action.payload === 'dark' ? 'dark' : 'light';
      state.mode = nextMode;
    },
    toggleThemeMode: state => {
      state.mode = state.mode === 'dark' ? 'light' : 'dark';
    },
  },
});

export const {setThemeMode, toggleThemeMode} = themeSlice.actions;
export default themeSlice.reducer;
