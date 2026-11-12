// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {cleanup, render, waitFor} from '@testing-library/react';
import {getFlowMeta, ThunderIDAPIError} from '@thunderid/browser';
import {ReactElement, StrictMode, useContext, useEffect} from 'react';
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import I18nContext, {I18nContextValue} from '../../I18n/I18nContext';
import ThunderIDContext, {ThunderIDContextProps} from '../../ThunderID/ThunderIDContext';
import FlowMetaContext, {FlowMetaContextValue} from '../FlowMetaContext';
import FlowMetaProvider, {FlowMetaProviderProps} from '../FlowMetaProvider';

vi.mock('@thunderid/browser', async (importOriginal: () => Promise<Record<string, unknown>>) => ({
  ...(await importOriginal()),
  getFlowMeta: vi.fn(),
}));

const i18n = {currentLanguage: 'en-GB', injectBundles: vi.fn(), setLanguage: vi.fn()} as unknown as I18nContextValue;

let latest: FlowMetaContextValue | null = null;

const Probe = (): ReactElement => {
  const value: FlowMetaContextValue | null = useContext(FlowMetaContext);

  useEffect(() => {
    latest = value;
  });

  return <span />;
};

const renderProvider = (
  thunderID: Partial<ThunderIDContextProps>,
  language = 'en-GB',
  props: FlowMetaProviderProps = {},
): ReactElement => (
  <StrictMode>
    <ThunderIDContext.Provider value={{baseUrl: 'https://localhost:8090', ...thunderID} as ThunderIDContextProps}>
      <I18nContext.Provider value={{...i18n, currentLanguage: language}}>
        <FlowMetaProvider {...props}>
          <Probe />
        </FlowMetaProvider>
      </I18nContext.Provider>
    </ThunderIDContext.Provider>
  </StrictMode>
);

beforeEach(() => {
  vi.mocked(getFlowMeta).mockResolvedValue({} as Awaited<ReturnType<typeof getFlowMeta>>);
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  latest = null;
});

describe('FlowMetaProvider', () => {
  it('fetches once while ThunderID initializes around the same request', async () => {
    const {rerender} = render(renderProvider({applicationId: 'app-1', endpoints: undefined, isInitialized: false}));
    rerender(renderProvider({applicationId: 'app-1', endpoints: {}, isInitialized: false}));
    rerender(renderProvider({applicationId: 'app-1', endpoints: {}, isInitialized: true}));

    await waitFor(() => expect(getFlowMeta).toHaveBeenCalled());
    expect(getFlowMeta).toHaveBeenCalledTimes(1);
    expect(getFlowMeta).toHaveBeenCalledWith(expect.objectContaining({id: 'app-1', language: 'en-GB'}));
  });

  it('waits for ThunderID to initialize when there is no application', async () => {
    const {rerender} = render(renderProvider({isInitialized: false}));
    expect(getFlowMeta).not.toHaveBeenCalled();

    rerender(renderProvider({isInitialized: true}));

    await waitFor(() => expect(getFlowMeta).toHaveBeenCalledTimes(1));
  });

  it('fetches again when the language changes', async () => {
    const {rerender} = render(renderProvider({applicationId: 'app-1', isInitialized: true}));
    await waitFor(() => expect(getFlowMeta).toHaveBeenCalledTimes(1));

    rerender(renderProvider({applicationId: 'app-1', isInitialized: true}, 'fr-FR'));

    await waitFor(() => expect(getFlowMeta).toHaveBeenCalledTimes(2));
    expect(getFlowMeta).toHaveBeenLastCalledWith(expect.objectContaining({language: 'fr-FR'}));
  });

  it('provides no metadata and no error when the server has no flow metadata endpoint', async () => {
    vi.mocked(getFlowMeta).mockRejectedValue(
      new ThunderIDAPIError('<html>Not Found</html>', 'getFlowMeta-ResponseError-001', 'javascript', 404),
    );

    render(renderProvider({applicationId: 'app-1', baseUrl: 'https://idp.example.com', isInitialized: true}));

    await waitFor(() => expect(latest?.isLoading).toBe(false));
    expect(getFlowMeta).toHaveBeenCalled();
    expect(latest?.meta).toBeNull();
    expect(latest?.error).toBeNull();
  });

  it('still switches the language when the server has no flow metadata endpoint', async () => {
    vi.mocked(getFlowMeta).mockRejectedValue(
      new ThunderIDAPIError('Not JSON', 'getFlowMeta-InvalidResponseError-001', 'javascript', 200),
    );

    render(renderProvider({applicationId: 'app-1', isInitialized: true}));
    await waitFor(() => expect(latest?.isLoading).toBe(false));

    await latest?.switchLanguage('fr-FR');

    await waitFor(() => expect(i18n.setLanguage).toHaveBeenCalledWith('fr-FR'));
    expect(latest?.error).toBeNull();
  });

  it('accepts null from a custom fetchMeta', async () => {
    const fetchMeta = vi.fn().mockResolvedValue(null);

    render(renderProvider({applicationId: 'app-1', isInitialized: true}, 'en-GB', {fetchMeta}));

    await waitFor(() => expect(fetchMeta).toHaveBeenCalled());
    await waitFor(() => expect(latest?.isLoading).toBe(false));
    expect(latest?.meta).toBeNull();
    expect(latest?.error).toBeNull();
  });

  it('reports any other failure through error', async () => {
    vi.mocked(getFlowMeta).mockRejectedValue(new TypeError('Failed to fetch'));

    render(renderProvider({applicationId: 'app-1', isInitialized: true}));

    await waitFor(() => expect(latest?.error).toBeInstanceOf(TypeError));
    expect(latest?.meta).toBeNull();
  });
});
