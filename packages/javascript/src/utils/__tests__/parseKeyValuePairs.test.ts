// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {describe, expect, it} from 'vitest';
import parseKeyValuePairs from '../parseKeyValuePairs';

describe('parseKeyValuePairs', (): void => {
  it('should parse a JSON-encoded list of pairs', (): void => {
    expect(parseKeyValuePairs('[{"label":"Email","value":"a@b.com"},{"label":"Username","value":"alice"}]')).toEqual([
      {label: 'Email', value: 'a@b.com'},
      {label: 'Username', value: 'alice'},
    ]);
  });

  it('should accept an already decoded list', (): void => {
    expect(parseKeyValuePairs([{label: 'Email', value: 'a@b.com'}])).toEqual([{label: 'Email', value: 'a@b.com'}]);
  });

  it('should drop entries that are not objects or carry no value', (): void => {
    expect(
      parseKeyValuePairs([
        {label: 'Email', value: 'a@b.com'},
        {label: 'Empty', value: ''},
        {label: 'Missing'},
        {label: 'Number', value: 42},
        'row',
        null,
        ['Email', 'a@b.com'],
      ]),
    ).toEqual([{label: 'Email', value: 'a@b.com'}]);
  });

  it('should default a missing label to an empty string', (): void => {
    expect(parseKeyValuePairs([{value: 'a@b.com'}])).toEqual([{label: '', value: 'a@b.com'}]);
  });

  it('should return no pairs for anything that is not a list', (): void => {
    expect(parseKeyValuePairs(undefined)).toEqual([]);
    expect(parseKeyValuePairs('')).toEqual([]);
    expect(parseKeyValuePairs('not json')).toEqual([]);
    expect(parseKeyValuePairs('{"label":"Email","value":"a@b.com"}')).toEqual([]);
  });
});
