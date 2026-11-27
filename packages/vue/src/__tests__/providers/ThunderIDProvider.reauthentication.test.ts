// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {ThunderIDRuntimeError} from '@thunderid/browser';
import {flushPromises, mount} from '@vue/test-utils';
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import {defineComponent, h, inject} from 'vue';
import {THUNDERID_KEY} from '../../keys';
import type {ThunderIDContext} from '../../models/contexts';
import ThunderIDProvider from '../../providers/ThunderIDProvider';

const client = vi.hoisted(() => ({
  executeReauthenticationFlow: vi.fn(),
  getConfiguration: vi.fn().mockResolvedValue({}),
  getDecodedIdToken: vi.fn().mockResolvedValue({sub: 'user-1'}),
  getDiscoveryResponse: vi.fn().mockResolvedValue({}),
  getReauthenticationMethod: vi.fn(),
  initialize: vi.fn().mockResolvedValue(true),
  isInitialized: vi.fn().mockResolvedValue(true),
  isLoading: vi.fn(() => false),
  isSignedIn: vi.fn().mockResolvedValue(true),
  on: vi.fn(),
  reauthenticate: vi.fn(),
  signIn: vi.fn(),
}));

vi.mock('../../ThunderIDVueClient', () => ({
  default: vi.fn().mockImplementation(function MockClient() {
    return client;
  }),
}));

const continueStep = {
  data: {meta: {components: [{eventType: 'TRIGGER', id: 'go', label: 'Continue', type: 'ACTION'}]}},
  executionId: 'e-1',
  flowStatus: 'INCOMPLETE',
  type: 'VIEW',
};

const mountProvider = async (): Promise<ThunderIDContext> => {
  let context: ThunderIDContext | undefined;
  const Probe = defineComponent({
    setup() {
      context = inject<ThunderIDContext>(THUNDERID_KEY);
      return () => h('div');
    },
  });

  mount(ThunderIDProvider, {
    attachTo: document.body,
    props: {baseUrl: 'https://localhost:8090', clientId: 'client', preferences: {user: {fetchUserProfile: false}}},
    slots: {default: () => h(Probe)},
  });
  await flushPromises();

  return context!;
};

