// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {describe, expect, it} from 'vitest';
import ThunderIDAPIError from '../../errors/ThunderIDAPIError';
import ThunderIDError from '../../errors/ThunderIDError';
import mapPagedSelectError from '../mapPagedSelectError';

describe('mapPagedSelectError', (): void => {
  it('should surface a ThunderIDError message', (): void => {
    const result = mapPagedSelectError(new ThunderIDError('Network down', 'test-code', 'test-origin'));

    expect(result.message).toBe('Network down');
  });

  it('should surface a ThunderIDAPIError message', (): void => {
    const result = mapPagedSelectError(new ThunderIDAPIError('Upstream exploded', 'test-code', 'test-origin', 500));

    expect(result.message).toBe('Upstream exploded');
  });

  it.each([[new Error('plain')], ['a string'], [undefined], [null]])(
    'should fall back to the generic key without trusting an unrecognized throw (%s)',
    (thrown: unknown): void => {
      const result = mapPagedSelectError(thrown);

      expect(result.message).toBeUndefined();
      expect(result.messageKey).toBe('elements.fields.paged_select.load_error');
    },
  );

  it.each([
    [new ThunderIDError('offline', 'test-code', 'test-origin')],
    [new ThunderIDAPIError('boom', 'test-code', 'test-origin', 500)],
    [new Error('plain')],
    [undefined],
  ])('should always supply a messageKey so callers need no non-null assertion (%s)', (thrown: unknown): void => {
    expect(typeof mapPagedSelectError(thrown).messageKey).toBe('string');
  });
});
