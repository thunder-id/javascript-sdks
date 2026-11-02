// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {
  executeEmbeddedDeviceGrantFlow,
  EmbeddedFlowType,
  EmbeddedSignInFlowType,
  ThunderIDAPIError,
  ThunderIDRuntimeError,
} from '@thunderid/browser';
import {flushPromises, mount} from '@vue/test-utils';
import {afterEach, describe, expect, it, vi} from 'vitest';
import {h, nextTick, ref} from 'vue';
import BaseDeviceGrant from '../../../components/auth/device-grant/BaseDeviceGrant';
import DeviceGrant from '../../../components/auth/device-grant/DeviceGrant';
import {FLOW_KEY, FLOW_META_KEY, I18N_KEY, THUNDERID_KEY} from '../../../keys';
import {initiateOAuthRedirect} from '../../../utils/oauth';

vi.mock('@thunderid/browser', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@thunderid/browser')>()),
  executeEmbeddedDeviceGrantFlow: vi.fn(),
}));

vi.mock('../../../utils/oauth', () => ({initiateOAuthRedirect: vi.fn()}));

const createThunderIDContext = () => ({
  applicationId: undefined,
  baseUrl: 'https://id.example.com',
  getStorageManager: () => ({
    getTemporaryData: () => Promise.resolve({challengeToken: 'challenge-restored'}),
    removeTemporaryDataParameter: vi.fn(),
    setTemporaryDataParameter: vi.fn(),
  }),
  isInitialized: ref(true),
  isLoading: ref(false),
  vendor: 'test-vendor',
});

afterEach(() => {
  vi.mocked(executeEmbeddedDeviceGrantFlow).mockReset();
  sessionStorage.removeItem('test-vendor_device_grant_execution_id');
  vi.mocked(initiateOAuthRedirect).mockReset();
  window.history.replaceState({}, '', '/');
});

describe('BaseDeviceGrant', () => {
  it('renders server-provided consent data on a Device Grant step', () => {
    const wrapper = mount(BaseDeviceGrant, {
      global: {
        provide: {
          [FLOW_KEY as symbol]: {
            addMessage: () => undefined,
            clearMessages: () => undefined,
            messages: ref([]),
            subtitle: ref(null),
            title: ref(null),
          },
          [FLOW_META_KEY as symbol]: {meta: ref(null)},
          [I18N_KEY as symbol]: {currentLanguage: ref('en-US'), t: (key: string): string => key},
        },
      },
      props: {
        additionalData: {
          consentPrompt: {
            purposes: [
              {
                essential: [],
                optional: [{name: 'booking:read'}],
                purposeId: 'permissions',
                type: 'permissions',
              },
            ],
          },
        },
        components: [{id: 'consent', type: 'CONSENT'}],
        onSubmit: () => Promise.resolve(),
      },
    });

    expect(wrapper.text()).toContain('Optional Permissions');
    expect(wrapper.text()).toContain('booking:read');
    expect(wrapper.findAll('[role="switch"]')).toHaveLength(2);
    expect(wrapper.get('.thunderid-card').classes()).toContain('thunderid-card--flat');
  });

  it('prefills the user code from the verification URI values', async () => {
    const wrapper = mount(BaseDeviceGrant, {
      global: {
        provide: {
          [FLOW_KEY as symbol]: {
            addMessage: () => undefined,
            clearMessages: () => undefined,
            messages: ref([]),
            subtitle: ref(null),
            title: ref(null),
          },
          [FLOW_META_KEY as symbol]: {meta: ref(null)},
          [I18N_KEY as symbol]: {currentLanguage: ref('en-US'), t: (key: string): string => key},
        },
      },
      props: {
        components: [
          {
            id: 'user-code',
            label: 'Verification code',
            placeholder: 'ABCD-EFGH',
            ref: 'user_code',
            required: true,
            type: 'TEXT_INPUT',
          },
        ],
        initialValues: {user_code: 'ABCD-EFGH'},
        onSubmit: () => Promise.resolve(),
      },
    });

    await nextTick();
    expect((wrapper.find('input[name="user_code"]').element as HTMLInputElement).value).toBe('ABCD-EFGH');
  });
});

