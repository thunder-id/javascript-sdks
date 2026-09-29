// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {KeyValuePair} from '../models/embedded-flow';

/**
 * Reads the label and value pairs a KEY_VALUE_LIST renders from the raw value found under its
 * `source` key in `additionalData`. The server publishes them as a JSON-encoded array, since
 * additional data carries strings, so both an array and its encoding are accepted.
 *
 * Entries that are not objects, or that carry no value, are dropped, since an empty row tells the
 * user nothing. Anything that is not a list of pairs yields none.
 *
 * @param raw - The raw value found under the source key.
 * @returns The pairs to render, empty when the value holds none.
 *
 * @example
 * ```typescript
 * parseKeyValuePairs('[{"label":"Email","value":"a@b.com"}]'); // [{label: 'Email', value: 'a@b.com'}]
 * parseKeyValuePairs('not json');                              // []
 * ```
 */
const parseKeyValuePairs = (raw: unknown): KeyValuePair[] => {
  let parsed: unknown = raw;

  if (typeof raw === 'string') {
    try {
      parsed = JSON.parse(raw);
    } catch {
      return [];
    }
  }

  if (!Array.isArray(parsed)) {
    return [];
  }

  return parsed
    .filter(
      (entry: unknown): entry is Record<string, unknown> =>
        typeof entry === 'object' && entry !== null && !Array.isArray(entry),
    )
    .map(
      (entry: Record<string, unknown>): KeyValuePair => ({
        label: typeof entry['label'] === 'string' ? entry['label'] : '',
        value: typeof entry['value'] === 'string' ? entry['value'] : '',
      }),
    )
    .filter((pair: KeyValuePair): boolean => pair.value !== '');
};

export default parseKeyValuePairs;
