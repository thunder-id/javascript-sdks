// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {EmbeddedFlowType, EmbeddedSelfServiceFlowRequest} from '@thunderid/browser';
import {beforeEach, describe, expect, it, vi} from 'vitest';
import executeEmbeddedSelfServiceFlow from '../executeEmbeddedSelfServiceFlow';

const mocks = vi.hoisted(() => ({
  authenticatedFetcher: vi.fn(),
  baseExecute: vi.fn(),
  createHttpClientFetcher: vi.fn(),
}));

vi.mock('@thunderid/browser', async (importOriginal: () => Promise<Record<string, unknown>>) => ({
  ...(await importOriginal()),
  createHttpClientFetcher: mocks.createHttpClientFetcher,
  executeEmbeddedSelfServiceFlow: mocks.baseExecute,
}));

const payload: EmbeddedSelfServiceFlowRequest = {
  flowType: EmbeddedFlowType.SelfService,
  inputs: {attribute: 'email'},
};

describe('executeEmbeddedSelfServiceFlow', () => {
  beforeEach(() => {
    mocks.createHttpClientFetcher.mockReset().mockReturnValue(mocks.authenticatedFetcher);
    mocks.baseExecute.mockReset().mockResolvedValue({executionId: 'exec-1', flowStatus: 'INCOMPLETE'});
  });

  it("sends through the SPA client's authenticated fetcher by default", async () => {
    await executeEmbeddedSelfServiceFlow({baseUrl: 'https://localhost:8090', payload});

    expect(mocks.createHttpClientFetcher).toHaveBeenCalledWith(0);
    expect(mocks.baseExecute).toHaveBeenCalledWith({
      baseUrl: 'https://localhost:8090',
      fetcher: mocks.authenticatedFetcher,
      payload,
    });
  });

  it('uses the fetcher of the given instance', async () => {
    await executeEmbeddedSelfServiceFlow({
      instanceId: 2,
      payload,
      url: 'https://localhost:8090/flow/execute',
    });

    expect(mocks.createHttpClientFetcher).toHaveBeenCalledWith(2);
    expect(mocks.baseExecute).toHaveBeenCalledWith(
      expect.objectContaining({fetcher: mocks.authenticatedFetcher, url: 'https://localhost:8090/flow/execute'}),
    );
    expect(mocks.baseExecute.mock.calls[0][0]).not.toHaveProperty('instanceId');
  });

  it('prefers a fetcher the caller supplies', async () => {
    const fetcher = vi.fn();

    await executeEmbeddedSelfServiceFlow({baseUrl: 'https://localhost:8090', fetcher, payload});

    expect(mocks.createHttpClientFetcher).not.toHaveBeenCalled();
    expect(mocks.baseExecute).toHaveBeenCalledWith(expect.objectContaining({fetcher}));
  });

  it('returns the step the core function returns', async () => {
    await expect(executeEmbeddedSelfServiceFlow({baseUrl: 'https://localhost:8090', payload})).resolves.toEqual({
      executionId: 'exec-1',
      flowStatus: 'INCOMPLETE',
    });
  });
});
