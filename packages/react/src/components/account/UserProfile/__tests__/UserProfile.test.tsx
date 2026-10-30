// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {cleanup, fireEvent, render, screen, waitFor, within} from '@testing-library/react';
import {AttributeSchema, User} from '@thunderid/browser';
import {afterEach, beforeEach, describe, expect, it, Mock, vi} from 'vitest';
import I18nProvider from '../../../../contexts/I18n/I18nProvider';
import ThemeProvider from '../../../../contexts/Theme/ThemeProvider';
import ThunderIDContext, {ThunderIDContextProps} from '../../../../contexts/ThunderID/ThunderIDContext';
import UserContext, {UserContextProps} from '../../../../contexts/User/UserContext';
import UserProfile, {UserProfileProps} from '../UserProfile';

const mockExecute = vi.fn() as Mock;
const mockRevalidateProfile = vi.fn() as Mock;

vi.mock('../../../../api/auth/executeEmbeddedSelfServiceFlow', () => ({
  default: (...args: unknown[]): unknown => mockExecute(...args) as unknown,
}));

const thunderIDContext: ThunderIDContextProps = {
  baseUrl: 'https://localhost:8090',
  instanceId: 0,
  isInitialized: true,
  isLoading: false,
  meta: null,
  vendor: 'thunderid',
} as unknown as ThunderIDContextProps;

const userSchema: Record<string, AttributeSchema> = {
  email: {displayName: 'Email', type: 'email'},
  given_name: {displayName: 'First name', type: 'string'},
};

const attributes: Record<string, unknown> = {email: 'alex@example.com', given_name: 'Alex'};
const profile: User = {attributes, id: 'user-1', ...attributes, verifiedAttributes: {}};

const renderUserProfile = (props: UserProfileProps = {}): ReturnType<typeof render> =>
  render(
    <ThunderIDContext.Provider value={thunderIDContext}>
      <UserContext.Provider
        value={
          {
            flattenedProfile: profile,
            onUpdateProfile: vi.fn(),
            profile,
            revalidateProfile: mockRevalidateProfile,
            updateProfile: vi.fn(),
            userSchema,
          } as unknown as UserContextProps
        }
      >
        <I18nProvider>
          <ThemeProvider>
            <UserProfile {...props} />
          </ThemeProvider>
        </I18nProvider>
      </UserContext.Provider>
    </ThunderIDContext.Provider>,
  );

// The row of a field: its label, value, status, actions and verification panel.
const row = (label: string): HTMLElement => {
  const labelElement: HTMLElement = screen.getAllByText(label).find((el: HTMLElement) => el.tagName === 'SPAN')!;
  return labelElement.parentElement!.parentElement!.parentElement!;
};

describe('UserProfile verification', () => {
  beforeEach(() => {
    mockExecute.mockReset();
    mockRevalidateProfile.mockReset().mockResolvedValue(undefined);
  });

  afterEach(() => {
    cleanup();
  });

  it('offers Verify for the email only, not for a first name', () => {
    renderUserProfile();

    expect(within(row('Email')).getByText('Verify')).toBeTruthy();
    expect(within(row('First name')).queryByText('Verify')).toBeNull();
    expect(mockExecute).not.toHaveBeenCalled();
  });

  it('verifies the email through the self attribute verification flow and re-reads the profile', async () => {
    mockExecute.mockResolvedValue({executionId: 'exec-1', flowStatus: 'COMPLETE'});
    renderUserProfile();

    fireEvent.click(within(row('Email')).getByText('Verify'));

    await waitFor(() => expect(mockExecute).toHaveBeenCalledTimes(1));
    expect(mockExecute).toHaveBeenCalledWith(
      expect.objectContaining({
        payload: {
          flowType: 'SELF_SERVICE',
          handle: 'default-self-attribute-verification-flow',
          inputs: {attribute: 'email'},
        },
      }),
    );
    expect(await screen.findByText('Email verified.')).toBeTruthy();
    expect(mockRevalidateProfile).toHaveBeenCalledTimes(1);
  });

  it('starts the flow the app names by verificationFlowHandle', async () => {
    renderUserProfile({verificationFlowHandle: 'email-link-verification'});

    fireEvent.click(within(row('Email')).getByText('Verify'));

    await waitFor(() => expect(mockExecute).toHaveBeenCalledTimes(1));
    expect(mockExecute).toHaveBeenCalledWith(
      expect.objectContaining({
        payload: {flowType: 'SELF_SERVICE', handle: 'email-link-verification', inputs: {attribute: 'email'}},
      }),
    );
  });

  it('re-reads the profile and closes the panel when Done is selected after a link is sent', async () => {
    mockExecute.mockResolvedValue({
      data: {additionalData: {maskedDestination: 'a•••@example.com'}, components: []},
      executionId: 'exec-1',
      flowStatus: 'INCOMPLETE',
    });
    renderUserProfile();

    fireEvent.click(within(row('Email')).getByText('Verify'));
    fireEvent.click(await screen.findByText('Done'));

    expect(mockRevalidateProfile).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(screen.queryByText('Done')).toBeNull());
    expect(mockExecute).toHaveBeenCalledTimes(1);
  });

  it('offers no Verify when the profile is not editable', () => {
    renderUserProfile({editable: false});

    expect(within(row('Email')).getByText('Unverified')).toBeTruthy();
    expect(screen.queryByText('Verify')).toBeNull();
  });
});
