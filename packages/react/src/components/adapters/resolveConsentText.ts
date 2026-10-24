// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {
  getDefaultI18nBundles,
  I18nBundle,
  substituteTranslationParams,
  TranslationBundleConstants,
} from '@thunderid/browser';
import {UseTranslation} from '../../hooks/useTranslation';

/**
 * Resolves a consent screen string through the given translator, falling back to the SDK's default
 * bundle when there is no translator or it has no entry for the key.
 *
 * @param t - Translator, when the screen has one.
 * @param key - Translation key.
 * @param params - Values to substitute into the text.
 * @returns The resolved text.
 */
const resolveConsentText = (
  t: UseTranslation['t'] | undefined,
  key: string,
  params?: Record<string, string | number>,
): string => {
  const translated: string | undefined = t?.(key, params);
  if (translated && translated !== key) {
    return translated;
  }
  const bundle: I18nBundle | undefined = getDefaultI18nBundles()[TranslationBundleConstants.FALLBACK_LOCALE];
  const fallback: string | undefined = bundle?.translations[key as keyof I18nBundle['translations']];

  return substituteTranslationParams(fallback ?? key, params);
};

export default resolveConsentText;
