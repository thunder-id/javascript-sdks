// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {act, cleanup, fireEvent, render, screen, waitFor} from '@testing-library/react';
import {createTheme, EmbeddedFlowComponent, EmbeddedFlowComponentType, EmbeddedFlowEventType} from '@thunderid/browser';
import {afterEach, describe, expect, it, vi} from 'vitest';
import {InviteUserFlowResponse} from '../../../../hooks/auth/useInviteFlow';
import BaseInviteToOrganizationUnit, {BaseInviteToOrganizationUnitRenderProps} from '../BaseInviteToOrganizationUnit';

vi.mock('../../../../contexts/Theme/useTheme', () => ({default: () => ({colorScheme: 'light', theme: createTheme()})}));
vi.mock('../../../../contexts/ThunderID/useThunderID', () => ({
  default: () => ({getStorageManager: vi.fn(), isInitialized: true, meta: null}),
}));
vi.mock('../../../../hooks/useTranslation', () => ({
  default: () => ({t: (key: string): string => key}),
}));

const submit = (id: string, label: string): EmbeddedFlowComponent => ({
  eventType: EmbeddedFlowEventType.Submit,
  id,
  label,
  type: EmbeddedFlowComponentType.Action,
  variant: 'PRIMARY',
});
const block = (...components: EmbeddedFlowComponent[]): EmbeddedFlowComponent => ({
  components,
  id: 'block',
  type: EmbeddedFlowComponentType.Block,
});

// The invitation template's steps, as the server returns them.
const emailStep: InviteUserFlowResponse = {
  challengeToken: 'challenge-1',
  data: {
    components: [
      {id: 'heading', label: 'Invite a member', type: EmbeddedFlowComponentType.Text, variant: 'HEADING_1'},
      block(
        {id: 'input_prompt_email', label: 'Email', ref: 'email', required: true, type: 'EMAIL_INPUT' as never},
        submit('action_submit_email', 'Next'),
      ),
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
      block(
        {
          id: 'roles_input_new',
          label: 'Roles',
          ref: 'roles',
          required: true,
          type: EmbeddedFlowComponentType.RoleSelect,
        },
        submit('action_roles_new', 'Send invite'),
      ),
    ],
  },
  executionId: 'exec-1',
  flowStatus: 'INCOMPLETE',
};
const sentStep: InviteUserFlowResponse = {
  data: {
    components: [{id: 'invite_sent_new_message', label: 'The invitation is on its way.', type: 'TEXT' as never}],
  },
  executionId: 'exec-1',
  flowStatus: 'INCOMPLETE',
};

