// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

/**
 * Lowercases the language subtag and uppercases a 2-letter region subtag (the common
 * `language-REGION` shape), leaving everything else as-is. Not a full BCP 47 canonicalizer,
 * but deterministic and dependency-free, so case-only differences still compare equal without
 * `Intl.Locale`.
 */
function canonicalizeTagManually(tag: string): string {
  return tag
    .split('-')
    .map((part: string, index: number): string => {
      if (index === 0) {
        return part.toLowerCase();
      }
      return part.length === 2 ? part.toUpperCase() : part;
    })
    .join('-');
}

/**
 * Resolves a BCP 47 locale tag to its canonical form, so tags that differ only in casing or
 * separator style compare equal (e.g. "en-us" and "en-US"). Uses `Intl.Locale` when available;
 * falls back to {@link canonicalizeTagManually} when it isn't (or rejects the input), so exact
 * dialect matching stays consistent either way.
 *
 * Unlike {@link getBaseLanguage}, this preserves the region/dialect — use it to test for an
 * *exact* match (e.g. "en-IN" against "en-IN"), not a same-base-language match.
 *
 * @param tag - BCP 47 locale tag to resolve (e.g. "en-US", "fr-CA")
 * @returns The canonical form of the tag
 *
 * @example
 * ```typescript
 * normalizeLocaleTag('en-us') // 'en-US'
 * normalizeLocaleTag('fr-CA') // 'fr-CA'
 * ```
 */
export default function normalizeLocaleTag(tag: string): string {
  try {
    return new Intl.Locale(tag).toString();
  } catch {
    return canonicalizeTagManually(tag);
  }
}
