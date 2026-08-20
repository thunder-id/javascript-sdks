// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

/**
 * Resolves a BCP 47 locale tag to its base (primary) language subtag, so that
 * region-qualified tags compare equal to their bare form (e.g. "en-US" and "en"
 * both resolve to "en"). Uses `Intl.Locale` when available, falling back to a
 * simple split on the first "-".
 *
 * @param tag - BCP 47 locale tag to resolve (e.g. "en-US", "hi-IN", "en")
 * @returns The lowercased base language subtag (e.g. "en", "hi")
 *
 * @example
 * ```typescript
 * getBaseLanguage('en-US') // 'en'
 * getBaseLanguage('hi-IN') // 'hi'
 * getBaseLanguage('en')    // 'en'
 * ```
 */
export default function getBaseLanguage(tag: string): string {
  try {
    return new Intl.Locale(tag).language.toLowerCase();
  } catch {
    return tag.split('-')[0].toLowerCase();
  }
}
