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
const mockReauthenticate = vi.fn() as Mock;

vi.mock('../../../../api/account/updateMeCredentials', () => ({
  default: (...args: unknown[]): unknown => mockUpdateMeCredentials(...args) as unknown,
}));

const thunderIDContext: ThunderIDContextProps = {
  baseUrl: 'https://localhost:8090',
  instanceId: 0,
  isInitialized: true,
  isLoading: false,
  reauthenticate: (...args: unknown[]): unknown => mockReauthenticate(...args) as unknown,
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

  it('renders an optional current-value field above the new value and its confirmation', () => {
    renderChangeCredential();

    expect(fieldByName('currentPassword')).toBeTruthy();
    expect(fieldByName('currentPassword').required).toBe(false);
    expect(fieldByName('newPassword')).toBeTruthy();
    expect(fieldByName('confirmPassword')).toBeTruthy();
    expect(screen.getByText(/leave this empty if you have not set one yet/i)).toBeTruthy();
  });

  it('marks the current field as current-password and the new fields as new-password', () => {
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

  it('sends the name and new value without a current value when it is left empty', async () => {
    mockUpdateMeCredentials.mockResolvedValueOnce(undefined);
    renderChangeCredential({policy: {regex: '^.{8,}$'}});

    setField('newPassword', 'n3wP@ssword');
    setField('confirmPassword', 'n3wP@ssword');
    fireEvent.click(submitButton());

    await waitFor(() => expect(mockUpdateMeCredentials).toHaveBeenCalledTimes(1));

    expect(mockUpdateMeCredentials).toHaveBeenCalledWith(
      expect.objectContaining({
        baseUrl: 'https://localhost:8090',
        payload: {currentValue: undefined, name: 'password', newValue: 'n3wP@ssword'},
      }),
    );
  });

  it('sends the current value and names the attribute when set to something other than password', async () => {
    mockUpdateMeCredentials.mockResolvedValueOnce(undefined);
    renderChangeCredential({attribute: 'pin', policy: {regex: '^.{4,}$'}});

    setField('currentPassword', '0000');
    setField('newPassword', '1234');
    setField('confirmPassword', '1234');
    fireEvent.click(submitButton());

    await waitFor(() => expect(mockUpdateMeCredentials).toHaveBeenCalledTimes(1));

    expect(mockUpdateMeCredentials).toHaveBeenCalledWith(
      expect.objectContaining({
        payload: {currentValue: '0000', name: 'pin', newValue: '1234'},
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

    setField('newPassword', 'n3wP@ssword');
    setField('confirmPassword', 'n3wP@ssword');
    fireEvent.click(submitButton());

    await waitFor(() => expect(fieldByName('newPassword').value).toBe(''));

    expect(fieldByName('currentPassword').value).toBe('');
    expect(fieldByName('confirmPassword').value).toBe('');
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

  it.each([
    ['USR-1047', 400, /enter your current password/i],
    ['USR-1048', 403, /the current password is incorrect/i],
  ])('shows %s on the current field with translated text', async (code: string, status: number, text: RegExp) => {
    const {ThunderIDAPIError} = await import('@thunderid/browser');

    mockUpdateMeCredentials.mockRejectedValueOnce(
      new ThunderIDAPIError(JSON.stringify({code, message: {defaultValue: 'Server text'}}), 'x-003', 'react', status),
    );
    renderChangeCredential({policy: {regex: '^.{8,}$'}});

    setField('currentPassword', 'wr0ngValue');
    setField('newPassword', 'n3wP@ssword');
    setField('confirmPassword', 'n3wP@ssword');
    fireEvent.click(submitButton());

    await waitFor(() => expect(screen.getByText(text)).toBeTruthy());
    expect(fieldByName('currentPassword').getAttribute('aria-invalid')).toBe('true');
    expect(screen.queryByText('Server text')).toBeNull();
  });

  it('asks the user to sign in again and hands over the challenge on AUTH-4011', async () => {
    const {StepUpRequiredError} = await import('@thunderid/browser');
    const onReauthenticationRequired = vi.fn();

    mockUpdateMeCredentials.mockRejectedValueOnce(
      new StepUpRequiredError(
        JSON.stringify({code: 'AUTH-4011', message: {defaultValue: 'Recent authentication required'}}),
        'x-004',
        'react',
        401,
        'Unauthorized',
        undefined,
        'Bearer error="insufficient_user_authentication", max_age="300"',
      ),
    );
    renderChangeCredential({attribute: 'pin', onReauthenticationRequired, policy: {regex: '^.{4,}$'}});

    setField('newPassword', '1234');
    setField('confirmPassword', '1234');
    fireEvent.click(submitButton());

    await waitFor(() => expect(screen.getByText(/sign in again to set your pin/i)).toBeTruthy());
    expect(onReauthenticationRequired).toHaveBeenCalledWith({error: 'insufficient_user_authentication', maxAge: 300});
    expect(mockReauthenticate).not.toHaveBeenCalled();
  });

  describe('when a first value needs a recent sign-in', () => {
    const stepUp = async (): Promise<Error> => {
      const {StepUpRequiredError} = await import('@thunderid/browser');

      return new StepUpRequiredError(
        JSON.stringify({code: 'AUTH-4011', message: {defaultValue: 'Recent authentication required'}}),
        'updateMeCredentials-StepUpRequired-001',
        'react',
        401,
        'Unauthorized',
        undefined,
        'Bearer error="insufficient_user_authentication", max_age="300"',
      );
    };

    const submitPin = (): void => {
      setField('newPassword', '1234');
      setField('confirmPassword', '1234');
      fireEvent.click(submitButton());
    };

    beforeEach(() => {
      mockReauthenticate.mockReset();
    });

    it('signs the user in again with the challenge max_age and sends the same change once more', async () => {
      const onSuccess = vi.fn();
      mockUpdateMeCredentials.mockRejectedValueOnce(await stepUp()).mockResolvedValueOnce(undefined);
      mockReauthenticate.mockResolvedValue(undefined);
      renderChangeCredential({attribute: 'pin', onSuccess, policy: {regex: '^.{4,}$'}});

      submitPin();

      await waitFor(() => expect(onSuccess).toHaveBeenCalledTimes(1));
      expect(mockReauthenticate).toHaveBeenCalledWith({maxAge: 300});
      expect(mockUpdateMeCredentials).toHaveBeenCalledTimes(2);
      expect((mockUpdateMeCredentials.mock.calls[1][0] as {payload: unknown}).payload).toEqual({
        currentValue: undefined,
        name: 'pin',
        newValue: '1234',
      });
    });

    it('shows the sign-in-again text when the change is refused again', async () => {
      mockUpdateMeCredentials.mockRejectedValue(await stepUp());
      mockReauthenticate.mockResolvedValue(undefined);
      renderChangeCredential({attribute: 'pin', policy: {regex: '^.{4,}$'}});

      submitPin();

      expect(await screen.findByText(/sign in again to set your pin/i)).toBeTruthy();
      expect(mockUpdateMeCredentials).toHaveBeenCalledTimes(2);
    });

    it('shows a different-account error and keeps the change unsent', async () => {
      mockUpdateMeCredentials.mockRejectedValue(await stepUp());
      mockReauthenticate.mockRejectedValue(Object.assign(new Error('other user'), {code: 'JS-AUTH_CORE-CRA-IV03'}));
      renderChangeCredential({attribute: 'pin', policy: {regex: '^.{4,}$'}});

      submitPin();

      expect(await screen.findByText(/you signed in with a different account/i)).toBeTruthy();
      expect(mockUpdateMeCredentials).toHaveBeenCalledTimes(1);
    });

    it('signs in again first on the next submit when the popup was blocked', async () => {
      mockUpdateMeCredentials.mockRejectedValueOnce(await stepUp()).mockResolvedValueOnce(undefined);
      mockReauthenticate
        .mockRejectedValueOnce(Object.assign(new Error('blocked'), {code: 'BROWSER-REAUTHENTICATION-PB01'}))
        .mockResolvedValueOnce(undefined);
      renderChangeCredential({attribute: 'pin', policy: {regex: '^.{4,}$'}});

      submitPin();
      expect(await screen.findByText(/allow pop-ups for this site/i)).toBeTruthy();

      fireEvent.click(submitButton());

      await waitFor(() => expect(mockUpdateMeCredentials).toHaveBeenCalledTimes(2));
      expect(mockReauthenticate).toHaveBeenCalledTimes(2);
      expect(mockReauthenticate.mock.invocationCallOrder[1]).toBeLessThan(
        mockUpdateMeCredentials.mock.invocationCallOrder[1],
      );
    });
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
