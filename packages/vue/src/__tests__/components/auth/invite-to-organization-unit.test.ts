// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {getDefaultI18nBundles} from '@thunderid/browser';
import {DOMWrapper, VueWrapper, flushPromises, mount} from '@vue/test-utils';
import {Mock, beforeEach, describe, expect, it, vi} from 'vitest';
import {type VNode, h, ref} from 'vue';
import BaseInviteToOrganizationUnit, {
  type BaseInviteToOrganizationUnitRenderProps,
} from '../../../components/auth/invite-to-organization-unit/BaseInviteToOrganizationUnit';
import InviteToOrganizationUnit from '../../../components/auth/invite-to-organization-unit/InviteToOrganizationUnit';
import type {InviteUserFlowResponse} from '../../../composables/auth/useInviteFlow';
import {FLOW_META_KEY, I18N_KEY} from '../../../keys';
import type {I18nContextValue} from '../../../models/contexts';

const mocks = vi.hoisted(() => ({
  thunderID: {
    baseUrl: 'https://thunder.example',
    endpoints: undefined as {flowExecute?: string} | undefined,
    http: {request: vi.fn()},
    isInitialized: {value: true},
  },
}));

vi.mock('../../../composables/useThunderID', () => ({default: () => mocks.thunderID}));

// Resolves keys through the real en-US bundle, so the tests assert on what a user sees.
const providers = (): Record<symbol, unknown> => ({
  [FLOW_META_KEY as symbol]: {meta: ref(null)},
  [I18N_KEY as symbol]: {
    bundles: ref({}),
    currentLanguage: ref('en-US'),
    fallbackLanguage: 'en-US',
    injectBundles: vi.fn(),
    setLanguage: vi.fn(),
    t: (key: string): string =>
      (getDefaultI18nBundles()['en-US']?.translations as unknown as Record<string, string>)?.[key] ?? key,
  } as unknown as I18nContextValue,
});

const submit = (id: string, label: string): Record<string, unknown> => ({
  eventType: 'SUBMIT',
  id,
  label,
  type: 'ACTION',
  variant: 'PRIMARY',
});

// The invitation template's steps, as the server returns them.
const emailStep: InviteUserFlowResponse = {
  challengeToken: 'challenge-1',
  data: {
    components: [
      {id: 'heading', label: 'Invite a member', type: 'TEXT', variant: 'HEADING_1'},
      {
        components: [
          {id: 'input_prompt_email', label: 'Email', ref: 'email', required: true, type: 'EMAIL_INPUT'},
          submit('action_submit_email', 'Next'),
        ],
        id: 'block',
        type: 'BLOCK',
      },
    ],
  },
  executionId: 'exec-1',
  flowStatus: 'INCOMPLETE',
};
const rolesStep: InviteUserFlowResponse = {
  challengeToken: 'challenge-2',
  data: {
    additionalData: {roleOptions: '[{"id":"r-dev","name":"Developer"},{"id":"r-view","name":"Viewer"}]'},
    components: [
      {
        components: [
          {id: 'roles_input_new', label: 'Roles', ref: 'roles', required: true, type: 'ROLE_SELECT'},
          submit('action_roles_new', 'Send invite'),
        ],
        id: 'block',
        type: 'BLOCK',
      },
    ],
  },
  executionId: 'exec-1',
  flowStatus: 'INCOMPLETE',
};
const sentStep: InviteUserFlowResponse = {
  data: {components: [{id: 'invite_sent_new_message', label: 'The invitation is on its way.', type: 'TEXT'}]},
  executionId: 'exec-1',
  flowStatus: 'INCOMPLETE',
};

const settle = async (): Promise<void> => {
  await flushPromises();
  await new Promise((resolve: (value: unknown) => void) => {
    setTimeout(resolve, 0);
  });
  await flushPromises();
};

const checkbox = (wrapper: VueWrapper, label: string): DOMWrapper<HTMLInputElement> =>
  wrapper
    .findAll('label')
    .find((node: DOMWrapper<Element>) => node.text() === label)!
    .find<HTMLInputElement>('input[type="checkbox"]');

