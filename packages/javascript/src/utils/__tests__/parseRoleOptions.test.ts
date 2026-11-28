// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {describe, expect, it} from 'vitest';
import parseRoleOptions from '../parseRoleOptions';

describe('parseRoleOptions', () => {
  it('reads the roles from the JSON string the server sends, in order', () => {
    expect(parseRoleOptions('[{"id":"r1","name":"Developer"},{"id":"r2","name":"Viewer"}]')).toEqual([
      {id: 'r1', name: 'Developer'},
      {id: 'r2', name: 'Viewer'},
    ]);
  });

  it('accepts an array that is already parsed', () => {
    expect(parseRoleOptions([{id: 'r1', name: 'Developer'}])).toEqual([{id: 'r1', name: 'Developer'}]);
  });

  it('names a role by its ID when the server sends no name', () => {
    expect(parseRoleOptions('[{"id":"r1"}]')).toEqual([{id: 'r1', name: 'r1'}]);
  });

  it('leaves out entries without an ID', () => {
    expect(parseRoleOptions('[{"name":"No ID"},{"id":""},null,"r1",{"id":"r2","name":"Viewer"}]')).toEqual([
      {id: 'r2', name: 'Viewer'},
    ]);
  });

  it('offers no roles for a missing, malformed or non-array value', () => {
    expect(parseRoleOptions(undefined)).toEqual([]);
    expect(parseRoleOptions('not json')).toEqual([]);
    expect(parseRoleOptions('{"id":"r1"}')).toEqual([]);
  });
});
