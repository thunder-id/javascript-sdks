// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {getFlowMeta, ThunderIDAPIError} from '@thunderid/browser';
import {flushPromises, mount} from '@vue/test-utils';
import {afterEach, describe, expect, it, vi} from 'vitest';
import {defineComponent, h, inject} from 'vue';
import {FLOW_META_KEY, I18N_KEY, THUNDERID_KEY} from '../../keys';
import type {FlowMetaContextValue} from '../../models/contexts';
import FlowMetaProvider from '../../providers/FlowMetaProvider';

vi.mock('@thunderid/browser', async (importOriginal: () => Promise<Record<string, unknown>>) => ({
  ...(await importOriginal()),
  getFlowMeta: vi.fn(),
}));

const i18n = {
  currentLanguage: {value: 'en'},
  fallbackLanguage: 'en',
  injectBundles: vi.fn(),
  setLanguage: vi.fn(),
};

const mountProvider = (props: Record<string, unknown> = {}): {context: () => FlowMetaContextValue} => {
  let context: FlowMetaContextValue | undefined;

  const Probe = defineComponent({
    setup() {
      context = inject(FLOW_META_KEY);
      return (): ReturnType<typeof h> => h('span');
    },
  });

  mount(FlowMetaProvider, {
    global: {
      provide: {
        [I18N_KEY as symbol]: i18n,
        [THUNDERID_KEY as symbol]: {applicationId: 'app-1', baseUrl: 'https://idp.example.com'},
      },
    },
    props: {enabled: true, ...props},
    slots: {default: () => h(Probe)},
  });

  return {context: (): FlowMetaContextValue => context!};
};

describe('FlowMetaProvider', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('provides no metadata and no error when the server has no flow metadata endpoint', async () => {
    vi.mocked(getFlowMeta).mockRejectedValue(
      new ThunderIDAPIError('<html>Not Found</html>', 'getFlowMeta-ResponseError-001', 'javascript', 404),
    );

    const {context} = mountProvider();
    await flushPromises();

    expect(getFlowMeta).toHaveBeenCalled();
    expect(context().meta.value).toBeNull();
    expect(context().error.value).toBeNull();
    expect(context().isLoading.value).toBe(false);
  });

  it('still switches the language when the server has no flow metadata endpoint', async () => {
    vi.mocked(getFlowMeta).mockRejectedValue(
      new ThunderIDAPIError('Not JSON', 'getFlowMeta-InvalidResponseError-001', 'javascript', 200),
    );

    const {context} = mountProvider();
    await flushPromises();

    await context().switchLanguage('fr');
    await flushPromises();

    expect(i18n.setLanguage).toHaveBeenCalledWith('fr');
    expect(context().error.value).toBeNull();
  });

  it('accepts null from a custom fetchMeta', async () => {
    const fetchMeta = vi.fn().mockResolvedValue(null);

    const {context} = mountProvider({fetchMeta});
    await flushPromises();

    expect(fetchMeta).toHaveBeenCalledWith({applicationId: 'app-1'});
    expect(context().meta.value).toBeNull();
    expect(context().error.value).toBeNull();
  });

  it('reports any other failure through error', async () => {
    vi.mocked(getFlowMeta).mockRejectedValue(new TypeError('Failed to fetch'));

    const {context} = mountProvider();
    await flushPromises();

    expect(context().error.value).toBeInstanceOf(TypeError);
  });
});
