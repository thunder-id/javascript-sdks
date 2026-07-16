/**
 * Copyright (c) 2025, WSO2 LLC. (https://www.wso2.com).
 *
 * WSO2 LLC. licenses this file to you under the Apache License,
 * Version 2.0 (the "License"); you may not use this file except
 * in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied. See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import {
  Theme,
  ThemeConfig,
  ThemeMode,
  ThemePreferences,
  RecursivePartial,
  BrowserThemeDetection,
  DEFAULT_THEME,
  createTheme,
  detectThemeMode,
  createClassObserver,
  createMediaQueryListener,
} from '@thunderid/browser';
import {
  computed,
  defineComponent,
  h,
  onBeforeUnmount,
  onMounted,
  provide,
  readonly,
  shallowReadonly,
  ref,
  watch,
  type Component,
  type PropType,
  type Ref,
  type SetupContext,
  type VNode,
} from 'vue';
import {THEME_KEY} from '../keys';
import type {ThemeContextValue} from '../models/contexts';

/**
 * ThemeProvider manages theme state and provides it to child components via `useTheme()`.
 *
 * It supports:
 * - Fixed color schemes (`light` | `dark`)
 * - System preference detection (`system`)
 * - CSS-class-based detection (`class`)
 * - CSS variable injection onto `document.documentElement`
 *
 * @example
 * ```vue
 * <ThemeProvider mode="system">
 *   <App />
 * </ThemeProvider>
 * ```
 */
interface ThemeProviderProps {
  detection: BrowserThemeDetection;
  mode: ThemeMode | 'branding';
  theme: RecursivePartial<ThemeConfig> | undefined;
}

const ThemeProvider: Component = defineComponent({
  name: 'ThemeProvider',
  props: {
    /** Theme detection configuration (for 'class' or 'system' mode). */
    detection: {default: () => ({}), type: Object as PropType<BrowserThemeDetection>},
    /**
     * The theme mode:
     * - `'light'` | `'dark'`: Fixed color scheme.
     * - `'system'`: Follows OS preference.
     * - `'class'`: Detects theme from CSS classes on `<html>`.
     * - `'branding'`: Follows the active theme from branding preference.
     */
    mode: {
      default: DEFAULT_THEME as ThemeMode | 'branding',
      type: String as PropType<ThemeMode | 'branding'>,
    },
    /** Optional partial theme overrides applied on top of the resolved theme. */
    theme: {default: undefined, type: Object as PropType<RecursivePartial<ThemeConfig>>},
  },
  setup(props: ThemeProviderProps, {slots}: SetupContext): () => VNode {
    const initColorScheme = (): 'light' | 'dark' => {
      if (props.mode === 'light' || props.mode === 'dark') return props.mode;
      if (props.mode === 'branding') return detectThemeMode('system', props.detection);
      return detectThemeMode(props.mode as ThemeMode, props.detection);
    };

    const colorScheme: Ref<'light' | 'dark'> = ref(initColorScheme());

    const finalThemeConfig: Ref<RecursivePartial<ThemeConfig> | undefined> = computed<
      RecursivePartial<ThemeConfig> | undefined
    >(() => props.theme);

    const resolvedTheme: Ref<Theme> = computed<Theme>(() =>
      createTheme(finalThemeConfig.value, colorScheme.value === 'dark'),
    );

    const direction: Ref<'ltr' | 'rtl'> = computed<'ltr' | 'rtl'>(
      () => ((finalThemeConfig.value as any)?.direction as 'ltr' | 'rtl') || 'ltr',
    );

    const toggleTheme = (): void => {
      colorScheme.value = colorScheme.value === 'light' ? 'dark' : 'light';
    };

    // Apply CSS variables to DOM
    const applyToDom = (theme: Theme): void => {
      if (typeof document === 'undefined') return;
      const root: HTMLElement = document.documentElement;
      // Use the pre-computed cssVariables map from createTheme() which contains
      // correctly-named CSS variables (e.g. --thunder-color-primary-main).
      Object.entries(theme.cssVariables).forEach(([key, value]: [key: string, value: string]): void => {
        root.style.setProperty(key, value);
      });
    };

    watch(resolvedTheme, (theme: Theme): void => applyToDom(theme), {immediate: true});

    // Apply direction to document
    watch(
      direction,
      (dir: 'ltr' | 'rtl'): void => {
        if (typeof document !== 'undefined') {
          document.documentElement.dir = dir;
        }
      },
      {immediate: true},
    );

    // Set up automatic theme detection listeners
    let classObserver: MutationObserver | null = null;
    let mediaQuery: MediaQueryList | null = null;

    const handleThemeChange = (isDark: boolean): void => {
      colorScheme.value = isDark ? 'dark' : 'light';
    };

    onMounted((): void => {
      if (props.mode === 'branding') return;

      if (props.mode === 'class') {
        const targetElement: HTMLElement = (props.detection as any).targetElement || document.documentElement;
        if (targetElement) {
          classObserver = createClassObserver(targetElement, handleThemeChange, props.detection);
        }
      } else if (props.mode === 'system') {
        mediaQuery = createMediaQueryListener(handleThemeChange);
      }
    });

    onBeforeUnmount((): void => {
      if (classObserver) classObserver.disconnect();
      if (mediaQuery?.removeEventListener) {
        mediaQuery.removeEventListener('change', handleThemeChange as any);
      }
    });

    const context: ThemeContextValue = {
      colorScheme: readonly(colorScheme),
      direction: readonly(direction) as Readonly<Ref<'ltr' | 'rtl'>>,
      theme: shallowReadonly(resolvedTheme),
      toggleTheme,
    };

    provide(THEME_KEY, context);

    return () => h('div', {style: 'display:contents'}, slots['default']?.());
  },
});

export default ThemeProvider;
