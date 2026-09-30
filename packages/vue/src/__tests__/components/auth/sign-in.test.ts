// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {EmbeddedFlowComponent, ThunderIDRuntimeError} from '@thunderid/browser';
import {flushPromises, mount} from '@vue/test-utils';
import {describe, expect, it, vi, type Mock} from 'vitest';
import {defineComponent, h, nextTick, ref, type Ref, type VNode} from 'vue';
import {renderSignInComponents, renderVerificationComponents} from '../../../components/auth/flow/AuthOptionFactory';
import BaseSignIn from '../../../components/auth/sign-in/BaseSignIn';
import SignIn, {type SignInRenderProps} from '../../../components/auth/sign-in/SignIn';
import {FLOW_KEY, FLOW_META_KEY, I18N_KEY, THUNDERID_KEY} from '../../../keys';

describe('BaseSignIn', () => {
  it('clears only the edited field server error so corrected fields can be submitted', async () => {
    const wrapper = mount(BaseSignIn, {
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
        },
      },
      props: {
        components: [
          {id: 'username', ref: 'username', required: true, type: 'TEXT_INPUT'},
          {id: 'email', ref: 'email', required: true, type: 'EMAIL_INPUT'},
        ],
        serverFieldErrors: [
          {identifier: 'username', message: 'Username rejected'},
          {identifier: 'email', message: 'Email rejected'},
        ],
      },
      slots: {
        default: (props: {
          fieldErrors: Record<string, string>;
          handleInputChange: (name: string, value: string) => void;
          isValid: boolean;
        }) =>
          h('div', [
            h('input', {
              onInput: (event: Event) => props.handleInputChange('username', (event.target as HTMLInputElement).value),
            }),
            h('input', {
              onInput: (event: Event) => props.handleInputChange('email', (event.target as HTMLInputElement).value),
            }),
            h('p', {id: 'username-error'}, props.fieldErrors['username'] ?? ''),
            h('p', {id: 'email-error'}, props.fieldErrors['email'] ?? ''),
            h('button', {disabled: !props.isValid}, 'Continue'),
          ]),
      },
    });

    expect(wrapper.get('#username-error').text()).toBe('Username rejected');
    expect(wrapper.get('#email-error').text()).toBe('Email rejected');
    expect(wrapper.get('button').attributes('disabled')).toBeDefined();

    await wrapper.findAll('input')[0].setValue('corrected');
    expect(wrapper.get('#username-error').text()).toBe('');
    expect(wrapper.get('#email-error').text()).toBe('Email rejected');
    expect(wrapper.get('button').attributes('disabled')).toBeDefined();

    await wrapper.findAll('input')[1].setValue('ada@example.com');
    expect(wrapper.get('#email-error').text()).toBe('');
    expect(wrapper.get('button').attributes('disabled')).toBeUndefined();
  });

  it('applies semantic colors from server-provided flow text', () => {
    const wrapper = mount(BaseSignIn, {
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
        },
      },
      props: {
        components: [
          {color: 'SUCCESS', id: 'success-title', label: 'Device authorized', type: 'TEXT', variant: 'HEADING_1'},
        ],
      },
    });

    expect(wrapper.get('#success-title').element.getAttribute('style')).toContain(
      'color: var(--thunderid-color-success-main)',
    );
  });

  it('exposes the step additionalData to the default slot', () => {
    const slot: Mock = vi.fn(() => []);
    mount(BaseSignIn, {
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
        },
      },
      props: {additionalData: {linkingPromptDetails: '[]'}, components: []},
      slots: {default: slot},
    });

    expect(slot).toHaveBeenLastCalledWith(expect.objectContaining({additionalData: {linkingPromptDetails: '[]'}}));
  });
});