describe('ThunderIDProvider reauthenticate', () => {
  beforeEach(() => {
    client.getReauthenticationMethod.mockResolvedValue('popup');
    client.reauthenticate.mockResolvedValue(undefined);
    client.executeReauthenticationFlow.mockResolvedValue({assertion: 'a', flowStatus: 'COMPLETE'});
  });

  afterEach(() => {
    vi.clearAllMocks();
    document.body.innerHTML = '';
  });

  it('signs in again in a popup for a session from a redirect sign-in', async () => {
    const context: ThunderIDContext = await mountProvider();

    await context.reauthenticate({maxAge: 30});

    expect(client.reauthenticate).toHaveBeenCalledWith({maxAge: 30});
    expect(client.executeReauthenticationFlow).not.toHaveBeenCalled();
  });

  it('runs the sign-in flow in a dialog for a session from a sign-in flow', async () => {
    client.getReauthenticationMethod.mockResolvedValue('flow');
    const context: ThunderIDContext = await mountProvider();

    await context.reauthenticate({maxAge: 30});

    expect(client.reauthenticate).not.toHaveBeenCalled();
    expect(client.executeReauthenticationFlow).toHaveBeenCalledWith({}, {maxAge: 30});
  });

  it('falls back to the dialog when the popup reports a session from a sign-in flow', async () => {
    client.reauthenticate.mockRejectedValue(new ThunderIDRuntimeError('x', 'BROWSER-REAUTHENTICATION-UM02', 'browser'));
    const context: ThunderIDContext = await mountProvider();

    await context.reauthenticate({maxAge: 30});

    expect(client.executeReauthenticationFlow).toHaveBeenCalledWith({}, {maxAge: 30});
  });

  it('submits the step and resolves when the flow completes', async () => {
    client.getReauthenticationMethod.mockResolvedValue('flow');
    client.executeReauthenticationFlow
      .mockResolvedValueOnce(continueStep)
      .mockResolvedValueOnce({assertion: 'a', flowStatus: 'COMPLETE'});
    const context: ThunderIDContext = await mountProvider();

    const pending: Promise<void> = context.reauthenticate({maxAge: 30});
    await flushPromises();
    const button = [...document.querySelectorAll('[role="dialog"] button')].find(
      (element: Element) => element.textContent === 'Continue',
    ) as HTMLButtonElement;
    button.click();

    await expect(pending).resolves.toBeUndefined();
    expect(client.executeReauthenticationFlow).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({action: 'go', executionId: 'e-1'}),
      {maxAge: 30},
    );
    await flushPromises();
    expect(document.querySelector('[role="dialog"]')).toBeNull();
  });

  it('rejects and keeps nothing open when the user closes the dialog', async () => {
    client.getReauthenticationMethod.mockResolvedValue('flow');
    client.executeReauthenticationFlow.mockResolvedValueOnce(continueStep);
    const context: ThunderIDContext = await mountProvider();

    const pending: Promise<void> = context.reauthenticate({maxAge: 30});
    await flushPromises();
    document.querySelector<HTMLButtonElement>('[role="dialog"] [aria-label="Close"]')!.click();

    await expect(pending).rejects.toMatchObject({code: 'VUE-REAUTHENTICATION-CN01'});
    await flushPromises();
    expect(document.querySelector('[role="dialog"]')).toBeNull();
  });

  it('closes on Escape and keeps focus inside when the focused control leaves the page', async () => {
    client.getReauthenticationMethod.mockResolvedValue('flow');
    client.executeReauthenticationFlow.mockResolvedValueOnce(continueStep);
    const context: ThunderIDContext = await mountProvider();
    const outside: HTMLButtonElement = document.body.appendChild(document.createElement('button'));

    const pending: Promise<void> = context.reauthenticate({maxAge: 30});
    await flushPromises();
    const dialog: HTMLElement = document.querySelector<HTMLElement>('[role="dialog"]')!;
    outside.focus();
    expect(dialog.contains(document.activeElement)).toBe(true);

    document.body.dispatchEvent(new KeyboardEvent('keydown', {bubbles: true, key: 'Escape'}));

    await expect(pending).rejects.toMatchObject({code: 'VUE-REAUTHENTICATION-CN01'});
    outside.remove();
  });

  it('rejects when a different user signs in', async () => {
    client.getReauthenticationMethod.mockResolvedValue('flow');
    const differentUser = new ThunderIDRuntimeError('x', 'BROWSER-REAUTHENTICATION-DU01', 'browser');
    client.executeReauthenticationFlow.mockResolvedValueOnce(continueStep).mockRejectedValueOnce(differentUser);
    const context: ThunderIDContext = await mountProvider();

    const pending: Promise<void> = context.reauthenticate({maxAge: 30});
    await flushPromises();
    const button = [...document.querySelectorAll('[role="dialog"] button')].find(
      (element: Element) => element.textContent === 'Continue',
    ) as HTMLButtonElement;
    button.click();

    await expect(pending).rejects.toBe(differentUser);
  });

  const clickContinue = (): void => {
    const button = [...document.querySelectorAll('[role="dialog"] button')].find(
      (element: Element) => element.textContent === 'Continue',
    ) as HTMLButtonElement;
    button.click();
  };

  it('ends the re-sign-in instead of starting again when a new flow cannot go on', async () => {
    client.getReauthenticationMethod.mockResolvedValue('flow');
    client.executeReauthenticationFlow.mockResolvedValue({flowStatus: 'ERROR'});
    const context: ThunderIDContext = await mountProvider();

    await expect(context.reauthenticate({maxAge: 30})).rejects.toMatchObject({code: 'VUE-REAUTHENTICATION-FE01'});
    expect(client.executeReauthenticationFlow).toHaveBeenCalledTimes(1);
  });

  it('starts again when the user picks an option that leaves the page, and says why', async () => {
    client.getReauthenticationMethod.mockResolvedValue('flow');
    client.executeReauthenticationFlow
      .mockResolvedValueOnce(continueStep)
      .mockResolvedValueOnce({executionId: 'e-1', flowStatus: 'INCOMPLETE', type: 'REDIRECTION'})
      .mockResolvedValueOnce(continueStep);
    const context: ThunderIDContext = await mountProvider();

    void context.reauthenticate({maxAge: 30}).catch(() => undefined);
    await flushPromises();
    clickContinue();
    await flushPromises();

    expect(client.executeReauthenticationFlow).toHaveBeenNthCalledWith(3, {}, {maxAge: 30});
    expect(document.querySelector('[role="dialog"]')?.textContent).toContain(
      'This sign-in option is not available here. Choose another one.',
    );
  });

  it('fails when the flow offers only an option that leaves the page', async () => {
    client.getReauthenticationMethod.mockResolvedValue('flow');
    client.executeReauthenticationFlow.mockResolvedValue({
      executionId: 'e-1',
      flowStatus: 'INCOMPLETE',
      type: 'REDIRECTION',
    });
    const context: ThunderIDContext = await mountProvider();

    await expect(context.reauthenticate({maxAge: 30})).rejects.toMatchObject({code: 'VUE-REAUTHENTICATION-UO01'});
  });

  it('rejects an open re-sign-in that a new one replaces', async () => {
    client.getReauthenticationMethod.mockResolvedValue('flow');
    client.executeReauthenticationFlow.mockResolvedValue(continueStep);
    const context: ThunderIDContext = await mountProvider();

    const first: Promise<void> = context.reauthenticate({maxAge: 30});
    await flushPromises();
    void context.reauthenticate({maxAge: 30}).catch(() => undefined);

    await expect(first).rejects.toMatchObject({code: 'VUE-REAUTHENTICATION-SU01'});
  });
});
