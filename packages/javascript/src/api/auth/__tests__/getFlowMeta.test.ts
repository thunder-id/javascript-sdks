// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {afterEach, describe, expect, it, vi} from 'vitest';
import ThunderIDAPIError from '../../../errors/ThunderIDAPIError';
import isFlowMetaUnavailableError from '../../../utils/isFlowMetaUnavailableError';
import getFlowMeta from '../getFlowMeta';

const originalFetch: typeof fetch = global.fetch;

describe('getFlowMeta', () => {
  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('returns the parsed metadata', async () => {
    const meta = {design: {}, i18n: {language: 'en', translations: {}}};
    global.fetch = vi.fn().mockResolvedValue(new Response(JSON.stringify(meta), {status: 200}));

    await expect(getFlowMeta({baseUrl: 'https://localhost:8090', language: 'en'})).resolves.toEqual(meta);
    expect(global.fetch).toHaveBeenCalledWith(
      'https://localhost:8090/flow/meta?language=en',
      expect.objectContaining({method: 'GET'}),
    );
  });

  it('rejects with an API error carrying the status when the server answers with an error', async () => {
    global.fetch = vi.fn().mockResolvedValue(new Response('<html>Not Found</html>', {status: 404}));

    const thrown: unknown = await getFlowMeta({baseUrl: 'https://idp.example.com'}).catch((error: unknown) => error);

    expect(thrown).toBeInstanceOf(ThunderIDAPIError);
    expect((thrown as ThunderIDAPIError).code).toBe('getFlowMeta-ResponseError-001');
    expect((thrown as ThunderIDAPIError).statusCode).toBe(404);
    expect(isFlowMetaUnavailableError(thrown)).toBe(true);
  });

  it('rejects with an invalid response error when an OK response is not JSON', async () => {
    global.fetch = vi.fn().mockResolvedValue(new Response('<!doctype html><html></html>', {status: 200}));

    const thrown: unknown = await getFlowMeta({baseUrl: 'https://idp.example.com'}).catch((error: unknown) => error);

    expect(thrown).toBeInstanceOf(ThunderIDAPIError);
    expect((thrown as ThunderIDAPIError).code).toBe('getFlowMeta-InvalidResponseError-001');
    expect(isFlowMetaUnavailableError(thrown)).toBe(true);
  });

  it('lets a network failure through unchanged', async () => {
    const networkError = new TypeError('fetch failed');
    global.fetch = vi.fn().mockRejectedValue(networkError);

    await expect(getFlowMeta({baseUrl: 'https://localhost:8090'})).rejects.toBe(networkError);
  });
});
