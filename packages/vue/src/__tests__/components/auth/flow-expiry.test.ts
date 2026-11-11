// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {ThunderIDAPIError} from '@thunderid/browser';
import {flushPromises, mount} from '@vue/test-utils';
import {afterEach, beforeEach, describe, expect, it, vi, type Mock} from 'vitest';
import {effectScope, nextTick, ref, shallowRef, type EffectScope, type Ref} from 'vue';
import FlowExpired from '../../../components/auth/flow/FlowExpired';
import BaseSignIn from '../../../components/auth/sign-in/BaseSignIn';
import SignIn, {type SignInRenderProps} from '../../../components/auth/sign-in/SignIn';
import SignUp from '../../../components/auth/sign-up/SignUp';
import useFlowExpiry, {type FlowExpiry, type FlowExpiryStep} from '../../../composables/auth/useFlowExpiry';
import useFlowExpiryRedirect from '../../../composables/auth/useFlowExpiryRedirect';
import {FLOW_KEY, FLOW_META_KEY, I18N_KEY, THUNDERID_KEY} from '../../../keys';

const translations: Record<string, string> = {
  'flow.expired.application': 'the application',
  'flow.expired.redirect.now': 'Back to {application} now',
  'flow.expired.redirecting': 'Taking you back to {application} in {seconds}s.',
  'flow.expired.restart': 'Start again',
  'flow.expired.restart.description': 'Please start again.',
  'flow.expired.restarted': 'Your session expired, so we started again.',
};

const t = (key: string, params: Record<string, string | number> = {}): string =>
  Object.entries(params).reduce(
    (text: string, [name, value]: [string, string | number]) => text.replace(`{${name}}`, String(value)),
    translations[key] ?? key,
  );

const step = (expiresIn?: number): Record<string, unknown> => ({
  data: {meta: {components: [{id: 'username', ref: 'username', type: 'TEXT_INPUT'}]}},
  executionId: 'e-1',
  ...(expiresIn !== undefined && {expiresIn}),
  flowStatus: 'INCOMPLETE',
  type: 'VIEW',
});

const expiredError = (): ThunderIDAPIError =>
  new ThunderIDAPIError(JSON.stringify({code: 'FES-1004', message: 'Invalid request'}), 'FLOW_ERROR', 'vue', 400);

const provide = (overrides: Record<string, unknown>): Record<symbol, unknown> => ({
  [THUNDERID_KEY as symbol]: {
    applicationId: 'app-1',
    getStorageManager: () => null,
    isInitialized: ref(true),
    isLoading: ref(false),
    vendor: 'thunderid',
    ...overrides,
  },
  [FLOW_META_KEY as symbol]: {meta: ref({application: {name: 'Acme Portal'}})},
  [I18N_KEY as symbol]: {currentLanguage: ref('en-US'), t},
});

