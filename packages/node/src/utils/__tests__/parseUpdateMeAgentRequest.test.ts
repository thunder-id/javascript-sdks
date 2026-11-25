// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {describe, expect, it} from 'vitest';
import parseUpdateMeAgentRequest from '../parseUpdateMeAgentRequest';

const payload = {
  attributes: {name: 'Budget assistant'},
  description: 'Budgets',
  grantTypes: ['authorization_code'],
  redirectUris: ['https://assistant.example.com/callback'],
};

describe('parseUpdateMeAgentRequest', () => {
  it('keeps only the fields an owner may change', () => {
    expect(parseUpdateMeAgentRequest({...payload, clientSecret: 'stolen', owner: {id: 'someone'}})).toEqual(payload);
  });

  it('accepts an update without a description', () => {
    expect(parseUpdateMeAgentRequest({...payload, description: undefined})).toEqual({
      ...payload,
      description: undefined,
    });
  });

  it.each([
    ['no body', null],
    ['a body that is not an object', 'name=x'],
    ['no attributes', {...payload, attributes: undefined}],
    ['attributes that are a list', {...payload, attributes: ['name']}],
    ['a description that is not text', {...payload, description: 7}],
    ['grant types that are not text', {...payload, grantTypes: [1]}],
    ['no redirect URIs', {...payload, redirectUris: undefined}],
  ])('refuses %s', (_name: string, body: unknown) => {
    expect(parseUpdateMeAgentRequest(body)).toBeUndefined();
  });
});