describe('BaseInviteToOrganizationUnit', () => {
  afterEach(cleanup);

  it('starts the invitation by its flow ID', async () => {
    const onInitialize = vi.fn().mockResolvedValue(emailStep);

    render(<BaseInviteToOrganizationUnit flowId="flow-1" onInitialize={onInitialize} onSubmit={vi.fn()} />);

    await waitFor(() => expect(onInitialize).toHaveBeenCalledTimes(1));
    expect(onInitialize).toHaveBeenCalledWith({flowId: 'flow-1', verbose: true});
    expect(await screen.findByText('Invite a member')).toBeTruthy();
  });

  it('runs the steps: the email, then the roles as space-separated IDs, then the server says it is sent', async () => {
    const onInitialize = vi.fn().mockResolvedValue(emailStep);
    const onSubmit = vi.fn().mockResolvedValueOnce(rolesStep).mockResolvedValueOnce(sentStep);

    render(<BaseInviteToOrganizationUnit flowId="flow-1" onInitialize={onInitialize} onSubmit={onSubmit} />);

    const email = await screen.findByTestId('thunderid-field-email');
    const emailInput: HTMLInputElement = (email.tagName === 'INPUT' ? email : email.querySelector('input'))!;
    fireEvent.change(emailInput, {target: {value: 'new.member@example.com'}});
    fireEvent.click(screen.getByTestId('thunderid-action-action_submit_email'));

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(onSubmit).toHaveBeenLastCalledWith({
      action: 'action_submit_email',
      challengeToken: 'challenge-1',
      executionId: 'exec-1',
      inputs: {email: 'new.member@example.com'},
      verbose: true,
    });

    expect(await screen.findByTestId('thunderid-field-roles')).toBeTruthy();
    fireEvent.click(screen.getByRole('checkbox', {name: 'Developer'}));
    fireEvent.click(screen.getByRole('checkbox', {name: 'Viewer'}));
    fireEvent.click(screen.getByTestId('thunderid-action-action_roles_new'));

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(2));
    expect(onSubmit).toHaveBeenLastCalledWith({
      action: 'action_roles_new',
      challengeToken: 'challenge-2',
      executionId: 'exec-1',
      inputs: {roles: 'r-dev r-view'},
      verbose: true,
    });
    expect(await screen.findByText('The invitation is on its way.')).toBeTruthy();
  });

  it('does not submit the roles step until a role is picked', async () => {
    const onSubmit = vi.fn();

    render(
      <BaseInviteToOrganizationUnit
        flowId="flow-1"
        onInitialize={vi.fn().mockResolvedValue(rolesStep)}
        onSubmit={onSubmit}
      />,
    );

    fireEvent.click(await screen.findByTestId('thunderid-action-action_roles_new'));

    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('hands a custom render the step and the actions to drive it', async () => {
    const onSubmit = vi.fn().mockResolvedValue(sentStep);
    let props: BaseInviteToOrganizationUnitRenderProps | undefined;

    render(
      <BaseInviteToOrganizationUnit
        flowId="flow-1"
        onInitialize={vi.fn().mockResolvedValue(rolesStep)}
        onSubmit={onSubmit}
      >
        {(renderProps: BaseInviteToOrganizationUnitRenderProps) => {
          props = renderProps;
          return <p>custom</p>;
        }}
      </BaseInviteToOrganizationUnit>,
    );

    await waitFor(() => expect(props?.executionId).toBe('exec-1'));
    expect(screen.getByText('custom')).toBeTruthy();
    expect(props?.additionalData?.['roleOptions']).toBe(rolesStep.data?.additionalData?.['roleOptions']);

    // A custom render sets the values through handleInputChange, which the step's validation reads.
    act(() => props!.handleInputChange('roles', 'r-view'));
    await waitFor(() => expect(props?.values['roles']).toBe('r-view'));
    await act(() => props!.handleSubmit({id: 'action_roles_new'}));

    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({action: 'action_roles_new', executionId: 'exec-1', inputs: {roles: 'r-view'}}),
    );
  });

  it('shows a failed start as an error', async () => {
    const onError = vi.fn();

    render(
      <BaseInviteToOrganizationUnit
        flowId="flow-1"
        onInitialize={vi.fn().mockRejectedValue(new Error('Forbidden'))}
        onSubmit={vi.fn()}
        onError={onError}
      />,
    );

    expect(await screen.findByText('Forbidden')).toBeTruthy();
    expect(screen.getByText('errors.heading')).toBeTruthy();
    expect(onError).toHaveBeenCalledWith(expect.objectContaining({message: 'Forbidden'}));
  });

  it('starts over when given another flow', async () => {
    const onInitialize = vi.fn().mockResolvedValue(emailStep);
    const {rerender} = render(
      <BaseInviteToOrganizationUnit flowId="flow-1" onInitialize={onInitialize} onSubmit={vi.fn()} />,
    );
    await waitFor(() => expect(onInitialize).toHaveBeenCalledTimes(1));

    rerender(<BaseInviteToOrganizationUnit flowId="flow-2" onInitialize={onInitialize} onSubmit={vi.fn()} />);

    await waitFor(() => expect(onInitialize).toHaveBeenCalledTimes(2));
    expect(onInitialize).toHaveBeenLastCalledWith({flowId: 'flow-2', verbose: true});
  });
});
