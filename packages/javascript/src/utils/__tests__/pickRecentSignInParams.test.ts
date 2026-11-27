// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {describe, expect, it} from 'vitest';
import pickRecentSignInParams from '../pickRecentSignInParams';

describe('pickRecentSignInParams', () => {
  it('keeps max_age and prompt=login, from strings or numbers', () => {
    expect(pickRecentSignInParams({max_age: '180', prompt: 'login'})).toEqual({max_age: '180', prompt: 'login'});
    expect(pickRecentSignInParams({max_age: 0})).toEqual({max_age: '0'});
  });

  it('drops every other parameter', () => {
    expect(pickRecentSignInParams({redirect_uri: 'https://evil.example', returnTo: '/a', scope: 'x'})).toEqual({});
  });

  it('drops a max_age that is not a whole number of seconds, and any other prompt', () => {
    expect(pickRecentSignInParams({max_age: '-1'})).toEqual({});
    expect(pickRecentSignInParams({max_age: '1.5'})).toEqual({});
    expect(pickRecentSignInParams({max_age: '30&prompt=none'})).toEqual({});
    expect(pickRecentSignInParams({prompt: 'none'})).toEqual({});
  });

  it('accepts nothing', () => {
    expect(pickRecentSignInParams()).toEqual({});
    expect(pickRecentSignInParams(null)).toEqual({});
  });
});
