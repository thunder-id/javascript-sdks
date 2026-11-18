// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {cleanup, fireEvent, render, screen, waitFor} from '@testing-library/react';
import {Mock, afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import I18nProvider from '../../../../contexts/I18n/I18nProvider';
import ThemeProvider from '../../../../contexts/Theme/ThemeProvider';
import ThunderIDContext, {ThunderIDContextProps} from '../../../../contexts/ThunderID/ThunderIDContext';
import UserContext, {UserContextProps} from '../../../../contexts/User/UserContext';
import ChangeCredential from '../ChangeCredential';

const mockUpdateMeCredentials = vi.fn() as Mock;

vi.mock('../../../../api/account/updateMeCredentials', () => ({
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

const renderChangeCredential = (
  props: Record<string, unknown> = {},
  userContext: UserContextProps = buildUserContext(),
) =>
  render(
    <ThunderIDContext.Provider value={thunderIDContext}>
      <UserContext.Provider value={userContext}>
        <I18nProvider>
          <ThemeProvider>
            <ChangeCredential {...props} />
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

// Queried by type rather than by label text, since the label's default text now varies with
// attribute (e.g. "Update Password" vs "Update Pin").
const submitButton = (): HTMLButtonElement => document.querySelector<HTMLButtonElement>('button[type="submit"]')!;

describe('ChangeCredential', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it('renders the current value, new value and confirmation fields', () => {
    renderChangeCredential();

    expect(fieldByName('currentPassword')).toBeTruthy();
    expect(fieldByName('newPassword')).toBeTruthy();
    expect(fieldByName('confirmPassword')).toBeTruthy();
  });

  it('marks the fields for password managers', () => {
    renderChangeCredential();

    expect(fieldByName('currentPassword').getAttribute('autocomplete')).toBe('current-password');
    expect(fieldByName('newPassword').getAttribute('autocomplete')).toBe('new-password');
    expect(fieldByName('confirmPassword').getAttribute('autocomplete')).toBe('new-password');
  });

  it('updates the requirement checklist as the user types', () => {
    renderChangeCredential({policy: {regex: '^(?=.*\\d).{8,}$'}});

    const isPassed = (): string | null =>
      document.querySelector('li[data-passed]')?.getAttribute('data-passed') ?? null;

    expect(isPassed()).toBe('false');

    setField('newPassword', 'longenough');
    expect(isPassed()).toBe('false');

    setField('newPassword', 'longenough1');
    expect(isPassed()).toBe('true');
  });

  it('keeps submit disabled until every rule passes and the confirmation matches', () => {
    renderChangeCredential({policy: {regex: '^.{8,}$'}});

    expect(submitButton().disabled).toBe(true);

    setField('newPassword', 'sh0rt');
    setField('confirmPassword', 'sh0rt');
    expect(submitButton().disabled).toBe(true);

    setField('newPassword', 'longenough1');
    setField('confirmPassword', 'longenough1');
    expect(submitButton().disabled).toBe(false);
  });

  it('does not submit when the confirmation does not match', () => {
    renderChangeCredential({policy: {regex: '^.{8,}$'}});

    setField('newPassword', 'longenough1');
    setField('confirmPassword', 'different99');

    expect(submitButton().disabled).toBe(true);
    expect(mockUpdateMeCredentials).not.toHaveBeenCalled();
  });

  it('sends the current and new values for password by default', async () => {
    mockUpdateMeCredentials.mockResolvedValueOnce(undefined);
    renderChangeCredential({policy: {regex: '^.{8,}$'}});

    setField('currentPassword', '0ldP@ssword');
    setField('newPassword', 'n3wP@ssword');
    setField('confirmPassword', 'n3wP@ssword');
    fireEvent.click(submitButton());

    await waitFor(() => expect(mockUpdateMeCredentials).toHaveBeenCalledTimes(1));

    expect(mockUpdateMeCredentials).toHaveBeenCalledWith(
      expect.objectContaining({
        baseUrl: 'https://localhost:8090',
        payload: {currentValue: '0ldP@ssword', name: 'password', newValue: 'n3wP@ssword'},
      }),
    );
  });

  it('names the attribute and leaves out a blank current value', async () => {
    mockUpdateMeCredentials.mockResolvedValueOnce(undefined);
    renderChangeCredential({attribute: 'pin', policy: {regex: '^.{4,}$'}});

    setField('newPassword', '1234');
    setField('confirmPassword', '1234');
    fireEvent.click(submitButton());

    await waitFor(() => expect(mockUpdateMeCredentials).toHaveBeenCalledTimes(1));

    expect(mockUpdateMeCredentials).toHaveBeenCalledWith(
      expect.objectContaining({
        payload: {currentValue: undefined, name: 'pin', newValue: '1234'},
      }),
    );
  });

  it('shows the success alert and fires onSuccess', async () => {
    mockUpdateMeCredentials.mockResolvedValueOnce(undefined);
    const onSuccess = vi.fn();
    renderChangeCredential({onSuccess, policy: {regex: '^.{8,}$'}});

    setField('newPassword', 'n3wP@ssword');
    setField('confirmPassword', 'n3wP@ssword');
    fireEvent.click(submitButton());

    await waitFor(() => expect(onSuccess).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(screen.getByText(/your password has been updated/i)).toBeTruthy());
  });

  it('clears the entered passwords after a successful change', async () => {
    mockUpdateMeCredentials.mockResolvedValueOnce(undefined);
    renderChangeCredential({policy: {regex: '^.{8,}$'}});

    setField('currentPassword', '0ldP@ssword');
    setField('newPassword', 'n3wP@ssword');
    setField('confirmPassword', 'n3wP@ssword');
    fireEvent.click(submitButton());

    await waitFor(() => expect(fieldByName('newPassword').value).toBe(''));

    expect(fieldByName('currentPassword').value).toBe('');
    expect(fieldByName('confirmPassword').value).toBe('');
  });

  it('surfaces a wrong current value onto the current password field', async () => {
    const {ThunderIDAPIError} = await import('@thunderid/browser');

    mockUpdateMeCredentials.mockRejectedValueOnce(
      new ThunderIDAPIError(
        JSON.stringify({code: 'USR-1047', message: {defaultValue: 'Invalid current credential'}}),
        'x-003',
        'react',
        403,
        'Forbidden',
      ),
    );
    renderChangeCredential({policy: {regex: '^.{8,}$'}});

    setField('currentPassword', 'Wr0ngP@ss');
    setField('newPassword', 'n3wP@ssword');
    setField('confirmPassword', 'n3wP@ssword');
    fireEvent.click(submitButton());

    await waitFor(() => expect(screen.getByText(/your current password is incorrect/i)).toBeTruthy());
  });

  it('surfaces a 400 onto the new password field', async () => {
    const {ThunderIDAPIError} = await import('@thunderid/browser');

    mockUpdateMeCredentials.mockRejectedValueOnce(
      new ThunderIDAPIError('Password is too common', 'x-001', 'react', 400, 'Bad Request'),
    );
    renderChangeCredential({policy: {regex: '^.{8,}$'}});

    setField('newPassword', 'n3wP@ssword');
    setField('confirmPassword', 'n3wP@ssword');
    fireEvent.click(submitButton());

    await waitFor(() => expect(screen.getByText(/password is too common/i)).toBeTruthy());
  });

  it('surfaces an unmapped failure as a form-level error', async () => {
    const {ThunderIDAPIError} = await import('@thunderid/browser');

    mockUpdateMeCredentials.mockRejectedValueOnce(
      new ThunderIDAPIError('Server exploded', 'x-002', 'react', 500, 'Internal Server Error'),
    );
    renderChangeCredential({policy: {regex: '^.{8,}$'}});

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

    renderChangeCredential({}, userContext);

    setField('newPassword', 'Str0ng!Pass');

    // The schema regex is the whole policy; no SDK-side rules are layered alongside it.
    const items: NodeListOf<Element> = document.querySelectorAll('li[data-passed]');
    expect(items.length).toBe(1);
    expect(items[0].getAttribute('data-passed')).toBe('false');
  });

  it('derives the policy from a non-password credential attribute', () => {
    const userContext: UserContextProps = buildUserContext({
      userSchema: {
        pin: {credential: true, regex: '^\\d{4}$', type: 'string'},
      },
    });

    renderChangeCredential({attribute: 'pin'}, userContext);

    setField('newPassword', '12');

    const items: NodeListOf<Element> = document.querySelectorAll('li[data-passed]');
    expect(items.length).toBe(1);
    expect(items[0].getAttribute('data-passed')).toBe('false');
  });

  it('applies no client-side rules when the schema has no password regex', () => {
    renderChangeCredential({}, buildUserContext({userSchema: {password: {credential: true, type: 'string'}}}));

    setField('newPassword', 'x');

    expect(document.querySelectorAll('li[data-passed]').length).toBe(0);
  });

  describe('when the schema defines no password attribute', () => {
    const schemaWithoutPassword = {email: {type: 'string'}, pin: {credential: true, type: 'string'}};

    it('explains why the form is unusable instead of rendering nothing', () => {
      renderChangeCredential({}, buildUserContext({userSchema: schemaWithoutPassword}));

      expect(screen.getByRole('status')).toBeTruthy();
      expect(screen.getByText(/password changes unavailable/i)).toBeTruthy();
    });

    it('still renders the form so the overlay has something to sit on', () => {
      renderChangeCredential({}, buildUserContext({userSchema: schemaWithoutPassword}));

      expect(fieldByName('newPassword')).toBeTruthy();
    });

    it('disables every control so nothing is reachable behind the overlay', () => {
      renderChangeCredential({}, buildUserContext({userSchema: schemaWithoutPassword}));

      expect(fieldByName('currentPassword').disabled).toBe(true);
      expect(fieldByName('newPassword').disabled).toBe(true);
      expect(fieldByName('confirmPassword').disabled).toBe(true);
      // Queried through the DOM rather than by role: the blurred form is aria-hidden, so an
      // accessible-role lookup correctly cannot reach it.
      expect(document.querySelector<HTMLButtonElement>('button[type="submit"]')!.disabled).toBe(true);
    });

    it('never writes credentials even if a submit is forced through', () => {
      renderChangeCredential({}, buildUserContext({userSchema: schemaWithoutPassword}));

      fireEvent.submit(document.querySelector('form')!);

      expect(mockUpdateMeCredentials).not.toHaveBeenCalled();
    });

    it('renders the usable form when the schema does define a password', () => {
      renderChangeCredential({}, buildUserContext({userSchema: {password: {credential: true, type: 'string'}}}));

      expect(screen.queryByRole('status')).toBeNull();
      expect(fieldByName('newPassword').disabled).toBe(false);
    });

    it('is available when attribute points at a declared non-password credential', () => {
      renderChangeCredential({attribute: 'pin'}, buildUserContext({userSchema: schemaWithoutPassword}));

      expect(screen.queryByRole('status')).toBeNull();
      expect(fieldByName('newPassword').disabled).toBe(false);
    });

    it('shows a generic contact-administrator message rather than naming the credential', () => {
      renderChangeCredential({}, buildUserContext({userSchema: schemaWithoutPassword}));

      expect(screen.getByText(/contact your administrator/i)).toBeTruthy();
    });
  });

  it('takes the display name from the schema rather than title-casing the attribute', () => {
    const userContext: UserContextProps = buildUserContext({
      userSchema: {
        pin: {credential: true, displayName: 'Security PIN', type: 'string'},
      },
    });

    renderChangeCredential({attribute: 'pin'}, userContext);

    expect(screen.getByText('Change Security PIN')).toBeTruthy();
  });

  it('falls back to title-casing the attribute when the schema has no displayName', () => {
    const userContext: UserContextProps = buildUserContext({
      userSchema: {
        pin: {credential: true, type: 'string'},
      },
    });

    renderChangeCredential({attribute: 'pin'}, userContext);

    expect(screen.getByText('Change Pin')).toBeTruthy();
  });

  it('overrides the default heading when title is set', () => {
    renderChangeCredential({title: 'Update your PIN'});

    expect(screen.getByText('Update your PIN')).toBeTruthy();
    expect(screen.queryByText('Change Password')).toBeNull();
  });

  it('omits the heading entirely when title is an empty string', () => {
    renderChangeCredential({title: ''});

    expect(screen.queryByText('Change Password')).toBeNull();
  });
});
