// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {getFlowMeta, ThunderIDAPIError} from '@thunderid/node';
import {beforeEach, describe, expect, it, type Mock, vi} from 'vitest';
import logger from '../../../../utils/logger';
import getClient from '../../../getClient';
import getFlowMetaAction from '../getFlowMetaAction';

vi.mock('../../../getClient', () => ({default: vi.fn()}));
vi.mock('../../../../utils/logger', () => ({default: {error: vi.fn(), warn: vi.fn()}}));
vi.mock('@thunderid/node', async (importOriginal: () => Promise<Record<string, unknown>>) => ({
  ...(await importOriginal()),
  getFlowMeta: vi.fn(),
}));

const mockGetConfiguration = vi.fn();
const mockLogger = logger as unknown as {error: Mock; warn: Mock};

const meta = {design: {}, i18n: {}} as unknown as Awaited<ReturnType<typeof getFlowMeta>>;

describe('getFlowMetaAction', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(getClient).mockReturnValue({
      getConfiguration: mockGetConfiguration,
    } as unknown as ReturnType<typeof getClient>);
  });

  it('returns an error result instead of throwing when no base URL is configured', async () => {
    mockGetConfiguration.mockResolvedValue({applicationId: 'app-1'});

    const result = await getFlowMetaAction();

    expect(result).toEqual({message: 'Failed to load flow metadata: no base URL is configured.', success: false});
    expect(getFlowMeta).not.toHaveBeenCalled();
  });

  it('fetches with an endpoints.flowMeta override even without a base URL', async () => {
    mockGetConfiguration.mockResolvedValue({endpoints: {flowMeta: 'https://rs.example.com/flow/meta'}});
    vi.mocked(getFlowMeta).mockResolvedValue(meta);

    await expect(getFlowMetaAction()).resolves.toEqual({meta, success: true});
    expect(getFlowMeta).toHaveBeenCalledWith(expect.objectContaining({url: 'https://rs.example.com/flow/meta'}));
  });

  it('returns the metadata for the configured application and requested language', async () => {
    mockGetConfiguration.mockResolvedValue({applicationId: 'app-1', baseUrl: 'https://localhost:8090'});
    vi.mocked(getFlowMeta).mockResolvedValue(meta);

    const result = await getFlowMetaAction({language: 'fr'});

    expect(result).toEqual({meta, success: true});
    expect(getFlowMeta).toHaveBeenCalledWith({
      baseUrl: 'https://localhost:8090',
      id: 'app-1',
      language: 'fr',
      type: 'APP',
      url: undefined,
    });
  });

  it('maps an API failure to a plain result with the status, without the upstream reply text', async () => {
    mockGetConfiguration.mockResolvedValue({baseUrl: 'https://localhost:8090'});
    vi.mocked(getFlowMeta).mockRejectedValue(
      new ThunderIDAPIError('upstream secret detail', 'getFlowMeta-ResponseError-001', 'javascript', 502),
    );

    await expect(getFlowMetaAction()).resolves.toEqual({
      message: 'Failed to load flow metadata (HTTP 502).',
      statusCode: 502,
      success: false,
    });
  });

  it('returns no metadata, warning once, when the server has no flow metadata endpoint', async () => {
    mockGetConfiguration.mockResolvedValue({baseUrl: 'https://idp.example.com/oauth2/token'});
    vi.mocked(getFlowMeta).mockRejectedValue(
      new ThunderIDAPIError('<html>Not Found</html>', 'getFlowMeta-ResponseError-001', 'javascript', 404),
    );

    await expect(getFlowMetaAction()).resolves.toEqual({meta: null, success: true});
    await expect(getFlowMetaAction({language: 'fr'})).resolves.toEqual({meta: null, success: true});

    expect(mockLogger.warn).toHaveBeenCalledTimes(1);
    expect(mockLogger.error).not.toHaveBeenCalled();
  });

  it('returns no metadata when the server answers with a body that is not JSON', async () => {
    mockGetConfiguration.mockResolvedValue({baseUrl: 'https://idp.example.com/oauth2/token'});
    vi.mocked(getFlowMeta).mockRejectedValue(
      new ThunderIDAPIError('Not JSON', 'getFlowMeta-InvalidResponseError-001', 'javascript', 200),
    );

    await expect(getFlowMetaAction()).resolves.toEqual({meta: null, success: true});
    expect(mockLogger.error).not.toHaveBeenCalled();
  });

  it('keeps a ThunderID flow metadata error, such as an unknown application, as a failure', async () => {
    mockGetConfiguration.mockResolvedValue({applicationId: 'missing', baseUrl: 'https://localhost:8090'});
    vi.mocked(getFlowMeta).mockRejectedValue(
      new ThunderIDAPIError(JSON.stringify({code: 'FM-1004'}), 'getFlowMeta-ResponseError-001', 'javascript', 404),
    );

    await expect(getFlowMetaAction()).resolves.toEqual({
      message: 'Failed to load flow metadata (HTTP 404).',
      statusCode: 404,
      success: false,
    });
    expect(mockLogger.error).toHaveBeenCalledTimes(1);
  });

  it('maps any other failure to a plain result', async () => {
    mockGetConfiguration.mockResolvedValue({baseUrl: 'https://localhost:8090'});
    vi.mocked(getFlowMeta).mockRejectedValue(new TypeError('fetch failed'));

    await expect(getFlowMetaAction()).resolves.toEqual({message: 'Failed to load flow metadata.', success: false});
  });
});
