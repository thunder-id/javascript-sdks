// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {EmbeddedFlowComponent, ThunderIDRuntimeError} from '@thunderid/browser';
import {flushPromises, mount} from '@vue/test-utils';
import {describe, expect, it, vi, type Mock} from 'vitest';
import {defineComponent, h, ref, type VNode} from 'vue';
import {renderSignInComponents, renderVerificationComponents} from '../../../components/auth/flow/AuthOptionFactory';
import BaseSignIn from '../../../components/auth/sign-in/BaseSignIn';
import SignIn from '../../../components/auth/sign-in/SignIn';
import {FLOW_KEY, FLOW_META_KEY, I18N_KEY, THUNDERID_KEY} from '../../../keys';

describe('BaseSignIn', () => {
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
