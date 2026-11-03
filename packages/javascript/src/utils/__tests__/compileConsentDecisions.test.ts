// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {describe, expect, it} from 'vitest';
import compileConsentDecisions from '../compileConsentDecisions';

describe('compileConsentDecisions', () => {
  it('compiles optional choices and removes SDK-only consent fields', () => {
    const result = compileConsentDecisions(
      {
        __consent_opt__profile__email: 'true',
        __consent_modified__profile__email__value: '{"x":1}',
        __consent_invalid__profile__email__value: 'true',
        username: 'ada',
      },
      [
        {
          essential: [{name: 'sub'}],
          optional: [{name: 'email'}],
          purposeId: 'profile',
          purposeName: 'Profile',
        },
      ],
      {approved: true},
    );

    expect(result).toEqual({
      consent_decisions: JSON.stringify({
        approved: true,
        purposes: [
          {
            approved: true,
            elements: [
              {approved: true, name: 'sub'},
              {approved: true, name: 'email'},
            ],
            purposeName: 'Profile',
          },
        ],
      }),
      username: 'ada',
    });
  });

  it('records denial and a reason while removing temporary fields', () => {
    const result = compileConsentDecisions(
      {__consent_opt__profile__email: 'true'},
      [{essential: [], optional: [{name: 'email'}], purposeId: 'profile'}],
      {approved: false, reason: 'user_denied'},
    );

    expect(JSON.parse(result['consent_decisions'] as string)).toEqual({
      approved: false,
      reason: 'user_denied',
      purposes: [{approved: false, elements: [{approved: false, name: 'email'}]}],
    });
    expect(result).not.toHaveProperty('__consent_opt__profile__email');
  });

  it('strips temporary fields even when no consent prompt is available', () => {
    expect(compileConsentDecisions({__consent_opt__p__email: 'true', keep: 'value'}, null, {approved: true})).toEqual({
      keep: 'value',
    });
  });
});
