// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {flushPromises, mount} from '@vue/test-utils';
import {describe, expect, it, vi, type Mock} from 'vitest';
import {ref} from 'vue';
import BaseSignIn from '../../../components/auth/sign-in/BaseSignIn';
import SignIn from '../../../components/auth/sign-in/SignIn';
import {FLOW_KEY, FLOW_META_KEY, I18N_KEY, THUNDERID_KEY} from '../../../keys';

const flowProvide = {
  [FLOW_KEY as symbol]: {
    addMessage: vi.fn(),
    clearMessages: vi.fn(),
    messages: ref([]),
    subtitle: ref(null),
    title: ref(null),
  },
  [FLOW_META_KEY as symbol]: {meta: ref(null)},
  [I18N_KEY as symbol]: {currentLanguage: ref('en-US'), t: (key: string): string => key},
};

const submitAction = {eventType: 'SUBMIT', id: 'continue', label: 'Continue', type: 'ACTION', variant: 'PRIMARY'};

describe('Resolve OU step', () => {
  it('renders the before-sign-in OU_SELECT input from the server and submits ouId', async () => {
    const onSubmit: Mock = vi.fn().mockResolvedValue(undefined);
    const wrapper = mount(BaseSignIn, {
      global: {provide: flowProvide},
      props: {
        components: [
          {id: 'ou_selection_input', label: 'Organization', ref: 'ouId', required: true, type: 'OU_SELECT'},
          submitAction,
        ],
        onSubmit,
      },
    });

    const input = wrapper.get('input[name="ouId"]');
    await input.setValue('acme-ou-1');
    await wrapper.get('button').trigger('click');
    await flushPromises();

    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({action: 'continue', inputs: {ouId: 'acme-ou-1'}}),
      expect.anything(),
    );
  });

  it('renders the after-sign-in SELECT of eligible units and submits the chosen one as ouId', async () => {
    const onSubmit: Mock = vi.fn().mockResolvedValue(undefined);
    const wrapper = mount(BaseSignIn, {
      global: {provide: flowProvide},
      props: {
        components: [
          {
            id: 'ou_selection_input',
            label: 'Organization',
            options: ['acme/acme-ou-1', 'acme/acme-ou-2'],
            ref: 'ouId',
            required: true,
            type: 'SELECT',
          },
          submitAction,
        ],
        onSubmit,
      },
    });

    const select = wrapper.get('select');
    expect(select.findAll('option').map((option) => option.text())).toEqual(
      expect.arrayContaining(['acme/acme-ou-1', 'acme/acme-ou-2']),
    );
    await select.setValue('acme/acme-ou-2');
    await wrapper.get('button').trigger('click');
    await flushPromises();

    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({inputs: {ouId: 'acme/acme-ou-2'}}),
      expect.anything(),
    );
  });
});

describe('SignIn organizationUnitId', () => {
  it('sends ouId on the request that starts the flow and never on a continuation', async () => {
    const signIn: Mock = vi
      .fn()
      .mockResolvedValueOnce({
        data: {meta: {components: [{id: 'username', ref: 'username', type: 'TEXT_INPUT'}]}},
        executionId: 'exec-1',
        flowStatus: 'INCOMPLETE',
        type: 'VIEW',
      })
      .mockResolvedValue({executionId: 'exec-1', flowStatus: 'INCOMPLETE', type: 'VIEW'});
    let onSubmit: ((payload: Record<string, unknown>) => Promise<void>) | undefined;
    const isInitialized = ref(false);

    mount(SignIn, {
      global: {
        provide: {
          ...flowProvide,
          [THUNDERID_KEY as symbol]: {
            applicationId: 'app-1',
            getStorageManager: () => null,
            isInitialized,
            isLoading: ref(false),
            signIn,
            vendor: 'thunderid',
          },
        },
      },
      props: {organizationUnitId: 'ou-123'},
      slots: {
        default: (props: {onSubmit: (payload: Record<string, unknown>) => Promise<void>}) => {
          onSubmit = props.onSubmit;
          return [];
        },
      },
    });

    isInitialized.value = true;
    await flushPromises();
    await new Promise((resolve: (value: unknown) => void) => {
      setTimeout(resolve, 0);
    });

    expect(signIn).toHaveBeenCalledTimes(1);
    expect(signIn.mock.calls[0][0]).toEqual(
      expect.objectContaining({applicationId: 'app-1', flowType: 'AUTHENTICATION', ouId: 'ou-123'}),
    );

    await onSubmit?.({executionId: 'exec-1', inputs: {username: 'ada'}});
    await flushPromises();

    expect(signIn).toHaveBeenCalledTimes(2);
    expect(signIn.mock.calls[1][0]).not.toHaveProperty('ouId');
  });
});
