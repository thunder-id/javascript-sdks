// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {describe, expect, it} from 'vitest';
import ThunderIDAPIError from '../../errors/ThunderIDAPIError';
import isFlowExpiredError from '../isFlowExpiredError';

const apiError = (code: string): ThunderIDAPIError =>
  new ThunderIDAPIError(
    JSON.stringify({code, message: {defaultValue: 'Invalid request', key: 'error.invalid_request'}}),
    'executeEmbeddedSignInFlow-ResponseError-100',
    'javascript',
    400,
  );

describe('isFlowExpiredError', () => {
  it('matches an API error the server refused with FES-1004', () => {
    expect(isFlowExpiredError(apiError('FES-1004'))).toBe(true);
  });

  it('does not match an API error with another server code', () => {
    expect(isFlowExpiredError(apiError('FES-1001'))).toBe(false);
  });

  it('does not match an API error without a server error body', () => {
    expect(
      isFlowExpiredError(
        new ThunderIDAPIError('Bad Request', 'executeEmbeddedSignInFlow-ResponseError-100', 'javascript', 400),
      ),
    ).toBe(false);
  });

  it.each([new Error('FES-1004'), 'FES-1004', null, undefined])(
    'does not match a non-API error (%s)',
    (error: unknown) => {
      expect(isFlowExpiredError(error)).toBe(false);
    },
  );
});
