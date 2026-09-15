// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {
  createClassObserver,
  createMediaQueryListener,
  createTheme,
  detectThemeMode,
  FlowMetaTheme,
  RecursivePartial,
  Theme,
  ThemeConfig,
  ThemeMode,
} from '@thunderid/browser';
import {FC, PropsWithChildren, ReactElement, useCallback, useContext, useEffect, useMemo, useState} from 'react';
import ThemeContext from './ThemeContext';
import applyThemeToDOM from '../../utils/applyThemeToDOM';
import buildThemeConfigFromFlowMeta from '../../utils/buildThemeConfigFromFlowMeta';
import normalizeThemeConfig from '../../utils/normalizeThemeConfig';
import FlowMetaContext, {FlowMetaContextValue} from '../FlowMeta/FlowMetaContext';

export interface ThemeProviderProps {
  /**
   * Initial color scheme override. Overrides the server default when provided.
   */
  mode?: ThemeMode;

  /**
   * Optional theme overrides merged on top of the server-side flow meta theme.
   * User-supplied values take highest precedence.
   */
  theme?: RecursivePartial<ThemeConfig>;
}

/**
 * ThemeProvider is the v2 drop-in replacement for `ThemeProvider`.
 *
 * It reads the design theme from the nearest `FlowMetaContext` (provided by
 * `FlowMetaProvider`) and publishes a resolved `Theme` object through the
 * **same** `ThemeContext` that `useTheme` consumes.  This means all existing
 * components that call `useTheme` continue to work without any changes.
 *
 * The `defaultColorScheme` field returned by the server is used to seed the
 * active color scheme; the user can still toggle it locally via the
 * `toggleTheme` value exposed in the context.
 *
 * @example
 * ```tsx
 * <FlowMetaProvider config={{ baseUrl, type: FlowMetaType.App, id: appId }}>
 *   <ThemeProvider>
 *     <App />   {/* useTheme() works here as usual *\/}
 *   </ThemeProvider>
 * </FlowMetaProvider>
 * ```
 *
 * @example
 * With user theme overrides (user values win over server values):
 * ```tsx
 * <ThemeProvider theme={{ colors: { primary: { main: '#ff0000' } } }}>
 *   <App />
 * </ThemeProvider>
 * ```
 */
const ThemeProvider: FC<PropsWithChildren<ThemeProviderProps>> = ({
  children,
  mode,
  theme: themeOverrideProp,
}: PropsWithChildren<ThemeProviderProps>): ReactElement => {
  const themeOverride: RecursivePartial<ThemeConfig> | undefined = normalizeThemeConfig(themeOverrideProp);
  const flowMetaContext: FlowMetaContextValue | null = useContext(FlowMetaContext);

  const flowMetaTheme: FlowMetaTheme | null = flowMetaContext?.meta?.design?.theme ?? null;
  const isLoading: boolean = flowMetaContext?.isLoading ?? false;
  const error: Error | null = flowMetaContext?.error ?? null;

  // Seed the color scheme: a fixed mode wins outright, 'system'/'class' detect it from the
  // environment via the same shared utilities Vue's ThemeProvider uses, and no mode falls back
  // to the server's default (unchanged pre-`mode` behavior).
  const getInitialColorScheme = (): 'light' | 'dark' => {
    if (mode === 'light' || mode === 'dark') return mode;
    if (mode === 'system' || mode === 'class') return detectThemeMode(mode);
    return flowMetaTheme?.defaultColorScheme ?? 'light';
  };

  const [colorScheme, setColorScheme] = useState<'light' | 'dark'>(getInitialColorScheme);

  // When mode is unset, sync the color scheme with the server default once flow meta loads.
  useEffect(() => {
    if (mode === undefined && flowMetaTheme?.defaultColorScheme) {
      setColorScheme(flowMetaTheme.defaultColorScheme);
    }
  }, [mode, flowMetaTheme?.defaultColorScheme]);

  // Set up automatic detection listeners for 'system'/'class' modes.
  useEffect(() => {
    if (mode !== 'system' && mode !== 'class') return undefined;

    const handleThemeChange = (isDark: boolean): void => {
      setColorScheme(isDark ? 'dark' : 'light');
    };

    if (mode === 'class') {
      if (typeof document === 'undefined') return undefined;
      const observer = createClassObserver(document.documentElement, handleThemeChange);
      return () => {
        observer.disconnect();
      };
    }

    const mediaQuery = createMediaQueryListener(handleThemeChange);
    return () => {
      if (mediaQuery?.removeEventListener) {
        mediaQuery.removeEventListener('change', handleThemeChange as unknown as EventListener);
      }
    };
  }, [mode]);

  const toggleTheme: () => void = useCallback(() => {
    setColorScheme((prev: 'light' | 'dark') => (prev === 'light' ? 'dark' : 'light'));
  }, []);

  // Build the resolved ThemeConfig: flow meta base → user overrides on top.
  const finalThemeConfig: RecursivePartial<ThemeConfig> | undefined = useMemo(() => {
    if (!flowMetaTheme) {
      return themeOverride;
    }

    const metaConfig: RecursivePartial<ThemeConfig> = buildThemeConfigFromFlowMeta(flowMetaTheme, colorScheme);

    if (!themeOverride) {
      return metaConfig;
    }

    return {
      ...metaConfig,
      ...themeOverride,
      borderRadius: {
        ...metaConfig.borderRadius,
        ...themeOverride.borderRadius,
      },
      colors: {
        ...metaConfig.colors,
        ...themeOverride.colors,
      },
      ...(metaConfig.typography || themeOverride.typography
        ? {
            typography: {
              ...(metaConfig as any).typography,
              ...themeOverride.typography,
            },
          }
        : {}),
    };
  }, [flowMetaTheme, colorScheme, themeOverride]);

  const theme: Theme = useMemo(
    () => createTheme(finalThemeConfig, colorScheme === 'dark'),
    [finalThemeConfig, colorScheme],
  );

  const direction: 'ltr' | 'rtl' = flowMetaTheme?.direction ?? 'ltr';

  // Apply CSS variables to the document root.
  useEffect(() => {
    applyThemeToDOM(theme);
  }, [theme]);

  // Apply text direction to the document root.
  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.documentElement.dir = direction;
    }
  }, [direction]);

  const value: any = {
    colorScheme,
    direction,
    theme,
    toggleTheme,
  };

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};

export default ThemeProvider;
