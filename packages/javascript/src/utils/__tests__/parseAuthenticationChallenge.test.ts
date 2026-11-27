// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {describe, expect, it} from 'vitest';
import ThunderIDAPIError from '../../errors/ThunderIDAPIError';
import parseAuthenticationChallenge from '../parseAuthenticationChallenge';

describe('parseAuthenticationChallenge', (): void => {
  it('reads error, error_description and max_age from a Bearer challenge', (): void => {
    expect(
      parseAuthenticationChallenge(
        'Bearer error="insufficient_user_authentication", error_description="A more recent authentication is required", max_age="300"',
      ),
    ).toEqual({
      error: 'insufficient_user_authentication',
      errorDescription: 'A more recent authentication is required',
      maxAge: 300,
    });
  });

  it('reads unquoted values and a scheme in any case', (): void => {
    expect(parseAuthenticationChallenge('bearer error=insufficient_user_authentication, max_age=60')).toEqual({
      error: 'insufficient_user_authentication',
      maxAge: 60,
    });
  });

  it('reads the Bearer challenge when another scheme comes first', (): void => {
    expect(parseAuthenticationChallenge('DPoP algs="ES256", Bearer error="invalid_token"')).toEqual({
      error: 'invalid_token',
    });
  });

  it('leaves out a max_age that is not a number', (): void => {
    expect(parseAuthenticationChallenge('Bearer error="insufficient_user_authentication", max_age="soon"')).toEqual({
      error: 'insufficient_user_authentication',
    });
  });

  it('returns undefined for a challenge without an error', (): void => {
    expect(parseAuthenticationChallenge('Bearer realm="thunderid"')).toBeUndefined();
    expect(parseAuthenticationChallenge(null)).toBeUndefined();
  });

  it('falls back to the maxAge parameter of an AUTH-4011 body', (): void => {
    expect(
      parseAuthenticationChallenge(undefined, {code: 'AUTH-4011', description: {params: {maxAge: '300'}}}),
    ).toEqual({error: 'insufficient_user_authentication', maxAge: 300});
  });

  it('returns undefined for another body without a header', (): void => {
    expect(parseAuthenticationChallenge(undefined, {code: 'AUTH-4010'})).toBeUndefined();
  });

  it('is read into ThunderIDAPIError only for a 401', (): void => {
    const header = 'Bearer error="insufficient_user_authentication", max_age="30"';
    const body: string = JSON.stringify({code: 'AUTH-4011', message: {defaultValue: 'Recent authentication required'}});

    expect(new ThunderIDAPIError(body, 'X', 'javascript', 401, 'Unauthorized', undefined, header)).toMatchObject({
      authenticationChallenge: {error: 'insufficient_user_authentication', maxAge: 30},
      message: 'Recent authentication required',
    });
    expect(
      new ThunderIDAPIError(body, 'X', 'javascript', 403, 'Forbidden', undefined, header).authenticationChallenge,
    ).toBeUndefined();
  });
});
