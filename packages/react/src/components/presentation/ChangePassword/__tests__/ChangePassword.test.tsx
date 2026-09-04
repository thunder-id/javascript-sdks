// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {cleanup, fireEvent, render, screen, waitFor} from '@testing-library/react';
import {Mock, afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import I18nProvider from '../../../../contexts/I18n/I18nProvider';
import ThemeProvider from '../../../../contexts/Theme/ThemeProvider';
import ThunderIDContext, {ThunderIDContextProps} from '../../../../contexts/ThunderID/ThunderIDContext';
import UserContext, {UserContextProps} from '../../../../contexts/User/UserContext';
import ChangePassword from '../ChangePassword';

const mockUpdateMeCredentials = vi.fn() as Mock;

vi.mock('../../../../api/updateMeCredentials', () => ({
  default: (...args: unknown[]): unknown => mockUpdateMeCredentials(...args) as unknown,
}));

const thunderIDContext: ThunderIDContextProps = {
  baseUrl: 'https://localhost:8090',
  instanceId: 0,
  isInitialized: true,
  isLoading: false,
  vendor: 'thunderid',
} as unknown as ThunderIDContextProps;

const buildUserContext = (overrides: Partial<UserContextProps> = {}): UserContextProps =>
  ({
    flattenedProfile: null,
    onUpdateProfile: vi.fn(),
    profile: null,
    revalidateProfile: vi.fn(),
    updateProfile: vi.fn(),
    userSchema: null,
    ...overrides,
  }) as unknown as UserContextProps;

const renderChangePassword = (
  props: Record<string, unknown> = {},
  userContext: UserContextProps = buildUserContext(),
) =>
  render(
    <ThunderIDContext.Provider value={thunderIDContext}>
      <UserContext.Provider value={userContext}>
        <I18nProvider>
          <ThemeProvider>
            <ChangePassword {...props} />
          </ThemeProvider>
        </I18nProvider>
      </UserContext.Provider>
    </ThunderIDContext.Provider>,
  );

const fieldByName = (name: string): HTMLInputElement =>
  document.querySelector<HTMLInputElement>(`input[name="${name}"]`)!;

const setField = (name: string, value: string): void => {
  fireEvent.change(fieldByName(name), {target: {value}});
};

const submitButton = (): HTMLButtonElement => screen.getByRole<HTMLButtonElement>('button', {name: /update password/i});

describe('ChangePassword', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it('renders the three fields by default', () => {
    renderChangePassword();

    expect(fieldByName('currentPassword')).toBeTruthy();
    expect(fieldByName('newPassword')).toBeTruthy();
    expect(fieldByName('confirmPassword')).toBeTruthy();
  });

  it('marks the new password fields as new-password for password managers', () => {
    renderChangePassword();

    expect(fieldByName('currentPassword').getAttribute('autocomplete')).toBe('current-password');
    expect(fieldByName('newPassword').getAttribute('autocomplete')).toBe('new-password');
    expect(fieldByName('confirmPassword').getAttribute('autocomplete')).toBe('new-password');
  });

  it('updates the requirement checklist as the user types', () => {
    renderChangePassword({policy: {regex: '^(?=.*\\d).{8,}$'}});

    const isPassed = (): string | null =>
      document.querySelector('li[data-passed]')?.getAttribute('data-passed') ?? null;

    expect(isPassed()).toBe('false');

    setField('newPassword', 'longenough');
    expect(isPassed()).toBe('false');

    setField('newPassword', 'longenough1');
    expect(isPassed()).toBe('true');
  });

  it('keeps submit disabled until every rule passes and the confirmation matches', () => {
    renderChangePassword({policy: {regex: '^.{8,}$'}});

    expect(submitButton().disabled).toBe(true);

    setField('currentPassword', '0ldP@ssword!');
    setField('newPassword', 'sh0rt');
    setField('confirmPassword', 'sh0rt');
    expect(submitButton().disabled).toBe(true);

    setField('newPassword', 'longenough1');
    setField('confirmPassword', 'longenough1');
    expect(submitButton().disabled).toBe(false);
  });

  it('does not submit when the confirmation does not match', () => {
    renderChangePassword({policy: {regex: '^.{8,}$'}});

    setField('currentPassword', '0ldP@ssword!');
    setField('newPassword', 'longenough1');
    setField('confirmPassword', 'different99');

    expect(submitButton().disabled).toBe(true);
    expect(mockUpdateMeCredentials).not.toHaveBeenCalled();
  });

  it('blocks reusing the current password as the new one', () => {
    renderChangePassword({policy: {regex: '^.{8,}$'}});

    setField('currentPassword', 'longenough1');
    setField('newPassword', 'longenough1');
    setField('confirmPassword', 'longenough1');

    expect(submitButton().disabled).toBe(true);
  });

  it('sends the current password alongside the new one', async () => {
    mockUpdateMeCredentials.mockResolvedValueOnce(undefined);
    renderChangePassword({policy: {regex: '^.{8,}$'}});

    setField('currentPassword', '0ldP@ssword!');
    setField('newPassword', 'n3wP@ssword');
    setField('confirmPassword', 'n3wP@ssword');
    fireEvent.click(submitButton());

    await waitFor(() => expect(mockUpdateMeCredentials).toHaveBeenCalledTimes(1));

    expect(mockUpdateMeCredentials).toHaveBeenCalledWith(
      expect.objectContaining({
        baseUrl: 'https://localhost:8090',
        currentPassword: '0ldP@ssword!',
        payload: {password: 'n3wP@ssword'},
      }),
    );
  });

  it('shows the success alert and fires onSuccess', async () => {
    mockUpdateMeCredentials.mockResolvedValueOnce(undefined);
    const onSuccess = vi.fn();
    renderChangePassword({onSuccess, policy: {regex: '^.{8,}$'}});

    setField('currentPassword', '0ldP@ssword!');
    setField('newPassword', 'n3wP@ssword');
    setField('confirmPassword', 'n3wP@ssword');
    fireEvent.click(submitButton());

    await waitFor(() => expect(onSuccess).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(screen.getByText(/your password has been updated/i)).toBeTruthy());
  });

  it('clears the entered passwords after a successful change', async () => {
    mockUpdateMeCredentials.mockResolvedValueOnce(undefined);
    renderChangePassword({policy: {regex: '^.{8,}$'}});

    setField('currentPassword', '0ldP@ssword!');
    setField('newPassword', 'n3wP@ssword');
    setField('confirmPassword', 'n3wP@ssword');
    fireEvent.click(submitButton());

    await waitFor(() => expect(fieldByName('newPassword').value).toBe(''));

    expect(fieldByName('currentPassword').value).toBe('');
    expect(fieldByName('confirmPassword').value).toBe('');
  });

  it('maps a 403 onto the current password field', async () => {
    const {ThunderIDAPIError} = await import('@thunderid/browser');

    mockUpdateMeCredentials.mockRejectedValueOnce(
      new ThunderIDAPIError('Invalid current password', 'x-001', 'react', 403, 'Forbidden'),
    );
    renderChangePassword({policy: {regex: '^.{8,}$'}});

    setField('currentPassword', 'wrong-but-long');
    setField('newPassword', 'n3wP@ssword');
    setField('confirmPassword', 'n3wP@ssword');
    fireEvent.click(submitButton());

    await waitFor(() => expect(screen.getByText(/your current password is incorrect/i)).toBeTruthy());
  });

  it('surfaces an unmapped failure as a form-level error', async () => {
    const {ThunderIDAPIError} = await import('@thunderid/browser');

    mockUpdateMeCredentials.mockRejectedValueOnce(
      new ThunderIDAPIError('Server exploded', 'x-002', 'react', 500, 'Internal Server Error'),
    );
    renderChangePassword({policy: {regex: '^.{8,}$'}});

    setField('currentPassword', '0ldP@ssword!');
    setField('newPassword', 'n3wP@ssword');
    setField('confirmPassword', 'n3wP@ssword');
    fireEvent.click(submitButton());

    await waitFor(() => expect(screen.getByText(/server exploded/i)).toBeTruthy());
  });

  it('derives the policy regex from the user schema', () => {
    const userContext: UserContextProps = buildUserContext({
      userSchema: {
        password: {credential: true, regex: '^[a-z]+$', type: 'string'},
      },
    });

    renderChangePassword({}, userContext);

    setField('newPassword', 'Str0ng!Pass');

    // The schema regex is the whole policy; no SDK-side rules are layered alongside it.
    const items: NodeListOf<Element> = document.querySelectorAll('li[data-passed]');
    expect(items.length).toBe(1);
    expect(items[0].getAttribute('data-passed')).toBe('false');
  });

  it('applies no client-side rules when the schema has no password regex', () => {
    renderChangePassword({}, buildUserContext({userSchema: {password: {credential: true, type: 'string'}}}));

    setField('newPassword', 'x');

    expect(document.querySelectorAll('li[data-passed]').length).toBe(0);
  });

  describe('when the schema defines no password attribute', () => {
    const schemaWithoutPassword = {email: {type: 'string'}, pin: {credential: true, type: 'string'}};

    it('explains why the form is unusable instead of rendering nothing', () => {
      renderChangePassword({}, buildUserContext({userSchema: schemaWithoutPassword}));

      expect(screen.getByRole('status')).toBeTruthy();
      expect(screen.getByText(/password changes unavailable/i)).toBeTruthy();
    });

    it('still renders the form so the overlay has something to sit on', () => {
      renderChangePassword({}, buildUserContext({userSchema: schemaWithoutPassword}));

      expect(fieldByName('newPassword')).toBeTruthy();
    });

    it('disables every control so nothing is reachable behind the overlay', () => {
      renderChangePassword({}, buildUserContext({userSchema: schemaWithoutPassword}));

      expect(fieldByName('currentPassword').disabled).toBe(true);
      expect(fieldByName('newPassword').disabled).toBe(true);
      expect(fieldByName('confirmPassword').disabled).toBe(true);
      // Queried through the DOM rather than by role: the blurred form is aria-hidden, so an
      // accessible-role lookup correctly cannot reach it.
      expect(document.querySelector<HTMLButtonElement>('button[type="submit"]')!.disabled).toBe(true);
    });

    it('never writes credentials even if a submit is forced through', () => {
      renderChangePassword({}, buildUserContext({userSchema: schemaWithoutPassword}));

      fireEvent.submit(document.querySelector('form')!);

      expect(mockUpdateMeCredentials).not.toHaveBeenCalled();
    });

    it('renders the usable form when the schema does define a password', () => {
      renderChangePassword({}, buildUserContext({userSchema: {password: {credential: true, type: 'string'}}}));

      expect(screen.queryByRole('status')).toBeNull();
      expect(fieldByName('newPassword').disabled).toBe(false);
    });
  });
});