describe('SignIn', () => {
  it('reports a missing applicationId through the error event and slot without an unhandled rejection', async () => {
    const unhandled: Mock = vi.fn((event: PromiseRejectionEvent) => event.preventDefault());
    window.addEventListener('unhandledrejection', unhandled);

    const isInitialized = ref(false);
    const signIn: Mock = vi.fn();
    const slot: Mock = vi.fn(() => []);

    const wrapper = mount(SignIn, {
      global: {
        provide: {
          [THUNDERID_KEY as symbol]: {
            applicationId: undefined,
            getStorageManager: () => null,
            isInitialized,
            isLoading: ref(false),
            signIn,
            vendor: 'thunderid',
          },
          [FLOW_META_KEY as symbol]: {meta: ref(null)},
          [I18N_KEY as symbol]: {currentLanguage: ref('en-US'), t: (key: string): string => key},
        },
      },
      slots: {default: slot},
    });

    isInitialized.value = true;
    await flushPromises();
    await new Promise((resolve: (value: unknown) => void) => {
      setTimeout(resolve, 0);
    });

    window.removeEventListener('unhandledrejection', unhandled);

    expect(signIn).not.toHaveBeenCalled();
    expect(wrapper.emitted('error')?.[0]?.[0]).toBeInstanceOf(ThunderIDRuntimeError);
    expect(slot).toHaveBeenLastCalledWith(expect.objectContaining({error: expect.any(ThunderIDRuntimeError)}));
    expect(unhandled).not.toHaveBeenCalled();
  });

  it('translates a server error again when the language changes', async () => {
    const translations: Record<string, Record<string, string>> = {
      'en-US': {invalid_individual_id: 'Invalid individual ID'},
      'fr-FR': {invalid_individual_id: 'Identifiant individuel invalide'},
    };
    const language: Ref<string> = ref('en-US');
    const isInitialized = ref(false);
    const signIn: Mock = vi.fn().mockResolvedValue({
      error: {code: 'invalid_individual_id', message: {defaultValue: 'Invalid', key: 'invalid_individual_id'}},
      flowStatus: 'ERROR',
    });
    const slot: Mock<(props: SignInRenderProps) => never[]> = vi.fn(() => []);

    const wrapper = mount(SignIn, {
      global: {
        provide: {
          [THUNDERID_KEY as symbol]: {
            applicationId: 'app-1',
            getStorageManager: () => null,
            isInitialized,
            isLoading: ref(false),
            signIn,
            vendor: 'thunderid',
          },
          [FLOW_META_KEY as symbol]: {meta: ref(null)},
          [I18N_KEY as symbol]: {
            currentLanguage: language,
            t: (key: string): string => translations[language.value][key] ?? key,
          },
        },
      },
      slots: {default: slot},
    });

    isInitialized.value = true;
    await flushPromises();

    expect(slot.mock.lastCall?.[0].error?.message).toBe('Invalid individual ID');

    language.value = 'fr-FR';
    await nextTick();

    expect(slot.mock.lastCall?.[0].error?.message).toBe('Identifiant individuel invalide');
    expect(wrapper.emitted('error')).toHaveLength(1);
  });
});

describe('AuthOptionFactory RESEND', () => {
  const resend: EmbeddedFlowComponent = {
    eventType: 'SUBMIT',
    id: 'action_resend',
    label: 'Resend code',
    type: 'RESEND',
  } as EmbeddedFlowComponent;

  const codeBlock = (withResend: boolean): EmbeddedFlowComponent =>
    ({
      components: [
        {id: 'input_otp', label: 'Code', ref: 'otp', required: true, type: 'OTP_INPUT'},
        {eventType: 'SUBMIT', id: 'action_verify', label: 'Verify', type: 'ACTION', variant: 'PRIMARY'},
        ...(withResend ? [resend] : []),
      ],
      id: 'block_otp',
      type: 'BLOCK',
    }) as EmbeddedFlowComponent;

  const renderHtml = (render: typeof renderSignInComponents, withResend: boolean): string => {
    const nodes: VNode[] = render(
      [codeBlock(withResend)],
      {},
      {},
      {},
      false,
      false,
      () => undefined,
      () => undefined,
      {onSubmit: vi.fn()},
    );
    return mount(defineComponent({render: (): VNode => h('div', nodes)})).html();
  };

  it('is skipped by sign-in, which renders the step as if it had no resend', () => {
    const html: string = renderHtml(renderSignInComponents, true);

    expect(html).not.toContain('Resend code');
    expect(html).toBe(renderHtml(renderSignInComponents, false));
  });

  it('is rendered for attribute verification', () => {
    expect(renderHtml(renderVerificationComponents, true)).toContain('Resend code');
  });
});