describe('flow expiry', () => {
  let scope: EffectScope;

  beforeEach(() => {
    scope = effectScope();
    vi.spyOn(document, 'hasFocus').mockReturnValue(true);
  });

  afterEach(() => {
    scope.stop();
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  describe('useFlowExpiry', () => {
    it('expires once expiresIn passes, counted from the response, and clears for a new step', async () => {
      vi.useFakeTimers();
      const current: Ref<FlowExpiryStep | null> = shallowRef({expiresIn: 5});
      const expiry: FlowExpiry = scope.run(() => useFlowExpiry(current))!;

      vi.advanceTimersByTime(4999);
      expect(expiry.isFlowExpired.value).toBe(false);
      vi.advanceTimersByTime(1);
      expect(expiry.isFlowExpired.value).toBe(true);

      current.value = {expiresIn: 60};
      await nextTick();
      expect(expiry.isFlowExpired.value).toBe(false);
    });

    it('expires when the caller reports it, and keeps the same expiry while expired', () => {
      const expiry: FlowExpiry = scope.run(() => useFlowExpiry({expiresIn: 60}))!;

      expiry.expireFlow();
      const first: object | null = expiry.expiry.value;
      expiry.expireFlow();

      expect(expiry.isFlowExpired.value).toBe(true);
      expect(expiry.expiry.value).toBe(first);
    });
  });

  describe('useFlowExpiryRedirect', () => {
    it('counts down once the user is on the page', async () => {
      vi.useFakeTimers();
      const expiry: Ref<object | null> = shallowRef({});
      const redirect = scope.run(() => useFlowExpiryRedirect(expiry, 'https://app.example.com'))!;

      expect(redirect.value).toMatchObject({isCountingDown: false, secondsLeft: 10});

      vi.advanceTimersByTime(0);
      await nextTick();
      vi.advanceTimersByTime(3000);
      await nextTick();

      expect(redirect.value).toMatchObject({isCountingDown: true, secondsLeft: 7, url: 'https://app.example.com'});
    });

    it('has nothing to count down without a URL', () => {
      const redirect = scope.run(() => useFlowExpiryRedirect({}, undefined))!;
      expect(redirect.value).toBeNull();
    });
  });

  describe('FlowExpired', () => {
    it('offers to start again', async () => {
      const onRestart: Mock = vi.fn();
      const wrapper = mount(FlowExpired, {global: {provide: provide({})}, props: {onRestart}});

      expect(wrapper.text()).toContain('Please start again.');
      await wrapper.get('button').trigger('click');

      expect(onRestart).toHaveBeenCalledTimes(1);
    });

    it('counts down to the application and shortens only its name in the link', () => {
      const redirect = {
        countdownSeconds: 10,
        isCountingDown: true,
        isRedirectFailed: false,
        secondsLeft: 7,
        url: 'https://app.example.com',
      };
      const wrapper = mount(FlowExpired, {global: {provide: provide({})}, props: {redirect}});

      expect(wrapper.text()).toContain('Taking you back to Acme Portal in 7s.');
      const link = wrapper.get('a');
      expect(link.attributes('href')).toBe('https://app.example.com');
      expect(link.text()).toBe('Back to Acme Portal now');
      expect(link.get('span').text()).toBe('Acme Portal');
    });
  });

  describe('SignIn', () => {
    it('starts again when the server refuses a step as expired, and says so until the user acts', async () => {
      const signIn: Mock = vi
        .fn()
        .mockResolvedValueOnce(step())
        .mockRejectedValueOnce(expiredError())
        .mockResolvedValue(step());
      const slot: Mock<(props: SignInRenderProps) => never[]> = vi.fn(() => []);
      const isInitialized: Ref<boolean> = ref(false);
      const wrapper = mount(SignIn, {global: {provide: provide({isInitialized, signIn})}, slots: {default: slot}});
      isInitialized.value = true;
      await flushPromises();

      await slot.mock.lastCall![0].onSubmit({executionId: 'e-1', inputs: {username: 'ada'}});
      await new Promise((resolve: (value: unknown) => void) => {
        setTimeout(resolve, 0);
      });
      await flushPromises();

      expect(signIn).toHaveBeenCalledTimes(3);
      expect(signIn.mock.calls[2][0]).toMatchObject({applicationId: 'app-1'});
      expect(slot.mock.lastCall![0]).toMatchObject({error: null, isFlowExpired: false, isFlowRestarted: true});
      expect(wrapper.emitted('error')).toBeUndefined();

      await slot.mock.lastCall![0].onSubmit({executionId: 'e-1', inputs: {username: 'ada'}});
      await flushPromises();

      expect(slot.mock.lastCall![0].isFlowRestarted).toBe(false);
    });

    it('shows the expired state with the countdown when afterFlowExpiredUrl is set', async () => {
      const signIn: Mock = vi.fn().mockResolvedValueOnce(step()).mockRejectedValueOnce(expiredError());
      const slot: Mock<(props: SignInRenderProps) => never[]> = vi.fn(() => []);
      const isInitialized: Ref<boolean> = ref(false);
      mount(SignIn, {
        global: {provide: provide({isInitialized, signIn})},
        props: {afterFlowExpiredUrl: 'https://app.example.com'},
        slots: {default: slot},
      });
      isInitialized.value = true;
      await flushPromises();

      await slot.mock.lastCall![0].onSubmit({executionId: 'e-1', inputs: {}});
      await flushPromises();

      expect(signIn).toHaveBeenCalledTimes(2);
      expect(slot.mock.lastCall![0].isFlowExpired).toBe(true);
      expect(slot.mock.lastCall![0].flowExpiryRedirect).toMatchObject({url: 'https://app.example.com'});
    });
  });

  describe('SignUp', () => {
    it('starts again once the step expires and shows the notice', async () => {
      vi.useFakeTimers({toFake: ['setTimeout', 'clearTimeout', 'Date']});
      const signUp: Mock = vi.fn().mockResolvedValue(step(30));
      const slot: Mock = vi.fn(() => []);
      mount(SignUp, {global: {provide: provide({signUp})}, slots: {default: slot}});
      await vi.runOnlyPendingTimersAsync();
      await flushPromises();
      expect(signUp).toHaveBeenCalledTimes(1);
      expect(slot.mock.lastCall![0].isFlowRestarted).toBe(false);

      await vi.advanceTimersByTimeAsync(30000);
      await flushPromises();

      expect(signUp).toHaveBeenCalledTimes(2);
      expect(slot.mock.lastCall![0]).toMatchObject({isFlowExpired: false, isFlowRestarted: true});
    });
  });

  describe('BaseSignIn', () => {
    it('tells the user the flow started again, and shows the expired state in place of the form', async () => {
      const flow = {
        addMessage: vi.fn(),
        clearMessages: vi.fn(),
        messages: ref([]),
        subtitle: ref(null),
        title: ref(null),
      };
      const wrapper = mount(BaseSignIn, {
        global: {provide: {...provide({}), [FLOW_KEY as symbol]: flow}},
        props: {components: [{id: 'username', ref: 'username', type: 'TEXT_INPUT'}], isFlowRestarted: true},
      });

      expect(wrapper.text()).toContain('Your session expired, so we started again.');

      await wrapper.setProps({isFlowExpired: true, onRestart: vi.fn()});

      expect(wrapper.text()).toContain('Start again');
      expect(wrapper.find('input').exists()).toBe(false);
    });
  });
});
