// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {describe, expect, it} from 'vitest';
import ThunderIDAPIError from '../../errors/ThunderIDAPIError';
import isFlowMetaUnavailableError from '../isFlowMetaUnavailableError';

const responseError = (statusCode: number, body = 'Not Found'): ThunderIDAPIError =>
  new ThunderIDAPIError(body, 'getFlowMeta-ResponseError-001', 'javascript', statusCode);

describe('isFlowMetaUnavailableError', () => {
  it.each([401, 403, 404, 405, 501])('matches a %s reply without a ThunderID flow metadata error', (status: number) => {
    expect(isFlowMetaUnavailableError(responseError(status, '<html>Error</html>'))).toBe(true);
  });

  it('matches a reply from another provider that carries its own error envelope', () => {
    expect(isFlowMetaUnavailableError(responseError(404, JSON.stringify({code: 'AUT-10001'})))).toBe(true);
  });

  it('matches an OK reply whose body is not JSON', () => {
    expect(
      isFlowMetaUnavailableError(
        new ThunderIDAPIError('Not JSON', 'getFlowMeta-InvalidResponseError-001', 'javascript', 200),
      ),
    ).toBe(true);
  });

  it('does not match a ThunderID flow metadata error, such as an unknown application', () => {
    expect(
      isFlowMetaUnavailableError(
        responseError(404, JSON.stringify({code: 'FM-1004', message: {defaultValue: 'Application not found'}})),
      ),
    ).toBe(false);
  });

  it.each([400, 429, 500, 502, 503])('does not match a %s reply', (status: number) => {
    expect(isFlowMetaUnavailableError(responseError(status))).toBe(false);
  });

  it('does not match an API error from another request', () => {
    expect(
      isFlowMetaUnavailableError(
        new ThunderIDAPIError('Not Found', 'getUserInfo-ResponseError-001', 'javascript', 404),
      ),
    ).toBe(false);
  });

  it.each([new TypeError('fetch failed'), 'Not Found', null, undefined])(
    'does not match a non-API error (%s)',
    (error: unknown) => {
      expect(isFlowMetaUnavailableError(error)).toBe(false);
    },
  );
});