describe('BaseInviteToOrganizationUnit (vue)', () => {
  let onInitialize: Mock;
  let onSubmit: Mock;

  const mountBase = (props: Record<string, unknown> = {}, slots: Record<string, unknown> = {}): VueWrapper =>
    mount(BaseInviteToOrganizationUnit, {
      global: {provide: providers()},
      props: {flowId: 'flow-1', onInitialize, onSubmit, ...props},
      slots: slots as never,
    }) as VueWrapper;

  beforeEach(() => {
    onInitialize = vi.fn().mockResolvedValue(emailStep);
    onSubmit = vi.fn();
  });

  it('starts the invitation by its flow ID', async () => {
    const wrapper: VueWrapper = mountBase();
    await settle();

    expect(onInitialize).toHaveBeenCalledTimes(1);
    expect(onInitialize).toHaveBeenCalledWith({flowId: 'flow-1', verbose: true});
    expect(wrapper.text()).toContain('Invite a member');
  });

  it('shows the step title the flow writes as a translation template, translated', async () => {
    onInitialize.mockResolvedValue({
      ...emailStep,
      data: {
        components: [
          {id: 'heading', label: '{{ t(signin:heading) }}', type: 'TEXT', variant: 'HEADING_1'},
          ...emailStep.data!.components!.slice(1),
        ],
      },
    });

    const wrapper: VueWrapper = mountBase();
    await settle();

    expect(wrapper.text()).toContain('Sign In');
    expect(wrapper.text()).not.toContain('{{');
  });

  it('runs the steps: the email, then the roles as space-separated IDs, then the server says it is sent', async () => {
    onSubmit.mockResolvedValueOnce(rolesStep).mockResolvedValueOnce(sentStep);
    const wrapper: VueWrapper = mountBase();
    await settle();

    const email: DOMWrapper<Element> = wrapper.get('[data-testid="thunderid-field-email"]');
    await (email.element.tagName === 'INPUT' ? email : email.get('input')).setValue('new.member@example.com');
    await wrapper.get('[data-testid="thunderid-action-action_submit_email"]').trigger('click');
    await settle();

    expect(onSubmit).toHaveBeenLastCalledWith({
      action: 'action_submit_email',
      challengeToken: 'challenge-1',
      executionId: 'exec-1',
      inputs: {email: 'new.member@example.com'},
      verbose: true,
    });

    expect(wrapper.find('[data-testid="thunderid-field-roles"]').exists()).toBe(true);
    await checkbox(wrapper, 'Developer').setValue(true);
    await checkbox(wrapper, 'Viewer').setValue(true);
    await wrapper.get('[data-testid="thunderid-action-action_roles_new"]').trigger('click');
    await settle();

    expect(onSubmit).toHaveBeenLastCalledWith({
      action: 'action_roles_new',
      challengeToken: 'challenge-2',
      executionId: 'exec-1',
      inputs: {roles: 'r-dev r-view'},
      verbose: true,
    });
    expect(wrapper.text()).toContain('The invitation is on its way.');
  });

  it('does not submit the roles step until a role is picked', async () => {
    onInitialize.mockResolvedValue(rolesStep);
    const wrapper: VueWrapper = mountBase();
    await settle();

    await wrapper.get('[data-testid="thunderid-action-action_roles_new"]').trigger('click');
    await settle();

    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('hands a custom slot the step and the actions to drive it', async () => {
    onInitialize.mockResolvedValue(rolesStep);
    onSubmit.mockResolvedValue(sentStep);
    const seen: {props?: BaseInviteToOrganizationUnitRenderProps} = {};

    const wrapper: VueWrapper = mountBase(
      {},
      {
        default: (slotProps: BaseInviteToOrganizationUnitRenderProps): VNode => {
          seen.props = slotProps;
          return h('p', 'custom');
        },
      },
    );
    await settle();

    expect(wrapper.text()).toBe('custom');
    expect(seen.props?.executionId).toBe('exec-1');
    expect(seen.props?.additionalData?.['roleOptions']).toBe(rolesStep.data?.additionalData?.['roleOptions']);

    // A custom slot sets the values through handleInputChange, which the step's validation reads.
    seen.props!.handleInputChange('roles', 'r-view');
    await settle();
    await seen.props!.handleSubmit({id: 'action_roles_new'});
    await settle();

    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({action: 'action_roles_new', executionId: 'exec-1', inputs: {roles: 'r-view'}}),
    );
  });

  it('shows a failed start as an error', async () => {
    onInitialize.mockRejectedValue(new Error('Forbidden'));
    const onError: Mock = vi.fn();

    const wrapper: VueWrapper = mountBase({onError});
    await settle();

    expect(wrapper.text()).toContain('Forbidden');
    expect(onError).toHaveBeenCalledWith(expect.objectContaining({message: 'Forbidden'}));
  });

  it('starts over when given another flow', async () => {
    const wrapper: VueWrapper = mountBase();
    await settle();

    await wrapper.setProps({flowId: 'flow-2'});
    await settle();

    expect(onInitialize).toHaveBeenCalledTimes(2);
    expect(onInitialize).toHaveBeenLastCalledWith({flowId: 'flow-2', verbose: true});
  });
});

describe('ROLE_SELECT (vue)', () => {
  const mountRoles = async (step: InviteUserFlowResponse): Promise<VueWrapper> => {
    const wrapper: VueWrapper = mount(BaseInviteToOrganizationUnit, {
      global: {provide: providers()},
      props: {flowId: 'flow-1', onInitialize: vi.fn().mockResolvedValue(step), onSubmit: vi.fn()},
    }) as VueWrapper;
    await settle();
    return wrapper;
  };

  const withRoles = (roleOptions: string, label?: string): InviteUserFlowResponse => ({
    ...rolesStep,
    data: {
      additionalData: {roleOptions},
      components: [{id: 'roles_input_new', label, ref: 'roles', required: true, type: 'ROLE_SELECT'}],
    },
  });

  it('offers a checkbox for each role the step sends, in a group named for the field', async () => {
    const wrapper: VueWrapper = await mountRoles(rolesStep);
    const group: DOMWrapper<Element> = wrapper.get('fieldset');

    expect(wrapper.get(`#${group.attributes('aria-labelledby')}`).text()).toMatch(/^Roles/);
    expect(group.findAll('input[type="checkbox"]')).toHaveLength(2);
    expect(checkbox(wrapper, 'Developer').exists()).toBe(true);
    expect(checkbox(wrapper, 'Viewer').exists()).toBe(true);
  });

  it('keeps the picked roles checked and drops a role when it is unchecked', async () => {
    const wrapper: VueWrapper = await mountRoles(rolesStep);

    await checkbox(wrapper, 'Developer').setValue(true);
    await checkbox(wrapper, 'Viewer').setValue(true);
    await checkbox(wrapper, 'Developer').setValue(false);

    expect(checkbox(wrapper, 'Developer').element.checked).toBe(false);
    expect(checkbox(wrapper, 'Viewer').element.checked).toBe(true);
  });

  it('says so when the step offers no roles', async () => {
    const wrapper: VueWrapper = await mountRoles(withRoles('[]', 'Roles'));

    expect(wrapper.findAll('input[type="checkbox"]')).toHaveLength(0);
    expect(wrapper.text()).toContain('No roles to assign.');
  });

  it('names the group from the bundle when the step gives it no label', async () => {
    const wrapper: VueWrapper = await mountRoles(withRoles(rolesStep.data!.additionalData!['roleOptions']));

    expect(wrapper.get('fieldset').attributes('aria-label')).toBe('Select roles');
  });
});

describe('InviteToOrganizationUnit (vue)', () => {
  beforeEach(() => {
    mocks.thunderID.endpoints = undefined;
    mocks.thunderID.http.request.mockReset().mockResolvedValue({
      data: {data: {components: []}, executionId: 'exec-1', flowStatus: 'INCOMPLETE'},
    });
  });

  it('starts the flow by ID with the signed-in user’s requests to the flow execution endpoint', async () => {
    mount(InviteToOrganizationUnit, {global: {provide: providers()}, props: {flowId: 'flow-1'}});
    await settle();

    expect(mocks.thunderID.http.request).toHaveBeenCalledTimes(1);
    expect(mocks.thunderID.http.request).toHaveBeenCalledWith(
      expect.objectContaining({
        data: {flowId: 'flow-1', verbose: true},
        method: 'POST',
        url: 'https://thunder.example/flow/execute',
      }),
    );
  });

  it('honours the flowExecute endpoint override', async () => {
    mocks.thunderID.endpoints = {flowExecute: 'https://resources.example/flow/execute'};

    mount(InviteToOrganizationUnit, {global: {provide: providers()}, props: {flowId: 'flow-1'}});
    await settle();

    expect(mocks.thunderID.http.request).toHaveBeenCalledWith(
      expect.objectContaining({url: 'https://resources.example/flow/execute'}),
    );
  });
});
