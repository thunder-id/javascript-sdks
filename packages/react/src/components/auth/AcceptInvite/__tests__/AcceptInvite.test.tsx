// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {cleanup, fireEvent, render, screen, waitFor} from '@testing-library/react';
import {createTheme} from '@thunderid/browser';
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import {initiateOAuthRedirect} from '../../../../utils/oauth';
import AcceptInvite from '../AcceptInvite';
import BaseAcceptInvite, {AcceptInviteFlowResponse} from '../BaseAcceptInvite';

const sdk: {baseUrl?: string; endpoints?: Record<string, string>} = {};

vi.mock('../../../../contexts/Theme/useTheme', () => ({default: () => ({colorScheme: 'light', theme: createTheme()})}));
vi.mock('../../../../contexts/ThunderID/useThunderID', () => ({
  default: () => ({
    baseUrl: sdk.baseUrl,
    endpoints: sdk.endpoints,
    getStorageManager: vi.fn(() => Promise.resolve(undefined)),
    isInitialized: true,
    meta: null,
    vendor: 'thunderid',
  }),
}));
// Translates the invitation namespace, so a label left as a template is visible in the output.
vi.mock('../../../../hooks/useTranslation', () => ({
  default: () => ({t: (key: string): string => (key.startsWith('invitation') ? `[${key}]` : key)}),
}));
vi.mock('../../../../utils/oauth', () => ({initiateOAuthRedirect: vi.fn()}));

const STORAGE_KEY = 'thunderid_execution_id';

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

describe('AcceptInvite', () => {
  beforeEach(() => {
    sdk.baseUrl = 'https://ids.example';
    sdk.endpoints = undefined;
    sessionStorage.clear();
  });
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  it("sends the steps to the provider's server when given no baseUrl", async () => {
    const fetchMock = vi.fn().mockResolvedValue(okJson(acceptStep));
    vi.stubGlobal('fetch', fetchMock);

    render(<AcceptInvite executionId="exec-1" inviteToken="token-1" />);

    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    expect(fetchMock.mock.calls[0][0]).toBe('https://ids.example/flow/execute');
  });

  it('honours the flowExecute endpoint override', async () => {
    sdk.endpoints = {flowExecute: 'https://rs.example/api/flow/execute'};
    const fetchMock = vi.fn().mockResolvedValue(okJson(acceptStep));
    vi.stubGlobal('fetch', fetchMock);

    render(<AcceptInvite executionId="exec-1" inviteToken="token-1" />);

    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    expect(fetchMock.mock.calls[0][0]).toBe('https://rs.example/api/flow/execute');
  });

  it('prefers the baseUrl prop', async () => {
    const fetchMock = vi.fn().mockResolvedValue(okJson(acceptStep));
    vi.stubGlobal('fetch', fetchMock);

    render(<AcceptInvite baseUrl="https://gate.example" executionId="exec-1" inviteToken="token-1" />);

    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    expect(fetchMock.mock.calls[0][0]).toBe('https://gate.example/flow/execute');
  });
});

describe('BaseAcceptInvite built-in UI', () => {
  beforeEach(() => sessionStorage.clear());
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("translates the flow's headings and labels", async () => {
    render(
      <BaseAcceptInvite executionId="exec-1" inviteToken="token-1" onSubmit={vi.fn().mockResolvedValue(acceptStep)} />,
    );

    await screen.findByText(/\[invitation[.:]forms[.:]accept[.:]title\]/);
    expect(
      screen.getByRole('button', {name: /\[invitation[.:]forms[.:]accept[.:]actions[.:]accept[.:]label\]/}),
    ).toBeTruthy();
    expect(document.body.textContent).not.toContain('{{');
  });

  it('tags the step elements with the flow test IDs', async () => {
    const {container} = render(
      <BaseAcceptInvite executionId="exec-1" inviteToken="token-1" onSubmit={vi.fn().mockResolvedValue(detailsStep)} />,
    );

    await waitFor(() => expect(container.querySelector('[data-testid="thunderid-field-username"]')).not.toBeNull());
    expect(container.querySelector('[data-testid="thunderid-field-password"]')).not.toBeNull();
    expect(container.querySelector('[data-testid="thunderid-action-action_user_details"]')).not.toBeNull();
  });

  it('calls onComplete when the invitee joins, and shows the completion step', async () => {
    const onComplete = vi.fn();
    const onSubmit = vi.fn().mockResolvedValueOnce(detailsStep).mockResolvedValueOnce(joinedStep);
    const {container} = render(
      <BaseAcceptInvite executionId="exec-1" inviteToken="token-1" onComplete={onComplete} onSubmit={onSubmit} />,
    );

    await waitFor(() => expect(container.querySelector('input[name="username"]')).not.toBeNull());
    fireEvent.change(container.querySelector('input[name="username"]')!, {target: {value: 'invitee'}});
    fireEvent.change(container.querySelector('input[name="password"]')!, {target: {value: 'Secret-pw1!'}});
    fireEvent.click(container.querySelector('[data-testid="thunderid-action-action_user_details"]')!);

    await waitFor(() => expect(onComplete).toHaveBeenCalledTimes(1));
    expect(await screen.findByText(/\[invitation[.:]forms[.:]complete[.:]description\]/)).toBeTruthy();
  });

  it('keeps no execution ID in session storage while no redirect is under way', async () => {
    render(
      <BaseAcceptInvite executionId="exec-1" inviteToken="token-1" onSubmit={vi.fn().mockResolvedValue(acceptStep)} />,
    );

    await screen.findByRole('button', {name: /accept[.:]actions[.:]accept[.:]label/});
    expect(sessionStorage.getItem(STORAGE_KEY)).toBeNull();
  });

  it('keeps the execution ID for the callback of a redirect, and drops it when the flow completes', async () => {
    const redirect: AcceptInviteFlowResponse = {
      data: {redirectURL: 'https://idp.example/authorize'},
      executionId: 'exec-1',
      flowStatus: 'INCOMPLETE',
      type: 'REDIRECTION',
    };
    const onSubmit = vi.fn().mockResolvedValueOnce(acceptStep).mockResolvedValueOnce(redirect);
    render(<BaseAcceptInvite executionId="exec-1" inviteToken="token-1" onSubmit={onSubmit} />);

    fireEvent.click(await screen.findByRole('button', {name: /accept[.:]label/}));

    await waitFor(() => expect(initiateOAuthRedirect).toHaveBeenCalled());
    expect(sessionStorage.getItem(STORAGE_KEY)).toBe('exec-1');

    cleanup();
    const done = vi.fn().mockResolvedValueOnce(detailsStep).mockResolvedValueOnce(joinedStep);
    const {container} = render(<BaseAcceptInvite executionId="exec-1" inviteToken="token-1" onSubmit={done} />);
    await waitFor(() => expect(container.querySelector('input[name="username"]')).not.toBeNull());
    fireEvent.change(container.querySelector('input[name="username"]')!, {target: {value: 'invitee'}});
    fireEvent.change(container.querySelector('input[name="password"]')!, {target: {value: 'Secret-pw1!'}});
    fireEvent.click(container.querySelector('[data-testid="thunderid-action-action_user_details"]')!);

    await screen.findByText(/\[invitation[.:]forms[.:]complete[.:]description\]/);
    expect(sessionStorage.getItem(STORAGE_KEY)).toBeNull();
  });
});
