// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {VueWrapper, flushPromises, mount} from '@vue/test-utils';
import {Mock, afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import {ref} from 'vue';
import AcceptInvite from '../../../components/auth/accept-invite/AcceptInvite';
import type {AcceptInviteFlowResponse} from '../../../components/auth/accept-invite/BaseAcceptInvite';
import {FLOW_META_KEY, I18N_KEY, THUNDERID_KEY} from '../../../keys';
import {initiateOAuthRedirect} from '../../../utils/oauth';

vi.mock('../../../utils/oauth', () => ({initiateOAuthRedirect: vi.fn()}));

const STORAGE_KEY = 'thunderid_flow_id';
const sdk: {baseUrl?: string; endpoints?: Record<string, string>} = {};

// Translates the invitation namespace, so a label left as a template is visible in the output.
const providers = (): Record<symbol, unknown> => ({
  [FLOW_META_KEY as symbol]: {meta: ref(null)},
  [I18N_KEY as symbol]: {
    bundles: ref({}),
    currentLanguage: ref('en-US'),
    fallbackLanguage: 'en-US',
    injectBundles: vi.fn(),
    setLanguage: vi.fn(),
    t: (key: string): string => (key.startsWith('invitation') ? `[${key}]` : key),
  },
  [THUNDERID_KEY as symbol]: {
    baseUrl: sdk.baseUrl,
    endpoints: sdk.endpoints,
    getStorageManager: (): undefined => undefined,
    vendor: 'thunderid',
  },
});

// The INVITATION template's steps for an invitee, as the server returns them.
const acceptStep: AcceptInviteFlowResponse = {
  challengeToken: 'challenge-1',
  data: {
    meta: {
      components: [
        {id: 'heading_accept_new', label: '{{ t(invitation:forms.accept.title) }}', type: 'TEXT', variant: 'HEADING_1'},
        {
          components: [
            {
              eventType: 'SUBMIT',
              id: 'action_accept_new',
              label: '{{ t(invitation:forms.accept.actions.accept.label) }}',
              type: 'ACTION',
              variant: 'PRIMARY',
            },
          ],
          id: 'block_accept_new',
          type: 'BLOCK',
        },
      ],
    },
  },
  executionId: 'exec-1',
  flowStatus: 'INCOMPLETE',
  type: 'VIEW',
};
const detailsStep: AcceptInviteFlowResponse = {
  challengeToken: 'challenge-2',
  data: {
    meta: {
      components: [
        {
          components: [
            {id: 'username', label: 'Username', ref: 'username', required: true, type: 'TEXT_INPUT'},
            {id: 'password', label: 'Password', ref: 'password', required: true, type: 'PASSWORD_INPUT'},
            {
              eventType: 'SUBMIT',
              id: 'action_user_details',
              label: '{{ t(invitation:forms.user_details.actions.submit.label) }}',
              type: 'ACTION',
              variant: 'PRIMARY',
            },
          ],
          id: 'block_user_details',
          type: 'BLOCK',
        },
      ],
    },
  },
  executionId: 'exec-1',
  flowStatus: 'INCOMPLETE',
  type: 'VIEW',
};
const joinedStep: AcceptInviteFlowResponse = {
  data: {
    meta: {
      components: [
        {id: 'joined_heading', label: '{{ t(invitation:forms.complete.title) }}', type: 'TEXT', variant: 'HEADING_1'},
        {id: 'joined_message', label: '{{ t(invitation:forms.complete.description) }}', type: 'TEXT'},
      ],
    },
  },
  executionId: 'exec-1',
  flowStatus: 'COMPLETE',
};

const okJson = (body: unknown): Response => ({json: () => Promise.resolve(body), ok: true}) as unknown as Response;
const sent = (fetchMock: Mock, call: number): Record<string, unknown> =>
  JSON.parse((fetchMock.mock.calls[call][1] as RequestInit).body as string);

const mountFromLink = async (fetchMock: Mock, props: Record<string, unknown> = {}): Promise<VueWrapper> => {
  vi.stubGlobal('fetch', fetchMock);
  const wrapper: VueWrapper = mount(AcceptInvite, {global: {provide: providers()}, props});
  await flushPromises();
  return wrapper;
};

const joinAsNewAccount = async (wrapper: VueWrapper): Promise<void> => {
  await wrapper.find('input[name="username"]').setValue('invitee');
  await wrapper.find('input[name="password"]').setValue('Secret-pw1!');
  await wrapper.find('[data-testid="thunderid-action-action_user_details"]').trigger('click');
  await flushPromises();
};

describe('AcceptInvite (Vue)', () => {
  beforeEach(() => {
    sdk.baseUrl = 'https://ids.example';
    sdk.endpoints = undefined;
    sessionStorage.clear();
    window.history.replaceState({}, '', '/accept?executionId=exec-1&inviteToken=token-1');
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.clearAllMocks();
    window.history.replaceState({}, '', '/');
  });

  it("verifies the link's invite with its execution ID, on the provider's server", async () => {
    const fetchMock: Mock = vi.fn().mockResolvedValue(okJson(acceptStep));
    await mountFromLink(fetchMock);

    expect(fetchMock.mock.calls[0][0]).toBe('https://ids.example/flow/execute');
    expect(sent(fetchMock, 0)).toEqual({executionId: 'exec-1', inputs: {inviteToken: 'token-1'}, verbose: true});
  });

  it('honours the flowExecute endpoint override, and prefers the baseUrl prop', async () => {
    sdk.endpoints = {flowExecute: 'https://rs.example/api/flow/execute'};
    const overridden: Mock = vi.fn().mockResolvedValue(okJson(acceptStep));
    await mountFromLink(overridden);
    expect(overridden.mock.calls[0][0]).toBe('https://rs.example/api/flow/execute');

    const explicit: Mock = vi.fn().mockResolvedValue(okJson(acceptStep));
    await mountFromLink(explicit, {baseUrl: 'https://gate.example'});
    expect(explicit.mock.calls[0][0]).toBe('https://gate.example/flow/execute');
  });

  it('continues each step with the execution ID and the latest challenge token', async () => {
    const fetchMock: Mock = vi
      .fn()
      .mockResolvedValueOnce(okJson(acceptStep))
      .mockResolvedValueOnce(okJson(detailsStep))
      .mockResolvedValueOnce(okJson(joinedStep));
    const wrapper: VueWrapper = await mountFromLink(fetchMock);

    await wrapper.find('[data-testid="thunderid-action-action_accept_new"]').trigger('click');
    await flushPromises();
    await joinAsNewAccount(wrapper);

    expect(sent(fetchMock, 1)).toMatchObject({
      action: 'action_accept_new',
      challengeToken: 'challenge-1',
      executionId: 'exec-1',
    });
    expect(sent(fetchMock, 2)).toMatchObject({
      action: 'action_user_details',
      challengeToken: 'challenge-2',
      executionId: 'exec-1',
      inputs: {password: 'Secret-pw1!', username: 'invitee'},
    });
    expect(sent(fetchMock, 2)).not.toHaveProperty('flowId');
  });

  it("translates the flow's headings and labels", async () => {
    const wrapper: VueWrapper = await mountFromLink(vi.fn().mockResolvedValue(okJson(acceptStep)));

    expect(wrapper.text()).toMatch(/\[invitation[.:]forms[.:]accept[.:]title\]/);
    expect(wrapper.text()).toMatch(/\[invitation[.:]forms[.:]accept[.:]actions[.:]accept[.:]label\]/);
    expect(wrapper.text()).not.toContain('{{');
  });

  it('tags the step elements with the flow test IDs', async () => {
    const wrapper: VueWrapper = await mountFromLink(vi.fn().mockResolvedValue(okJson(detailsStep)));

    expect(wrapper.find('[data-testid="thunderid-field-username"]').exists()).toBe(true);
    expect(wrapper.find('[data-testid="thunderid-field-password"]').exists()).toBe(true);
    expect(wrapper.find('[data-testid="thunderid-action-action_user_details"]').exists()).toBe(true);
  });

  it("calls onComplete when the invitee joins, and shows the flow's completion step", async () => {
    const onComplete: Mock = vi.fn();
    const fetchMock: Mock = vi
      .fn()
      .mockResolvedValueOnce(okJson(detailsStep))
      .mockResolvedValueOnce(okJson(joinedStep));
    const wrapper: VueWrapper = await mountFromLink(fetchMock, {onComplete});

    await joinAsNewAccount(wrapper);

    expect(onComplete).toHaveBeenCalledTimes(1);
    expect(wrapper.text()).toMatch(/\[invitation[.:]forms[.:]complete[.:]description\]/);
  });

  it('shows the completion card when the flow ends without a step of its own', async () => {
    const fetchMock: Mock = vi
      .fn()
      .mockResolvedValueOnce(okJson(detailsStep))
      .mockResolvedValueOnce(okJson({executionId: 'exec-1', flowStatus: 'COMPLETE'}));
    const wrapper: VueWrapper = await mountFromLink(fetchMock);

    await joinAsNewAccount(wrapper);

    expect(wrapper.text()).toContain('Account Setup Complete!');
    expect(wrapper.find('input[name="username"]').exists()).toBe(false);
  });

  it('keeps the execution ID in session storage only across a redirect', async () => {
    const redirect: AcceptInviteFlowResponse = {
      data: {redirectURL: 'https://idp.example/authorize'},
      executionId: 'exec-1',
      flowStatus: 'INCOMPLETE',
      type: 'REDIRECTION',
    };
    const fetchMock: Mock = vi.fn().mockResolvedValueOnce(okJson(acceptStep)).mockResolvedValueOnce(okJson(redirect));
    const wrapper: VueWrapper = await mountFromLink(fetchMock);
    expect(sessionStorage.getItem(STORAGE_KEY)).toBeNull();

    await wrapper.find('[data-testid="thunderid-action-action_accept_new"]').trigger('click');
    await flushPromises();
    expect(initiateOAuthRedirect).toHaveBeenCalled();
    expect(sessionStorage.getItem(STORAGE_KEY)).toBe('exec-1');

    wrapper.unmount();
    const done: Mock = vi.fn().mockResolvedValueOnce(okJson(detailsStep)).mockResolvedValueOnce(okJson(joinedStep));
    await joinAsNewAccount(await mountFromLink(done));
    expect(sessionStorage.getItem(STORAGE_KEY)).toBeNull();
  });
});
