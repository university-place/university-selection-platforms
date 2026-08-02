import { useTheme } from '@/context/ThemeContext';

export function useColorScheme() {
  const { isDarkMode } = useTheme();
  return isDarkMode ? 'dark' : 'light';
}
