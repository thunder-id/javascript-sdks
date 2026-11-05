// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {describe, expect, it} from 'vitest';
import {User} from '../../models/user';
import getVerifiedAttributes from '../getVerifiedAttributes';

describe('getVerifiedAttributes', (): void => {
  it('returns the verified attributes of the profile', (): void => {
    const verifiedAttributes = {email: {verifiedAt: '2026-10-16T08:30:00Z'}};

    expect(getVerifiedAttributes({email: 'alex@example.com', verifiedAttributes} as User)).toEqual(verifiedAttributes);
  });

  it('returns an empty object when the profile has none', (): void => {
    expect(getVerifiedAttributes({verifiedAttributes: {}} as User)).toEqual({});
  });

  it('returns undefined when the profile does not carry the field', (): void => {
    expect(getVerifiedAttributes({email: 'alex@example.com'} as User)).toBeUndefined();
  });

  it('returns undefined when there is no profile', (): void => {
    expect(getVerifiedAttributes(undefined)).toBeUndefined();
    expect(getVerifiedAttributes(null)).toBeUndefined();
  });

  it('treats a field that is not an object as unknown', (): void => {
    expect(getVerifiedAttributes({verifiedAttributes: 'email'} as unknown as User)).toBeUndefined();
    expect(getVerifiedAttributes({verifiedAttributes: true} as unknown as User)).toBeUndefined();
    expect(getVerifiedAttributes({verifiedAttributes: null} as unknown as User)).toBeUndefined();
  });

  it('treats a field that is an array as unknown', (): void => {
    expect(getVerifiedAttributes({verifiedAttributes: ['email']} as unknown as User)).toBeUndefined();
  });
});
