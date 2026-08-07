/**
 * Copyright (c) 2026, WSO2 LLC. (https://www.wso2.com).
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
