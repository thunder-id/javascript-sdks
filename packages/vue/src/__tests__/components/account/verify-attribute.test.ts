// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {
  EmbeddedFlowComponent,
  EmbeddedSelfServiceFlowResponse,
  EmbeddedSelfServiceFlowStatus,
  getDefaultI18nBundles,
  substituteTranslationParams,
} from '@thunderid/browser';
import {DOMWrapper, VueWrapper, flushPromises, mount} from '@vue/test-utils';
import {Mock, afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import {type Ref, type VNode, h, ref} from 'vue';
import BaseVerifyAttribute, {
  type BaseVerifyAttributeRenderProps,
} from '../../../components/account/verify-attribute/BaseVerifyAttribute';
import VerifyAttribute from '../../../components/account/verify-attribute/VerifyAttribute';
import {FLOW_META_KEY, I18N_KEY, THUNDERID_KEY, USER_KEY} from '../../../keys';
import type {I18nContextValue, ThunderIDContext, UserContextValue} from '../../../models/contexts';

const mockExecute = vi.fn() as Mock;

vi.mock('../../../api/auth/executeEmbeddedSelfServiceFlow', () => ({
  default: (...args: unknown[]): unknown => mockExecute(...args) as unknown,
}));

// The shipped email flow's code prompt, with its text already resolved.
const codePrompt: EmbeddedFlowComponent[] = [
  {id: 'email_code_heading', label: 'Verify your email address', type: 'TEXT', variant: 'HEADING_1'},
  {
    id: 'email_code_message',
    label: 'Enter the verification code sent to your email address.',
    type: 'TEXT',
    variant: 'HEADING_6',
  },
  {
    components: [
      {id: 'input_email_otp', label: 'Verification code', ref: 'otp', required: true, type: 'OTP_INPUT'},
      {eventType: 'SUBMIT', id: 'action_email_verify', label: 'Verify', type: 'ACTION', variant: 'PRIMARY'},
      {eventType: 'SUBMIT', id: 'action_email_resend', label: 'Resend code', type: 'RESEND'},
    ],
    id: 'block_email_otp',
    type: 'BLOCK',
  },
] as unknown as EmbeddedFlowComponent[];

const codeSent = (destination = 'a•••@example.com', challengeToken = 'ct-1'): EmbeddedSelfServiceFlowResponse =>
  ({
    challengeToken,
    data: {additionalData: {maskedDestination: destination}, components: codePrompt},
    executionId: 'exec-1',
    flowStatus: EmbeddedSelfServiceFlowStatus.Incomplete,
  }) as unknown as EmbeddedSelfServiceFlowResponse;

const linkSent: EmbeddedSelfServiceFlowResponse = {
  data: {additionalData: {maskedDestination: 'a•••@example.com'}, components: []},
  executionId: 'exec-1',
  flowStatus: EmbeddedSelfServiceFlowStatus.Incomplete,
} as unknown as EmbeddedSelfServiceFlowResponse;

const codeRejected: EmbeddedSelfServiceFlowResponse = {
  challengeToken: 'ct-2',
  data: {components: codePrompt},
  error: {message: {defaultValue: 'The code is incorrect.', key: 'otp.invalid'}},
  executionId: 'exec-1',
  flowStatus: EmbeddedSelfServiceFlowStatus.Incomplete,
} as unknown as EmbeddedSelfServiceFlowResponse;

const verified: EmbeddedSelfServiceFlowResponse = {
  executionId: 'exec-1',
  flowStatus: EmbeddedSelfServiceFlowStatus.Complete,
};

const refused: EmbeddedSelfServiceFlowResponse = {
  error: {message: {defaultValue: 'Verification is not allowed.', key: 'verification.refused'}},
  executionId: 'exec-1',
  flowStatus: EmbeddedSelfServiceFlowStatus.Error,
} as unknown as EmbeddedSelfServiceFlowResponse;

/**
 * Resolves keys through the real en-US bundle, so the tests assert on what a user sees.
 */
const createI18nContext = (): I18nContextValue =>
  ({
    bundles: ref({}),
    currentLanguage: ref('en-US'),
    fallbackLanguage: 'en-US',
    injectBundles: vi.fn(),
    setLanguage: vi.fn(),
    t: (key: string, params?: Record<string, string | number>): string => {
      const translations = getDefaultI18nBundles()['en-US']?.translations as unknown as Record<string, string>;
      const value: string = translations?.[key] ?? key;

      return params ? substituteTranslationParams(value, params) : value;
    },
  }) as unknown as I18nContextValue;

const baseProviders = (): Record<symbol, unknown> => ({
  [FLOW_META_KEY as symbol]: {meta: ref(null)},
  [I18N_KEY as symbol]: createI18nContext(),
});

const settle = async (): Promise<void> => {
  await flushPromises();
  await new Promise((resolve: (value: unknown) => void) => {
    setTimeout(resolve, 0);
  });
  await flushPromises();
};

const button = (wrapper: VueWrapper, text: string): DOMWrapper<HTMLButtonElement> | undefined =>
  wrapper.findAll<HTMLButtonElement>('button').find((b: DOMWrapper<HTMLButtonElement>) => b.text() === text);

const enterCode = async (wrapper: VueWrapper, code: string): Promise<void> => {
  const digits: DOMWrapper<HTMLInputElement>[] = wrapper.findAll<HTMLInputElement>('input');
  for (let i = 0; i < code.length; i += 1) {
    await digits[i].setValue(code[i]);
  }
};

// A custom slot drawn with plain elements; `seen` keeps the last slot props for assertions.
const customSlot =
  (seen: {props?: BaseVerifyAttributeRenderProps}) =>
  (slotProps: BaseVerifyAttributeRenderProps): VNode => {
    seen.props = slotProps;
    const verify: EmbeddedFlowComponent | undefined = slotProps.components[0]?.components?.find(
      (component: EmbeddedFlowComponent) => component.type === 'ACTION',
    );
    return h('form', {'aria-busy': String(slotProps.isLoading)}, [
      h('h2', slotProps.title),
      h('p', slotProps.subtitle),
      slotProps.destinationText ? h('p', slotProps.destinationText) : null,
      slotProps.error ? h('p', {role: 'alert'}, slotProps.error) : null,
      slotProps.isComplete ? h('p', slotProps.successMessage) : null,
      h('input', {
        'aria-label': 'Code',
        onInput: (event: Event) => slotProps.handleInputChange('otp', (event.target as HTMLInputElement).value),
        value: slotProps.values['otp'] ?? '',
      }),
      verify
        ? h('button', {onClick: () => void slotProps.handleSubmit(verify, slotProps.values), type: 'button'}, 'Check')
        : null,
      slotProps.handleResend
        ? h('button', {onClick: () => void slotProps.handleResend?.(), type: 'button'}, 'Send again')
        : null,
      slotProps.onCancel ? h('button', {onClick: slotProps.onCancel, type: 'button'}, 'Dismiss') : null,
      slotProps.onDone ? h('button', {onClick: slotProps.onDone, type: 'button'}, 'Opened it') : null,
    ]);
  };

describe('BaseVerifyAttribute', () => {
  let onInitialize: Mock;
  let onSubmit: Mock;

  const mountBase = (props: Record<string, unknown> = {}, slots: Record<string, unknown> = {}): VueWrapper =>
    mount(BaseVerifyAttribute, {
      global: {provide: baseProviders()},
      props: {attributeDisplayName: 'Email', onInitialize, onSubmit, ...props},
      slots: slots as never,
    }) as VueWrapper;

  beforeEach(() => {
    onInitialize = vi.fn().mockResolvedValue(codeSent());
    onSubmit = vi.fn();
  });

  it('shows a spinner and no prompt while the code is being sent', () => {
    onInitialize.mockReturnValue(new Promise(() => undefined));

    const wrapper: VueWrapper = mountBase();

    expect(wrapper.find('[aria-busy="true"]').exists()).toBe(true);
    expect(wrapper.find('input').exists()).toBe(false);
  });

  it('starts the verification once per mount, and only once the SDK is initialized', async () => {
    const wrapper: VueWrapper = mountBase({isInitialized: false});
    await settle();
    expect(onInitialize).not.toHaveBeenCalled();

    await wrapper.setProps({isInitialized: true});
    await settle();
    await wrapper.setProps({isInitialized: false});
    await wrapper.setProps({isInitialized: true});
    await settle();

    expect(onInitialize).toHaveBeenCalledTimes(1);
  });

  it('does not retry a start that failed', async () => {
    onInitialize.mockRejectedValue(new Error('network down'));
    const wrapper: VueWrapper = mountBase({isInitialized: false});

    await wrapper.setProps({isInitialized: true});
    await settle();
    await wrapper.setProps({isInitialized: false});
    await wrapper.setProps({isInitialized: true});
    await settle();

    expect(onInitialize).toHaveBeenCalledTimes(1);
    expect(wrapper.text()).toContain('Verification failed. Please try again.');
  });

  it("prompts for the code with the flow's text and names where it was sent", async () => {
    const wrapper: VueWrapper = mountBase();
    await settle();

    expect(wrapper.text()).toContain('Verify your email address');
    expect(wrapper.text()).toContain('Enter the verification code sent to your email address.');
    expect(wrapper.text()).toContain('Sent to a•••@example.com.');
    expect(button(wrapper, 'Resend code')?.attributes('id')).toBe('action_email_resend');
  });

  it('names the destination in its own words when the flow gives no prompt text', async () => {
    onInitialize.mockResolvedValue({
      ...codeSent(),
      data: {
        ...codeSent().data,
        components: codePrompt.filter((c: EmbeddedFlowComponent) => c.variant !== 'HEADING_6'),
      },
    });
    const wrapper: VueWrapper = mountBase();
    await settle();

    expect(wrapper.text()).toContain('Enter the code sent to a•••@example.com.');
    expect(wrapper.text()).not.toContain('Sent to a•••@example.com.');
  });

  it('submits the code to the same execution with its challenge token', async () => {
    onSubmit.mockResolvedValue(verified);
    const wrapper: VueWrapper = mountBase();
    await settle();

    await enterCode(wrapper, '123456');
    await button(wrapper, 'Verify')!.trigger('click');
    await settle();

    expect(onSubmit).toHaveBeenCalledWith({
      action: 'action_email_verify',
      challengeToken: 'ct-1',
      executionId: 'exec-1',
      inputs: {otp: '123456'},
    });
  });

  it('does not submit without a code', async () => {
    const wrapper: VueWrapper = mountBase();
    await settle();

    await button(wrapper, 'Verify')!.trigger('click');
    await settle();

    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('enables Verify again once a code is entered after an empty submit', async () => {
    onSubmit.mockResolvedValue(verified);
    const wrapper: VueWrapper = mountBase();
    await settle();

    await button(wrapper, 'Verify')!.trigger('click');
    await settle();
    expect(button(wrapper, 'Verify')!.element.disabled).toBe(true);

    await enterCode(wrapper, '123456');
    expect(button(wrapper, 'Verify')!.element.disabled).toBe(false);
    await button(wrapper, 'Verify')!.trigger('click');
    await settle();

    expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({inputs: {otp: '123456'}}));
  });

  it('uses the translations in its preferences over the provider bundle', async () => {
    onSubmit.mockResolvedValue(verified);
    const wrapper: VueWrapper = mountBase({
      preferences: {i18n: {bundles: {'en-US': {translations: {'user.verification.success': '{attribute} confirmed'}}}}},
    });
    await settle();

    await enterCode(wrapper, '123456');
    await button(wrapper, 'Verify')!.trigger('click');
    await settle();

    expect(wrapper.text()).toContain('Email confirmed');
  });

  it('confirms a recorded verification and reports it', async () => {
    const onComplete: Mock = vi.fn();
    onSubmit.mockResolvedValue(verified);
    const wrapper: VueWrapper = mountBase({onCancel: vi.fn(), onComplete});
    await settle();

    await enterCode(wrapper, '123456');
    await button(wrapper, 'Verify')!.trigger('click');
    await settle();

    expect(wrapper.text()).toContain('Email verified.');
    expect(onComplete).toHaveBeenCalledWith(verified);
    expect(wrapper.find('input').exists()).toBe(false);
    expect(button(wrapper, 'Close')).toBeDefined();
  });

  it('keeps the prompt and the destination when a code is rejected, and sends the next attempt with its token', async () => {
    onSubmit.mockResolvedValueOnce(codeRejected).mockResolvedValueOnce(verified);
    const wrapper: VueWrapper = mountBase();
    await settle();

    await enterCode(wrapper, '000000');
    await button(wrapper, 'Verify')!.trigger('click');
    await settle();

    expect(wrapper.text()).toContain('The code is incorrect.');
    expect(wrapper.text()).toContain('Sent to a•••@example.com.');
    expect(wrapper.findAll('input')).toHaveLength(6);

    await enterCode(wrapper, '123456');
    await button(wrapper, 'Verify')!.trigger('click');
    await settle();

    expect(onSubmit.mock.calls[1][0]).toMatchObject({challengeToken: 'ct-2', inputs: {otp: '123456'}});
  });

  it('resends without the partly typed code or its validation and shows the new destination', async () => {
    onSubmit.mockResolvedValue(codeSent('b•••@example.com', 'ct-3'));
    const wrapper: VueWrapper = mountBase();
    await settle();

    await enterCode(wrapper, '12');
    await button(wrapper, 'Resend code')!.trigger('click');
    await settle();

    expect(onSubmit).toHaveBeenCalledWith({
      action: 'action_email_resend',
      challengeToken: 'ct-1',
      executionId: 'exec-1',
      inputs: {},
    });
    expect(wrapper.text()).toContain('Sent to b•••@example.com.');
  });

  it('shows a refusal, reports it and stops prompting', async () => {
    const onError: Mock = vi.fn();
    onSubmit.mockResolvedValue(refused);
    const wrapper: VueWrapper = mountBase({onCancel: vi.fn(), onError});
    await settle();

    await enterCode(wrapper, '123456');
    await button(wrapper, 'Verify')!.trigger('click');
    await settle();

    expect(wrapper.text()).toContain('Verification is not allowed.');
    expect(onError).toHaveBeenCalledWith(expect.objectContaining({message: 'Verification is not allowed.'}));
    expect(wrapper.find('input').exists()).toBe(false);
    expect(button(wrapper, 'Close')).toBeDefined();
  });

  it('shows a generic message, not the response body, when the request fails', async () => {
    const onError: Mock = vi.fn();
    const failure: Error = new Error('{"code":"FLW-1001","description":"internal detail"}');
    onInitialize.mockRejectedValue(failure);
    const wrapper: VueWrapper = mountBase({onError});
    await settle();

    expect(wrapper.text()).toContain('Verification failed. Please try again.');
    expect(wrapper.text()).not.toContain('internal detail');
    expect(onError).toHaveBeenCalledWith(failure);
  });

  it('tells the user where the link went and reports Done, without polling', async () => {
    const onDone: Mock = vi.fn();
    onInitialize.mockResolvedValue(linkSent);
    const wrapper: VueWrapper = mountBase({onDone});
    await settle();

    expect(wrapper.text()).toContain('We sent a verification link to a•••@example.com. Open it, then select Done.');
    await button(wrapper, 'Done')!.trigger('click');

    expect(onDone).toHaveBeenCalledTimes(1);
    expect(onSubmit).not.toHaveBeenCalled();
    expect(onInitialize).toHaveBeenCalledTimes(1);
  });

  it('offers Done only for a link flow, and Cancel only when the panel can be dismissed', async () => {
    const onCancel: Mock = vi.fn();
    const wrapper: VueWrapper = mountBase({onCancel, onDone: vi.fn()});
    await settle();

    expect(button(wrapper, 'Done')).toBeUndefined();
    await button(wrapper, 'Cancel')!.trigger('click');
    expect(onCancel).toHaveBeenCalledTimes(1);

    const plain: VueWrapper = mountBase();
    await settle();
    expect(button(plain, 'Cancel')).toBeUndefined();
  });

  it('tags the inputs and actions rendered from the flow, and its own actions, with flow identifiers', async () => {
    const wrapper: VueWrapper = mountBase({onCancel: vi.fn()});
    await settle();

    expect(button(wrapper, 'Verify')?.attributes('data-testid')).toBe('thunderid-action-action_email_verify');
    expect(button(wrapper, 'Resend code')?.attributes('data-testid')).toBe('thunderid-action-action_email_resend');
    expect(button(wrapper, 'Cancel')?.attributes('data-testid')).toBe('thunderid-action-verificationCancel');
    expect(wrapper.find('[data-testid="thunderid-field-otp"]').exists()).toBe(true);
    expect(wrapper.find('[data-testid^="thunderid-signin-"]').exists()).toBe(false);
  });

  it('tags Done for a link flow', async () => {
    onInitialize.mockResolvedValue(linkSent);
    const wrapper: VueWrapper = mountBase({onDone: vi.fn()});
    await settle();

    expect(button(wrapper, 'Done')?.attributes('data-testid')).toBe('thunderid-action-verificationDone');
  });

  it('lets a custom renderer resend without validating the code', async () => {
    onSubmit.mockResolvedValue(codeSent('a•••@example.com', 'ct-3'));
    const wrapper: VueWrapper = mountBase(
      {},
      {
        default: ({components, destination, handleSubmit}: BaseVerifyAttributeRenderProps) => {
          const resend: EmbeddedFlowComponent | undefined = components[0]?.components?.find(
            (component: EmbeddedFlowComponent) => component.type === 'RESEND',
          );
          return resend
            ? h('button', {onClick: () => handleSubmit(resend, {}, true), type: 'button'}, `Resend to ${destination}`)
            : null;
        },
      },
    );
    await settle();

    await button(wrapper, 'Resend to a•••@example.com')!.trigger('click');
    await settle();

    expect(onSubmit).toHaveBeenCalledWith({
      action: 'action_email_resend',
      challengeToken: 'ct-1',
      executionId: 'exec-1',
      inputs: {},
    });
  });
  describe('custom render', () => {
    it('replaces the built-in steps and hands over the step, headings and destination', async () => {
      const wrapper: VueWrapper = mountBase({}, {default: customSlot({})});
      await settle();

      expect(wrapper.find('h2').text()).toBe('Verify your email address');
      expect(wrapper.text()).toContain('Enter the verification code sent to your email address.');
      expect(wrapper.text()).toContain('Sent to a•••@example.com.');
      expect(button(wrapper, 'Verify')).toBeUndefined();
      expect(wrapper.findAll('input')).toHaveLength(1);
    });

    it('submits the values the custom UI set, then shows the success message', async () => {
      onSubmit.mockResolvedValue(verified);
      const onComplete: Mock = vi.fn();
      const wrapper: VueWrapper = mountBase({onComplete}, {default: customSlot({})});
      await settle();

      await wrapper.find('input').setValue('123456');
      await button(wrapper, 'Check')!.trigger('click');
      await settle();

      expect(onSubmit).toHaveBeenCalledWith({
        action: 'action_email_verify',
        challengeToken: 'ct-1',
        executionId: 'exec-1',
        inputs: {otp: '123456'},
      });
      expect(wrapper.text()).toContain('Email verified.');
      expect(onComplete).toHaveBeenCalledWith(verified);
    });

    it('keeps validation: an empty code is not sent', async () => {
      const wrapper: VueWrapper = mountBase({}, {default: customSlot({})});
      await settle();

      await button(wrapper, 'Check')!.trigger('click');
      await settle();

      expect(onSubmit).not.toHaveBeenCalled();
    });

    it('resends through handleResend without validating the code', async () => {
      onSubmit.mockResolvedValue(codeSent('a•••@example.com', 'ct-3'));
      const wrapper: VueWrapper = mountBase({}, {default: customSlot({})});
      await settle();

      await button(wrapper, 'Send again')!.trigger('click');
      await settle();

      expect(onSubmit).toHaveBeenCalledWith({
        action: 'action_email_resend',
        challengeToken: 'ct-1',
        executionId: 'exec-1',
        inputs: {},
      });
    });

    it('sends one resend when a custom UI calls handleResend twice at once', async () => {
      onSubmit.mockResolvedValue(codeSent('a•••@example.com', 'ct-3'));
      const seen: {props?: BaseVerifyAttributeRenderProps} = {};
      mountBase({}, {default: customSlot(seen)});
      await settle();

      await Promise.all([seen.props?.handleResend?.(), seen.props?.handleResend?.()]);

      expect(onSubmit).toHaveBeenCalledTimes(1);
    });

    it('hands over cancel, and Done only while a link is awaited', async () => {
      const seen: {props?: BaseVerifyAttributeRenderProps} = {};
      const onCancel: Mock = vi.fn();
      const wrapper: VueWrapper = mountBase({onCancel, onDone: vi.fn()}, {default: customSlot(seen)});
      await settle();

      await button(wrapper, 'Dismiss')!.trigger('click');

      expect(onCancel).toHaveBeenCalledTimes(1);
      expect(seen.props?.onDone).toBeUndefined();
      expect(seen.props?.isAwaitingLink).toBe(false);
    });

    it('hands over Done and no resend for a link step', async () => {
      onInitialize.mockResolvedValue(linkSent);
      const seen: {props?: BaseVerifyAttributeRenderProps} = {};
      const onDone: Mock = vi.fn();
      const wrapper: VueWrapper = mountBase({onDone}, {default: customSlot(seen)});
      await settle();

      await button(wrapper, 'Opened it')!.trigger('click');

      expect(onDone).toHaveBeenCalledTimes(1);
      expect(seen.props?.isAwaitingLink).toBe(true);
      expect(seen.props?.handleResend).toBeUndefined();
    });

    it('hands over a refusal as a translated error and the failed state', async () => {
      onSubmit.mockResolvedValue(refused);
      const seen: {props?: BaseVerifyAttributeRenderProps} = {};
      const wrapper: VueWrapper = mountBase({}, {default: customSlot(seen)});
      await settle();

      await wrapper.find('input').setValue('123456');
      await button(wrapper, 'Check')!.trigger('click');
      await settle();

      expect(wrapper.find('[role="alert"]').text()).toBe('Verification is not allowed.');
      expect(seen.props?.isFailed).toBe(true);
      expect(seen.props?.handleResend).toBeUndefined();
    });

    it('starts the verification once per mount', async () => {
      const wrapper: VueWrapper = mountBase({isInitialized: false}, {default: customSlot({})});
      await wrapper.setProps({isInitialized: true});
      await settle();
      await wrapper.setProps({isInitialized: false});
      await wrapper.setProps({isInitialized: true});
      await settle();

      expect(onInitialize).toHaveBeenCalledTimes(1);
    });
  });
});

describe('VerifyAttribute', () => {
  let isLoading: Ref<boolean>;
  let revalidateProfile: Mock;

  const userSchema = {
    given_name: {displayName: 'First name', type: 'string'},
    workEmail: {type: 'email'},
  };

  const mountVerify = (
    props: Record<string, unknown>,
    schema: Record<string, unknown> | null = userSchema,
    thunderID: Record<string, unknown> = {},
    slots: Record<string, unknown> = {},
    schemaRef: Ref<Record<string, unknown> | null> = ref(schema),
  ): VueWrapper =>
    mount(VerifyAttribute, {
      global: {
        provide: {
          ...baseProviders(),
          [THUNDERID_KEY as symbol]: {
            baseUrl: 'https://localhost:8090',
            endpoints: {flowExecute: 'https://auth.example.com/flow/execute'},
            instanceId: 3,
            isInitialized: ref(true),
            isLoading,
            vendor: 'thunderid',
            ...thunderID,
          } as unknown as ThunderIDContext,
          [USER_KEY as symbol]: {
            flattenedProfile: ref(null),
            onUpdateProfile: vi.fn(),
            profile: ref(null),
            revalidateProfile,
            userSchema: schemaRef,
          } as unknown as UserContextValue,
        },
      },
      props,
      slots: slots as never,
    }) as VueWrapper;

  beforeEach(() => {
    isLoading = ref(false);
    revalidateProfile = vi.fn().mockResolvedValue(undefined);
    mockExecute.mockReset().mockReturnValue(new Promise(() => undefined));
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('starts the default flow for the attribute through the configured endpoint with the authenticated transport', async () => {
    mountVerify({attribute: 'workEmail'});
    await settle();

    expect(mockExecute).toHaveBeenCalledTimes(1);
    expect(mockExecute).toHaveBeenCalledWith({
      baseUrl: 'https://localhost:8090',
      instanceId: 3,
      payload: {
        flowType: 'SELF_SERVICE',
        handle: 'default-self-attribute-verification-flow',
        inputs: {attribute: 'workEmail'},
      },
      url: 'https://auth.example.com/flow/execute',
    });
  });

  it('posts to /flow/execute on baseUrl when no flowExecute endpoint is configured', async () => {
    mountVerify({attribute: 'workEmail'}, userSchema, {endpoints: undefined});
    await settle();

    expect((mockExecute.mock.calls[0][0] as {url: string}).url).toBe('https://localhost:8090/flow/execute');
  });

  it('starts the flow the app names by handle', async () => {
    mountVerify({attribute: 'workEmail', flowHandle: 'email-link-verification'});
    await settle();

    expect((mockExecute.mock.calls[0][0] as {payload: {handle: string}}).payload.handle).toBe(
      'email-link-verification',
    );
  });

  it('names the attribute with a readable name without a schema display name', async () => {
    mockExecute.mockResolvedValue(linkSent);
    const wrapper: VueWrapper = mountVerify({attribute: 'workEmail'});
    await settle();

    expect(wrapper.text()).toContain('Verify Work Email');
  });

  it('waits for the user schema to load before deciding', async () => {
    isLoading.value = true;
    const onError: Mock = vi.fn();
    mountVerify({attribute: 'workEmail', onError});
    await settle();

    expect(mockExecute).not.toHaveBeenCalled();
    expect(onError).not.toHaveBeenCalled();

    isLoading.value = false;
    await settle();

    expect(mockExecute).toHaveBeenCalledTimes(1);
  });

  it('waits, without refusing, while the schema is unknown after the session loads', async () => {
    const schema: Ref<Record<string, unknown> | null> = ref(null);
    const onError: Mock = vi.fn();
    mountVerify({attribute: 'workEmail', onError}, null, {}, {}, schema);
    await settle();

    expect(mockExecute).not.toHaveBeenCalled();
    expect(onError).not.toHaveBeenCalled();

    schema.value = userSchema;
    await settle();

    expect(mockExecute).toHaveBeenCalledTimes(1);
    expect(onError).not.toHaveBeenCalled();
  });

  it.each([
    ['a string attribute such as a first name', 'given_name', userSchema],
    ['a multi-valued attribute', 'emails', {emails: {type: 'array'}}],
    ['an attribute the schema does not declare', 'email', userSchema],
  ])('starts nothing for %s and reports the refusal', async (_label, attribute, schema) => {
    const onError: Mock = vi.fn();
    const wrapper: VueWrapper = mountVerify({attribute, onError}, schema as Record<string, unknown> | null);
    await settle();

    expect(mockExecute).not.toHaveBeenCalled();
    expect((onError.mock.calls[0][0] as {code: string}).code).toBe('VerifyAttribute-handleInitialize-RuntimeError-001');
    expect(wrapper.text()).toContain('Verification failed. Please try again.');
  });

  it('re-reads the profile once the server records the verification, then reports it', async () => {
    const onComplete: Mock = vi.fn();
    mockExecute.mockResolvedValue(verified);
    mountVerify({attribute: 'workEmail', onComplete});
    await settle();

    expect(revalidateProfile).toHaveBeenCalledTimes(1);
    expect(onComplete).toHaveBeenCalledWith(verified);
  });

  it('still reports the verification when the re-read fails', async () => {
    const onComplete: Mock = vi.fn();
    revalidateProfile.mockRejectedValue(new Error('offline'));
    mockExecute.mockResolvedValue(verified);
    const wrapper: VueWrapper = mountVerify({attribute: 'workEmail', onComplete});
    await settle();

    expect(onComplete).toHaveBeenCalledTimes(1);
    expect(wrapper.text()).toContain('Work Email verified.');
  });

  it('offers Done for a link even when the app handles none, and re-reads the profile when it is selected', async () => {
    mockExecute.mockResolvedValue(linkSent);
    const wrapper: VueWrapper = mountVerify({attribute: 'workEmail'});
    await settle();

    expect(revalidateProfile).not.toHaveBeenCalled();
    await button(wrapper, 'Done')!.trigger('click');
    await settle();

    expect(revalidateProfile).toHaveBeenCalledTimes(1);
    expect(mockExecute).toHaveBeenCalledTimes(1);
  });

  describe('custom render', () => {
    it('passes the step the connected component started to its slot', async () => {
      mockExecute.mockResolvedValue(codeSent());
      const wrapper: VueWrapper = mountVerify({attribute: 'workEmail'}, userSchema, {}, {default: customSlot({})});
      await settle();

      expect(wrapper.find('h2').text()).toBe('Verify your email address');
      expect(button(wrapper, 'Verify')).toBeUndefined();
      expect(mockExecute).toHaveBeenCalledTimes(1);
      expect(mockExecute.mock.calls[0][0]).toMatchObject({instanceId: 3, payload: {flowType: 'SELF_SERVICE'}});
    });

    it('re-reads the profile and reports the verification a custom UI submitted', async () => {
      const onComplete: Mock = vi.fn();
      mockExecute.mockResolvedValueOnce(codeSent()).mockResolvedValueOnce(verified);
      const wrapper: VueWrapper = mountVerify(
        {attribute: 'workEmail', onComplete},
        userSchema,
        {},
        {default: customSlot({})},
      );
      await settle();

      await wrapper.find('input').setValue('123456');
      await button(wrapper, 'Check')!.trigger('click');
      await settle();

      expect((mockExecute.mock.calls[1][0] as {payload: unknown}).payload).toEqual({
        action: 'action_email_verify',
        challengeToken: 'ct-1',
        executionId: 'exec-1',
        inputs: {otp: '123456'},
      });
      expect(wrapper.text()).toContain('Work Email verified.');
      expect(revalidateProfile).toHaveBeenCalledTimes(1);
      expect(onComplete).toHaveBeenCalledWith(verified);
    });

    it('re-reads the profile when a custom UI confirms a link', async () => {
      const onDone: Mock = vi.fn();
      mockExecute.mockResolvedValue(linkSent);
      const wrapper: VueWrapper = mountVerify(
        {attribute: 'workEmail', onDone},
        userSchema,
        {},
        {default: customSlot({})},
      );
      await settle();

      await button(wrapper, 'Opened it')!.trigger('click');
      await settle();

      expect(revalidateProfile).toHaveBeenCalledTimes(1);
      expect(onDone).toHaveBeenCalledTimes(1);
    });
  });
});
