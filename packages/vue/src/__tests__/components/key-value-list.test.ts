// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {EmbeddedFlowComponent, EmbeddedFlowComponentType} from '@thunderid/browser';
import {mount, VueWrapper} from '@vue/test-utils';
import {describe, expect, it, vi} from 'vitest';
import {defineComponent, h, ref, type VNode} from 'vue';
import {renderSignInComponents} from '../../components/auth/sign-in/AuthOptionFactory';
import BaseSignUp from '../../components/auth/sign-up/BaseSignUp';
import {FLOW_META_KEY, I18N_KEY} from '../../keys';

const keyValueList = (label?: string): EmbeddedFlowComponent =>
  ({
    category: 'DISPLAY',
    id: 'kv_1',
    label,
    source: 'linkingPromptDetails',
    type: EmbeddedFlowComponentType.KeyValueList,
  }) as EmbeddedFlowComponent;

const mountList = (
  component: EmbeddedFlowComponent,
  additionalData?: Record<string, unknown>,
  t?: (key: string) => string,
): VueWrapper => {
  const elements: VNode[] = renderSignInComponents(
    [component],
    {},
    {},
    {},
    false,
    true,
    () => undefined,
    () => undefined,
    {additionalData, t},
  );
  return mount(defineComponent({render: (): VNode => h('div', elements)}));
};

describe('AuthOptionFactory key-value list', () => {
  it('renders each pair published under the source key, in order', () => {
    const wrapper: VueWrapper = mountList(keyValueList(), {
      linkingPromptDetails: JSON.stringify([
        {label: 'Email', value: 'alice@example.com'},
        {label: 'Username', value: 'alice'},
      ]),
    });

    expect(wrapper.findAll('dt').map((node) => node.text())).toEqual(['Email', 'Username']);
    expect(wrapper.findAll('dd').map((node) => node.text())).toEqual(['alice@example.com', 'alice']);
  });

  it('resolves template labels on the list and its pairs', () => {
    const wrapper: VueWrapper = mountList(
      keyValueList('{{ t(signin:forms.link_prompt.details) }}'),
      {linkingPromptDetails: JSON.stringify([{label: '{{ t(signin:attributes.email) }}', value: 'alice@example.com'}])},
      (key: string) => `translated:${key}`,
    );

    expect(wrapper.text()).toContain('translated:signin.forms.link_prompt.details');
    expect(wrapper.find('dt').text()).toBe('translated:signin.attributes.email');
  });

  it('names the list by its label', () => {
    const wrapper: VueWrapper = mountList(keyValueList('Matched account'), {
      linkingPromptDetails: JSON.stringify([{label: 'Email', value: 'alice@example.com'}]),
    });

    const labelId: string | undefined = wrapper.find('dl').attributes('aria-labelledby');
    expect(labelId).toBeTruthy();
    expect(wrapper.find(`[id="${labelId}"]`).text()).toBe('Matched account');
  });

  it('renders nothing when the source holds no pairs', () => {
    expect(mountList(keyValueList(), {linkingPromptDetails: '[]'}).find('dl').exists()).toBe(false);
    expect(mountList(keyValueList(), {linkingPromptDetails: 'not json'}).find('dl').exists()).toBe(false);
    expect(mountList(keyValueList(), {}).find('dl').exists()).toBe(false);
    expect(mountList(keyValueList()).find('dl').exists()).toBe(false);
  });
});

describe('BaseSignUp key-value list', () => {
  it('renders the pairs published in the step additionalData', async () => {
    const wrapper = mount(BaseSignUp, {
      global: {
        provide: {
          [FLOW_META_KEY as symbol]: {meta: ref(null)},
          [I18N_KEY as symbol]: {currentLanguage: ref('en-US'), t: (key: string): string => key},
        },
      },
      props: {
        isInitialized: true,
        onInitialize: (): Promise<unknown> =>
          Promise.resolve({
            data: {
              additionalData: {
                linkingPromptDetails: JSON.stringify([{label: 'Email', value: 'alice@example.com'}]),
              },
              meta: {components: [keyValueList()]},
            },
            executionId: 'exec-1',
            flowStatus: 'INCOMPLETE',
            type: 'VIEW',
          }),
      },
    });
    await vi.waitFor(() => {
      expect(wrapper.find('dt').text()).toBe('Email');
    });
    expect(wrapper.find('dd').text()).toBe('alice@example.com');
  });
});