describe('DeviceGrant', () => {
  it('submits timed-out consent as a denial with the timeout reason', async () => {
    window.history.replaceState({}, '', '/gate/device?applicationId=app-1');
    vi.mocked(executeEmbeddedDeviceGrantFlow)
      .mockReset()
      .mockResolvedValueOnce({
        executionId: 'execution-1',
        flowStatus: 'INCOMPLETE',
        challengeToken: 'challenge-1',
        data: {
          meta: {
            components: [
              {eventType: 'SUBMIT', id: 'allow', label: 'Allow', type: 'ACTION', variant: 'PRIMARY'},
              {eventType: 'SUBMIT', id: 'deny', label: 'Deny', type: 'ACTION', variant: 'SECONDARY'},
            ],
          },
          additionalData: {
            consentPrompt: JSON.stringify([{essential: [], optional: [], purposeId: 'profile'}]),
            stepTimeout: Date.now() + 50,
          },
        },
      } as never);
    const wrapper = mount(DeviceGrant, {
      global: {
        provide: {
          [FLOW_KEY as symbol]: {
            addMessage: vi.fn(),
            clearMessages: vi.fn(),
            messages: ref([]),
            subtitle: ref(null),
            title: ref(null),
          },
          [FLOW_META_KEY as symbol]: {meta: ref(null)},
          [I18N_KEY as symbol]: {currentLanguage: ref('en-US'), t: (key: string): string => key},
          [THUNDERID_KEY as symbol]: createThunderIDContext(),
        },
      },
    });

    await vi.waitFor(() => expect(executeEmbeddedDeviceGrantFlow).toHaveBeenCalledTimes(2));

    const payload = vi.mocked(executeEmbeddedDeviceGrantFlow).mock.calls[1][0]?.payload;
    expect(payload).toMatchObject({action: 'deny'});
    if (!payload || !('inputs' in payload)) throw new Error('Expected a flow continuation payload');
    const inputs = payload.inputs ?? {};
    expect(JSON.parse(inputs['consent_decisions'] as string)).toMatchObject({
      approved: false,
      reason: 'timeout',
    });
    expect(inputs).not.toHaveProperty('__consent_reason__');
    wrapper.unmount();
  });

  it('waits for SDK initialization before starting the configured flow', async () => {
    window.history.replaceState({}, '', '/gate/device?applicationId=app-1');
    vi.mocked(executeEmbeddedDeviceGrantFlow)
      .mockReset()
      .mockResolvedValue({
        executionId: 'execution-1',
        flowStatus: 'INCOMPLETE',
        data: {meta: {components: []}},
      } as never);
    const context = createThunderIDContext();
    context.isInitialized.value = false;

    const wrapper = mount(DeviceGrant, {
      global: {
        provide: {
          [FLOW_KEY as symbol]: {
            addMessage: vi.fn(),
            clearMessages: vi.fn(),
            messages: ref([]),
            subtitle: ref(null),
            title: ref(null),
          },
          [FLOW_META_KEY as symbol]: {meta: ref(null)},
          [I18N_KEY as symbol]: {currentLanguage: ref('en-US'), t: (key: string): string => key},
          [THUNDERID_KEY as symbol]: context,
        },
      },
    });

    await flushPromises();
    expect(executeEmbeddedDeviceGrantFlow).not.toHaveBeenCalled();

    context.isInitialized.value = true;
    await flushPromises();

    expect(executeEmbeddedDeviceGrantFlow).toHaveBeenCalledTimes(1);
    wrapper.unmount();
  });

  it('calls the complete event listener once when the configured flow completes', async () => {
    window.history.replaceState({}, '', '/gate/device?applicationId=app-1');
    const onComplete = vi.fn();
    vi.mocked(executeEmbeddedDeviceGrantFlow).mockResolvedValue({
      executionId: 'execution-1',
      flowStatus: 'COMPLETE',
      data: {meta: {components: []}},
    } as never);

    const wrapper = mount(DeviceGrant, {
      global: {
        provide: {
          [FLOW_KEY as symbol]: {
            addMessage: vi.fn(),
            clearMessages: vi.fn(),
            messages: ref([]),
            subtitle: ref(null),
            title: ref(null),
          },
          [FLOW_META_KEY as symbol]: {meta: ref(null)},
          [I18N_KEY as symbol]: {currentLanguage: ref('en-US'), t: (key: string): string => key},
          [THUNDERID_KEY as symbol]: createThunderIDContext(),
        },
      },
      attrs: {onComplete},
    });

    await flushPromises();

    expect(onComplete).toHaveBeenCalledTimes(1);
    expect(wrapper.emitted('complete')).toHaveLength(1);
    wrapper.unmount();
  });

  it('calls the error event listener once when the verification URI lacks an application ID', async () => {
    window.history.replaceState({}, '', '/gate/device');
    const onError = vi.fn();
    const wrapper = mount(DeviceGrant, {
      global: {
        provide: {
          [FLOW_KEY as symbol]: {
            addMessage: vi.fn(),
            clearMessages: vi.fn(),
            messages: ref([]),
            subtitle: ref(null),
            title: ref(null),
          },
          [FLOW_META_KEY as symbol]: {meta: ref(null)},
          [I18N_KEY as symbol]: {currentLanguage: ref('en-US'), t: (key: string): string => key},
          [THUNDERID_KEY as symbol]: createThunderIDContext(),
        },
      },
      attrs: {onError},
    });

    await flushPromises();

    expect(onError).toHaveBeenCalledTimes(1);
    expect(onError.mock.calls[0][0]).toBeInstanceOf(ThunderIDRuntimeError);
    expect((onError.mock.calls[0][0] as ThunderIDRuntimeError).code).toBe('DEVICE_GRANT_ERROR');
    expect(wrapper.emitted('error')).toHaveLength(1);
    wrapper.unmount();
  });

  it('compiles consent decisions and strips internal fields for custom slot submissions', async () => {
    window.history.replaceState({}, '', '/gate/device?applicationId=app-1');
    vi.mocked(executeEmbeddedDeviceGrantFlow)
      .mockResolvedValueOnce({
        challengeToken: 'challenge-consent',
        data: {
          additionalData: {
            consentPrompt: [{essential: [], optional: [{name: 'email'}], purposeId: 'profile', purposeName: 'Profile'}],
          },
          meta: {components: [{eventType: 'SUBMIT', id: 'approve', type: 'ACTION', variant: 'PRIMARY'}]},
        },
        executionId: 'execution-consent',
        flowStatus: 'INCOMPLETE',
      } as never)
      .mockResolvedValueOnce({
        data: {meta: {components: []}},
        executionId: 'execution-consent',
        flowStatus: 'INCOMPLETE',
      } as never);
    const action = {eventType: 'SUBMIT', id: 'approve', type: 'ACTION', variant: 'PRIMARY'};
    const consentInputs = {
      __consent_opt__profile__email: 'true',
      __consent_modified__profile__email__value: '{"name":"private"}',
      __consent_invalid__profile__email__value: 'true',
    };
    const wrapper = mount(DeviceGrant, {
      global: {
        provide: {
          [FLOW_KEY as symbol]: {
            addMessage: vi.fn(),
            clearMessages: vi.fn(),
            messages: ref([]),
            subtitle: ref(null),
            title: ref(null),
          },
          [FLOW_META_KEY as symbol]: {meta: ref(null)},
          [I18N_KEY as symbol]: {currentLanguage: ref('en-US'), t: (key: string): string => key},
          [THUNDERID_KEY as symbol]: createThunderIDContext(),
        },
      },
      slots: {
        default: (slotProps: {
          handleSubmit: (
            component: typeof action,
            data: typeof consentInputs,
            skipValidation?: boolean,
          ) => Promise<void>;
        }) => h('button', {onClick: () => void slotProps.handleSubmit(action, consentInputs, true)}, 'Approve'),
      },
    });

    await flushPromises();
    await wrapper.get('button').trigger('click');
    await flushPromises();

    const payload = vi.mocked(executeEmbeddedDeviceGrantFlow).mock.calls[1][0]?.payload;
    expect(payload).toMatchObject({action: 'approve'});
    if (!payload || !('inputs' in payload)) throw new Error('Expected a flow continuation payload');
    // eslint-disable-next-line @typescript-eslint/dot-notation -- `inputs` is an index-signature payload.
    expect(JSON.parse(payload.inputs?.['consent_decisions'] as string)).toEqual({
      approved: true,
      purposes: [{approved: true, elements: [{approved: true, name: 'email'}], purposeName: 'Profile'}],
    });
    expect(payload.inputs).not.toHaveProperty('__consent_opt__profile__email');
    expect(payload.inputs).not.toHaveProperty('__consent_modified__profile__email__value');
    expect(payload.inputs).not.toHaveProperty('__consent_invalid__profile__email__value');
    wrapper.unmount();
  });

  it('persists the execution before redirecting to a federated provider', async () => {
    window.history.replaceState({}, '', '/gate/device?applicationId=app-1');
    vi.mocked(executeEmbeddedDeviceGrantFlow).mockResolvedValue({
      challengeToken: 'challenge-redirect',
      data: {redirectURL: 'https://identity-provider.example/authorize'},
      executionId: 'execution-redirect',
      type: EmbeddedSignInFlowType.Redirection,
    } as never);
    vi.mocked(initiateOAuthRedirect).mockImplementation(() => {
      expect(sessionStorage.getItem('test-vendor_device_grant_execution_id')).toBe('execution-redirect');
    });

    const wrapper = mount(DeviceGrant, {
      global: {
        provide: {
          [FLOW_KEY as symbol]: {
            addMessage: vi.fn(),
            clearMessages: vi.fn(),
            messages: ref([]),
            subtitle: ref(null),
            title: ref(null),
          },
          [FLOW_META_KEY as symbol]: {meta: ref(null)},
          [I18N_KEY as symbol]: {currentLanguage: ref('en-US'), t: (key: string): string => key},
          [THUNDERID_KEY as symbol]: createThunderIDContext(),
        },
      },
    });

    await flushPromises();
    expect(initiateOAuthRedirect).toHaveBeenCalledWith('https://identity-provider.example/authorize', 'test-vendor');
    wrapper.unmount();
  });

  it('resumes a stored execution after reload rather than starting a new flow', async () => {
    window.history.replaceState({}, '', '/gate/device');
    sessionStorage.setItem('test-vendor_device_grant_execution_id', 'execution-resume');
    vi.mocked(executeEmbeddedDeviceGrantFlow).mockResolvedValue({
      executionId: 'execution-resume',
      flowStatus: 'INCOMPLETE',
      data: {meta: {components: []}},
    } as never);

    const wrapper = mount(DeviceGrant, {
      global: {
        provide: {
          [FLOW_KEY as symbol]: {
            addMessage: vi.fn(),
            clearMessages: vi.fn(),
            messages: ref([]),
            subtitle: ref(null),
            title: ref(null),
          },
          [FLOW_META_KEY as symbol]: {meta: ref(null)},
          [I18N_KEY as symbol]: {currentLanguage: ref('en-US'), t: (key: string): string => key},
          [THUNDERID_KEY as symbol]: createThunderIDContext(),
        },
      },
    });

    await flushPromises();
    expect(executeEmbeddedDeviceGrantFlow).toHaveBeenCalledTimes(1);
    expect(executeEmbeddedDeviceGrantFlow).toHaveBeenCalledWith({
      baseUrl: 'https://id.example.com',
      payload: {challengeToken: 'challenge-restored', executionId: 'execution-resume'},
    });
    wrapper.unmount();
  });

  it('clears a stale stored execution without starting a replacement flow', async () => {
    window.history.replaceState({}, '', '/gate/device');
    sessionStorage.setItem('test-vendor_device_grant_execution_id', 'execution-stale');
    vi.mocked(executeEmbeddedDeviceGrantFlow).mockRejectedValue(
      new ThunderIDAPIError('expired execution', 'stale', 'javascript', 400, 'Bad Request'),
    );

    const wrapper = mount(DeviceGrant, {
      global: {
        provide: {
          [FLOW_KEY as symbol]: {
            addMessage: vi.fn(),
            clearMessages: vi.fn(),
            messages: ref([]),
            subtitle: ref(null),
            title: ref(null),
          },
          [FLOW_META_KEY as symbol]: {meta: ref(null)},
          [I18N_KEY as symbol]: {currentLanguage: ref('en-US'), t: (key: string): string => key},
          [THUNDERID_KEY as symbol]: createThunderIDContext(),
        },
      },
    });

    await flushPromises();
    expect(sessionStorage.getItem('test-vendor_device_grant_execution_id')).toBeNull();
    expect(executeEmbeddedDeviceGrantFlow).toHaveBeenCalledTimes(1);
    expect(wrapper.emitted('error')).toHaveLength(1);
    wrapper.unmount();
  });

  it('continues the stored execution with OAuth callback code and nonce', async () => {
    window.history.replaceState({}, '', '/gate/device?code=provider-code&nonce=provider-nonce&state=oauth-state');
    sessionStorage.setItem('test-vendor_device_grant_execution_id', 'execution-callback');
    vi.mocked(executeEmbeddedDeviceGrantFlow).mockResolvedValue({
      executionId: 'execution-callback',
      flowStatus: 'INCOMPLETE',
      challengeToken: 'challenge-next',
      data: {meta: {components: []}},
    } as never);

    const wrapper = mount(DeviceGrant, {
      global: {
        provide: {
          [FLOW_KEY as symbol]: {
            addMessage: vi.fn(),
            clearMessages: vi.fn(),
            messages: ref([]),
            subtitle: ref(null),
            title: ref(null),
          },
          [FLOW_META_KEY as symbol]: {meta: ref(null)},
          [I18N_KEY as symbol]: {currentLanguage: ref('en-US'), t: (key: string): string => key},
          [THUNDERID_KEY as symbol]: createThunderIDContext(),
        },
      },
    });

    await flushPromises();
    expect(executeEmbeddedDeviceGrantFlow).toHaveBeenCalledTimes(1);
    expect(executeEmbeddedDeviceGrantFlow).toHaveBeenCalledWith({
      baseUrl: 'https://id.example.com',
      payload: {
        challengeToken: 'challenge-restored',
        executionId: 'execution-callback',
        inputs: {code: 'provider-code', nonce: 'provider-nonce'},
      },
    });
    wrapper.unmount();
  });

  it('prefills the configured flow code prompt without submitting the code at flow start', async () => {
    window.history.replaceState({}, '', '/gate/device?applicationId=app-1&user_code=BCDF-GHJK');
    vi.mocked(executeEmbeddedDeviceGrantFlow).mockResolvedValue({
      challengeToken: 'challenge-1',
      data: {
        meta: {
          components: [
            {id: 'user-code', label: 'Verification code', ref: 'user_code', required: true, type: 'TEXT_INPUT'},
            {eventType: 'SUBMIT', id: 'continue', label: 'Continue', type: 'ACTION'},
          ],
        },
      },
      executionId: 'execution-1',
      flowStatus: 'INCOMPLETE',
    } as never);

    const wrapper = mount(DeviceGrant, {
      global: {
        provide: {
          [FLOW_KEY as symbol]: {
            addMessage: vi.fn(),
            clearMessages: vi.fn(),
            messages: ref([]),
            subtitle: ref(null),
            title: ref(null),
          },
          [FLOW_META_KEY as symbol]: {meta: ref(null)},
          [I18N_KEY as symbol]: {currentLanguage: ref('en-US'), t: (key: string): string => key},
          [THUNDERID_KEY as symbol]: createThunderIDContext(),
        },
      },
    });

    await flushPromises();

    expect(executeEmbeddedDeviceGrantFlow).toHaveBeenCalledWith({
      baseUrl: 'https://id.example.com',
      payload: {
        applicationId: 'app-1',
        flowType: EmbeddedFlowType.DeviceGrant,
        inputs: {},
      },
    });
    expect((wrapper.find('input[name="user_code"]').element as HTMLInputElement).value).toBe('BCDF-GHJK');
    expect(window.location.search).toBe('');
    await wrapper.get('button').trigger('click');
    await flushPromises();
    expect(executeEmbeddedDeviceGrantFlow).toHaveBeenLastCalledWith({
      baseUrl: 'https://id.example.com',
      payload: {
        action: 'continue',
        challengeToken: 'challenge-1',
        executionId: 'execution-1',
        inputs: {user_code: 'BCDF-GHJK'},
      },
    });
    wrapper.unmount();
  });

  it('renders the configured code prompt when the verification URI has no code', async () => {
    window.history.replaceState({}, '', '/gate/device?applicationId=app-1');
    vi.mocked(executeEmbeddedDeviceGrantFlow).mockResolvedValue({
      challengeToken: 'challenge-1',
      data: {
        meta: {
          components: [
            {
              id: 'user-code',
              label: 'Verification code',
              ref: 'user_code',
              required: true,
              type: 'TEXT_INPUT',
            },
          ],
        },
      },
      executionId: 'execution-1',
      flowStatus: 'INCOMPLETE',
    } as never);

    const wrapper = mount(DeviceGrant, {
      global: {
        provide: {
          [FLOW_KEY as symbol]: {
            addMessage: vi.fn(),
            clearMessages: vi.fn(),
            messages: ref([]),
            subtitle: ref(null),
            title: ref(null),
          },
          [FLOW_META_KEY as symbol]: {meta: ref(null)},
          [I18N_KEY as symbol]: {currentLanguage: ref('en-US'), t: (key: string): string => key},
          [THUNDERID_KEY as symbol]: createThunderIDContext(),
        },
      },
    });

    await flushPromises();

    expect(executeEmbeddedDeviceGrantFlow).toHaveBeenCalledWith({
      baseUrl: 'https://id.example.com',
      payload: {
        applicationId: 'app-1',
        flowType: EmbeddedFlowType.DeviceGrant,
        inputs: {},
      },
    });
    expect(wrapper.find('input[name="user_code"]').exists()).toBe(true);
    wrapper.unmount();
  });

  it('does not start when the verification URL has no application ID', async () => {
    window.history.replaceState({}, '', '/gate/device?user_code=BCDF-GHJK');
    const wrapper = mount(DeviceGrant, {
      global: {
        provide: {
          [FLOW_KEY as symbol]: {
            addMessage: vi.fn(),
            clearMessages: vi.fn(),
            messages: ref([]),
            subtitle: ref(null),
            title: ref(null),
          },
          [FLOW_META_KEY as symbol]: {meta: ref(null)},
          [I18N_KEY as symbol]: {currentLanguage: ref('en-US'), t: (key: string): string => key},
          [THUNDERID_KEY as symbol]: createThunderIDContext(),
        },
      },
    });

    await flushPromises();

    expect(executeEmbeddedDeviceGrantFlow).not.toHaveBeenCalled();
    expect(wrapper.text()).toContain('deviceGrant.errors.start');
    wrapper.unmount();
  });

  it('does not retain the user code when a later step no longer contains that input', async () => {
    window.history.replaceState({}, '', '/gate/device?applicationId=app-1&user_code=BCDF-GHJK');
    vi.mocked(executeEmbeddedDeviceGrantFlow)
      .mockResolvedValueOnce({
        challengeToken: 'challenge-1',
        data: {
          meta: {
            components: [{eventType: 'SUBMIT', id: 'continue', label: 'Continue', type: 'ACTION'}],
          },
        },
        executionId: 'execution-1',
        flowStatus: 'INCOMPLETE',
      } as never)
      .mockResolvedValueOnce({
        challengeToken: 'challenge-2',
        data: {meta: {components: []}},
        executionId: 'execution-1',
        flowStatus: 'INCOMPLETE',
      } as never);

    const wrapper = mount(DeviceGrant, {
      global: {
        provide: {
          [FLOW_KEY as symbol]: {
            addMessage: vi.fn(),
            clearMessages: vi.fn(),
            messages: ref([]),
            subtitle: ref(null),
            title: ref(null),
          },
          [FLOW_META_KEY as symbol]: {meta: ref(null)},
          [I18N_KEY as symbol]: {currentLanguage: ref('en-US'), t: (key: string): string => key},
          [THUNDERID_KEY as symbol]: createThunderIDContext(),
        },
      },
    });

    await flushPromises();
    await wrapper.get('button').trigger('click');
    await flushPromises();

    expect(executeEmbeddedDeviceGrantFlow).toHaveBeenNthCalledWith(1, {
      baseUrl: 'https://id.example.com',
      payload: {
        applicationId: 'app-1',
        flowType: EmbeddedFlowType.DeviceGrant,
        inputs: {},
      },
    });
    expect(executeEmbeddedDeviceGrantFlow).toHaveBeenLastCalledWith({
      baseUrl: 'https://id.example.com',
      payload: {
        action: 'continue',
        challengeToken: 'challenge-1',
        executionId: 'execution-1',
        inputs: {},
      },
    });
    wrapper.unmount();
  });
});
