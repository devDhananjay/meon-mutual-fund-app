import React, {createContext, useContext, useMemo} from 'react';
import {useSelector} from 'react-redux';

const ThemeContext = createContext(null);

const lightColors = {
  background: '#F8FAFC',
  card: '#FFFFFF',
  textPrimary: '#111827',
  textSecondary: '#6B7280',
  border: '#E5E7EB',
  muted: '#9CA3AF',
  primary: '#21C76E',
  success: '#16A34A',
  danger: '#DC2626',
  inputBg: '#FFFFFF',
  statusBar: 'dark-content',
  tabBg: '#F8FAFC',
};

const darkColors = {
  background: '#121212',
  card: '#1E1E1E',
  textPrimary: '#FFFFFF',
  textSecondary: '#AAAAAA',
  border: '#2C2C2C',
  muted: '#AAAAAA',
  primary: '#21C76E',
  success: '#22C55E',
  danger: '#F87171',
  inputBg: '#1E1E1E',
  statusBar: 'light-content',
  tabBg: '#1E1E1E',
};

export function ThemeProvider({children}) {
  const mode = useSelector(s => s.theme.mode);
  const value = useMemo(() => {
    const isDark = mode === 'dark';
    return {
      isDark,
      mode: isDark ? 'dark' : 'light',
      colors: isDark ? darkColors : lightColors,
    };
  }, [mode]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useThemeContext() {
  return useContext(ThemeContext);
}
