// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {
  type I18nBundle,
  type I18nTranslations,
  type Preferences,
  normalizeTranslations,
  substituteTranslationParams,
} from '@thunderid/browser';
import useI18n from '../../../../composables/useI18n';
import type {I18nContextValue} from '../../../../models/contexts';

/**
 * A translation function.
 */
export type AdminTranslate = (key: string, params?: Record<string, string | number>) => string;

/**
 * Returns a translation function that honors component-level `preferences.i18n.bundles` over the
 * provider's bundles, falling back to the configured fallback language and then to the provider.
 * Reactive when called from a render function, since it reads the current language.
 *
 * @param getPreferences - Getter for the component's `preferences` prop.
 * @returns The translation function.
 */
const useAdminTranslation = (getPreferences: () => Preferences | undefined): AdminTranslate => {
  const i18n: I18nContextValue = useI18n();

  return (key: string, params?: Record<string, string | number>): string => {
    const bundles: Record<string, I18nBundle> | undefined = getPreferences()?.i18n?.bundles;

    if (bundles) {
      const lookup = (language: string): string | undefined => {
        const bundle: I18nBundle | undefined = bundles[language];

        if (!bundle) {
          return undefined;
        }

        const translations: I18nTranslations = normalizeTranslations(
          bundle.translations as unknown as Record<string, string | Record<string, string>>,
        );

        return (translations as unknown as Record<string, string | undefined>)[key];
      };

      const translation: string | undefined = lookup(i18n.currentLanguage.value) ?? lookup(i18n.fallbackLanguage);

      if (translation) {
        return substituteTranslationParams(translation, params);
      }
    }

    return i18n.t(key, params);
  };
};

export default useAdminTranslation;
