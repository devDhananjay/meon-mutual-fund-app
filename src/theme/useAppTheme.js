import {useMemo} from 'react';
import {useSelector} from 'react-redux';
import {useThemeContext} from './ThemeProvider';

export function useAppTheme() {
  const contextTheme = useThemeContext();
  if (contextTheme) {
    return contextTheme;
  }

  const mode = useSelector(s => s.theme.mode);
  return useMemo(() => {
    const isDark = mode === 'dark';
    return {
      isDark,
      mode: isDark ? 'dark' : 'light',
      colors: {
        background: isDark ? '#121212' : '#F8FAFC',
        card: isDark ? '#1E1E1E' : '#FFFFFF',
        textPrimary: isDark ? '#FFFFFF' : '#111827',
        textSecondary: isDark ? '#AAAAAA' : '#6B7280',
        border: isDark ? '#2C2C2C' : '#E5E7EB',
        muted: isDark ? '#AAAAAA' : '#9CA3AF',
        primary: '#1E81F2',
        success: isDark ? '#22C55E' : '#16A34A',
        danger: isDark ? '#F87171' : '#DC2626',
        inputBg: isDark ? '#1E1E1E' : '#FFFFFF',
        statusBar: isDark ? 'light-content' : 'dark-content',
        tabBg: isDark ? '#1E1E1E' : '#F8FAFC',
      },
    };
  }, [mode]);
}
