// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {ThunderIDAPIError, ThunderIDRuntimeError} from '@thunderid/node';
import {beforeEach, describe, expect, it, vi} from 'vitest';
import getFlowMetaAction from '../../server/actions/auth/getFlowMetaAction';
import fetchFlowMetaFromServer from '../fetchFlowMetaFromServer';

vi.mock('../../server/actions/auth/getFlowMetaAction', () => ({default: vi.fn()}));

describe('fetchFlowMetaFromServer', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('returns the metadata the server action produced and forwards the request', async () => {
    const meta = {design: {}, i18n: {}} as never;
    vi.mocked(getFlowMetaAction).mockResolvedValue({meta, success: true});

    await expect(fetchFlowMetaFromServer({applicationId: 'app-1', language: 'fr'})).resolves.toBe(meta);
    expect(getFlowMetaAction).toHaveBeenCalledWith({applicationId: 'app-1', language: 'fr'});
  });

  it('resolves to null when the server has no flow metadata endpoint', async () => {
    vi.mocked(getFlowMetaAction).mockResolvedValue({meta: null, success: true});

    await expect(fetchFlowMetaFromServer({})).resolves.toBeNull();
  });

  it('throws a runtime error when the action reports a failure without a status', async () => {
    vi.mocked(getFlowMetaAction).mockResolvedValue({
      message: 'Failed to load flow metadata: no base URL is configured.',
      success: false,
    });

    const thrown = await fetchFlowMetaFromServer({}).catch((error: unknown) => error);

    expect(thrown).toBeInstanceOf(ThunderIDRuntimeError);
    expect((thrown as Error).message).toBe('Failed to load flow metadata: no base URL is configured.');
  });

  it('throws an API error carrying the status when the action reports one', async () => {
    vi.mocked(getFlowMetaAction).mockResolvedValue({
      message: 'Failed to load flow metadata (HTTP 404).',
      statusCode: 404,
      success: false,
    });

    const thrown = await fetchFlowMetaFromServer({}).catch((error: unknown) => error);

    expect(thrown).toBeInstanceOf(ThunderIDAPIError);
    expect((thrown as ThunderIDAPIError).statusCode).toBe(404);
  });
});
