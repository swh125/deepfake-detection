import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { ThemeProvider as MuiThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';

type ColorMode = 'light' | 'dark';

interface ColorModeContextValue {
  mode: ColorMode;
  toggleColorMode: () => void;
}

const ColorModeContext = createContext<ColorModeContextValue | undefined>(undefined);

export const useColorMode = (): ColorModeContextValue => {
  const ctx = useContext(ColorModeContext);
  if (!ctx) {
    throw new Error('useColorMode must be used within ColorModeProvider');
  }
  return ctx;
};

interface ColorModeProviderProps {
  children: React.ReactNode;
}

export const ColorModeProvider: React.FC<ColorModeProviderProps> = ({ children }) => {
  const [mode, setMode] = useState<ColorMode>('dark');

  useEffect(() => {
    const stored = window.localStorage.getItem('color-mode') as ColorMode | null;
    if (stored === 'light' || stored === 'dark') {
      setMode(stored);
    } else {
      const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
      setMode(prefersDark ? 'dark' : 'light');
    }
  }, []);

  const toggleColorMode = useCallback(() => {
    setMode(prev => {
      const next = prev === 'light' ? 'dark' : 'light';
      window.localStorage.setItem('color-mode', next);
      return next;
    });
  }, []);

  const theme = useMemo(() => {
    return createTheme({
      palette: {
        mode,
        primary: { main: '#2196f3' },
        secondary: { main: '#f50057' },
        background: mode === 'dark'
          ? { default: '#0a0a0a', paper: '#1a1a1a' }
          : { default: '#fafafa', paper: '#ffffff' },
      },
      typography: {
        fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
      },
      components: {
        MuiButton: {
          styleOverrides: { root: { borderRadius: 8, textTransform: 'none' } },
        },
        MuiCard: {
          styleOverrides: {
            root: {
              borderRadius: 12,
              background: mode === 'dark'
                ? 'linear-gradient(145deg, #1a1a1a 0%, #2a2a2a 100%)'
                : 'linear-gradient(145deg, #ffffff 0%, #f5f5f5 100%)',
            },
          },
        },
      },
    });
  }, [mode]);

  const contextValue: ColorModeContextValue = useMemo(() => ({ mode, toggleColorMode }), [mode, toggleColorMode]);

  return (
    <ColorModeContext.Provider value={contextValue}>
      <MuiThemeProvider theme={theme}>
        <CssBaseline />
        {children}
      </MuiThemeProvider>
    </ColorModeContext.Provider>
  );
};

export default ColorModeProvider;

