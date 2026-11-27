// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {getDefaultI18nBundles, substituteTranslationParams} from '@thunderid/browser';
import {DOMWrapper, flushPromises, mount} from '@vue/test-utils';
import {Mock, beforeEach, describe, expect, it, vi} from 'vitest';
import {nextTick, ref} from 'vue';
import ChangeCredential from '../../../components/account/change-credential/ChangeCredential';
import {I18N_KEY, THUNDERID_KEY, USER_KEY} from '../../../keys';
import type {I18nContextValue, ThunderIDContext, UserContextValue} from '../../../models/contexts';

const mockUpdateMeCredentials = vi.fn() as Mock;
const mockReauthenticate = vi.fn() as Mock;

vi.mock('../../../api/account/updateMeCredentials', () => ({
  default: (...args: unknown[]): unknown => mockUpdateMeCredentials(...args) as unknown,
}));

const createThunderIDContext = (): ThunderIDContext =>
  ({
    baseUrl: 'https://localhost:8090',
    instanceId: 0,
    isInitialized: ref(true),
    isLoading: ref(false),
    isSignedIn: ref(true),
    reauthenticate: (...args: unknown[]): unknown => mockReauthenticate(...args) as unknown,
    user: ref(null),
    vendor: 'thunderid',
  }) as unknown as ThunderIDContext;

const createUserContext = (userSchema: Record<string, unknown> | null = null): UserContextValue =>
  ({
    flattenedProfile: ref(null),
    onUpdateProfile: vi.fn(),
    profile: ref(null),
    revalidateProfile: vi.fn(),
    updateProfile: vi.fn(),
    userSchema: ref(userSchema),
  }) as unknown as UserContextValue;

/**
 * Minimal i18n context. Resolves keys through the real en-US bundle so the tests assert on the
 * strings a consumer actually sees rather than on raw keys.
 */
const createI18nContext = (): I18nContextValue =>
  ({
    bundles: ref({}),
    currentLanguage: ref('en-US'),
    fallbackLanguage: 'en-US',
    injectBundles: vi.fn(),
    setLanguage: vi.fn(),
    t: (key: string, params?: Record<string, string | number>): string => {
      const translations = getDefaultI18nBundles()['en-US']?.translations as Record<string, string>;
      const value: string = translations?.[key] ?? key;

      return params ? substituteTranslationParams(value, params) : value;
    },
  }) as unknown as I18nContextValue;

const mountChangeCredential = (
  props: Record<string, unknown> = {},
  userSchema: Record<string, unknown> | null = null,
) =>
  mount(ChangeCredential, {
    global: {
      provide: {
        [I18N_KEY as symbol]: createI18nContext(),
        [THUNDERID_KEY as symbol]: createThunderIDContext(),
        [USER_KEY as symbol]: createUserContext(userSchema),
      },
    },
    props,
  });

const inputByName = (wrapper: ReturnType<typeof mountChangeCredential>, name: string): DOMWrapper<HTMLInputElement> =>
  wrapper.find<HTMLInputElement>(`input[name="${name}"]`);

const fill = async (
  wrapper: ReturnType<typeof mountChangeCredential>,
  values: Record<string, string>,
): Promise<void> => {
  for (const [name, value] of Object.entries(values)) {
    const field: DOMWrapper<HTMLInputElement> = inputByName(wrapper, name);
    await field.setValue(value);
  }
};

describe('ChangeCredential', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders an optional current-value field above the new value and its confirmation', () => {
    const wrapper = mountChangeCredential();

    expect(inputByName(wrapper, 'currentPassword').exists()).toBe(true);
    expect(inputByName(wrapper, 'currentPassword').element.required).toBe(false);
    expect(inputByName(wrapper, 'newPassword').exists()).toBe(true);
    expect(inputByName(wrapper, 'confirmPassword').exists()).toBe(true);
    expect(wrapper.text()).toMatch(/leave this empty if you have not set one yet/i);
  });

  it('marks the current field as current-password and the new fields as new-password', () => {
    const wrapper = mountChangeCredential();

    expect(inputByName(wrapper, 'currentPassword').attributes('autocomplete')).toBe('current-password');
    expect(inputByName(wrapper, 'newPassword').attributes('autocomplete')).toBe('new-password');
    expect(inputByName(wrapper, 'confirmPassword').attributes('autocomplete')).toBe('new-password');
  });

  it('updates the requirement checklist as the user types', async () => {
    const wrapper = mountChangeCredential({policy: {regex: '^(?=.*\\d).{8,}$'}});

    const isPassed = (): string | undefined => wrapper.find('li[data-passed]').attributes('data-passed');

    expect(isPassed()).toBe('false');

    await fill(wrapper, {newPassword: 'longenough'});
    expect(isPassed()).toBe('false');

    await fill(wrapper, {newPassword: 'longenough1'});
    expect(isPassed()).toBe('true');
  });

  it('keeps submit disabled until every rule passes and the confirmation matches', async () => {
    const wrapper = mountChangeCredential({policy: {regex: '^.{8,}$'}});
    const submit = (): DOMWrapper<HTMLButtonElement> => wrapper.find<HTMLButtonElement>('button[type="submit"]');

    expect(submit().attributes('disabled')).toBeDefined();

    await fill(wrapper, {confirmPassword: 'sh0rt', newPassword: 'sh0rt'});
    expect(submit().attributes('disabled')).toBeDefined();

    await fill(wrapper, {confirmPassword: 'longenough1', newPassword: 'longenough1'});
    expect(submit().attributes('disabled')).toBeUndefined();
  });

  it('sends the name and new value without a current value when it is left empty, and emits success', async () => {
    mockUpdateMeCredentials.mockResolvedValueOnce(undefined);
    const wrapper = mountChangeCredential({policy: {regex: '^.{8,}$'}});

    await fill(wrapper, {confirmPassword: 'n3wP@ssword', newPassword: 'n3wP@ssword'});
    await wrapper.find('form').trigger('submit');
    await nextTick();

    expect(mockUpdateMeCredentials).toHaveBeenCalledTimes(1);
    expect(mockUpdateMeCredentials).toHaveBeenCalledWith(
      expect.objectContaining({
        baseUrl: 'https://localhost:8090',
        payload: {currentValue: undefined, name: 'password', newValue: 'n3wP@ssword'},
      }),
    );
    expect(wrapper.emitted('success')).toBeTruthy();
  });

  it('sends the current value and names the attribute when set to something other than password', async () => {
    mockUpdateMeCredentials.mockResolvedValueOnce(undefined);
    const wrapper = mountChangeCredential({attribute: 'pin', policy: {regex: '^.{4,}$'}});

    await fill(wrapper, {confirmPassword: '1234', currentPassword: '0000', newPassword: '1234'});
    await wrapper.find('form').trigger('submit');
    await nextTick();

    expect(mockUpdateMeCredentials).toHaveBeenCalledWith(
      expect.objectContaining({
        payload: {currentValue: '0000', name: 'pin', newValue: '1234'},
      }),
    );
  });

  it('clears the entered passwords after a successful change', async () => {
    mockUpdateMeCredentials.mockResolvedValueOnce(undefined);
    const wrapper = mountChangeCredential({policy: {regex: '^.{8,}$'}});

    await fill(wrapper, {confirmPassword: 'n3wP@ssword', currentPassword: '0ldP@ssword', newPassword: 'n3wP@ssword'});
    await wrapper.find('form').trigger('submit');
    await nextTick();
    await nextTick();

    expect(inputByName(wrapper, 'currentPassword').element.value).toBe('');
    expect(inputByName(wrapper, 'newPassword').element.value).toBe('');
    expect(inputByName(wrapper, 'confirmPassword').element.value).toBe('');
  });

  it('surfaces a 400 onto the new password field', async () => {
    const {ThunderIDAPIError} = await import('@thunderid/browser');

    mockUpdateMeCredentials.mockRejectedValueOnce(
      new ThunderIDAPIError('Password is too common', 'x-001', 'vue', 400, 'Bad Request'),
    );
    const wrapper = mountChangeCredential({policy: {regex: '^.{8,}$'}});

    await fill(wrapper, {confirmPassword: 'n3wP@ssword', newPassword: 'n3wP@ssword'});
    await wrapper.find('form').trigger('submit');
    await nextTick();
    await nextTick();

    expect(wrapper.text()).toMatch(/password is too common/i);
  });

  it.each([
    ['USR-1047', 400, /enter your current password/i],
    ['USR-1048', 403, /the current password is incorrect/i],
  ])('shows %s on the current field with translated text', async (code: string, status: number, text: RegExp) => {
    const {ThunderIDAPIError} = await import('@thunderid/browser');

    mockUpdateMeCredentials.mockRejectedValueOnce(
      new ThunderIDAPIError(JSON.stringify({code, message: {defaultValue: 'Server text'}}), 'x-003', 'vue', status),
    );
    const wrapper = mountChangeCredential({policy: {regex: '^.{8,}$'}});

    await fill(wrapper, {confirmPassword: 'n3wP@ssword', currentPassword: 'wr0ng', newPassword: 'n3wP@ssword'});
    await wrapper.find('form').trigger('submit');
    await nextTick();
    await nextTick();

    const currentField = inputByName(wrapper, 'currentPassword').element.closest('.thunderid-password-field');
    expect(currentField?.textContent).toMatch(text);
    expect(wrapper.text()).not.toContain('Server text');
  });

  it('hands the challenge to a reauthentication-required listener instead of signing in again', async () => {
    const {StepUpRequiredError} = await import('@thunderid/browser');

    mockUpdateMeCredentials.mockRejectedValueOnce(
      new StepUpRequiredError(
        JSON.stringify({code: 'AUTH-4011', message: {defaultValue: 'Recent authentication required'}}),
        'x-004',
        'vue',
        401,
        'Unauthorized',
        undefined,
        'Bearer error="insufficient_user_authentication", max_age="300"',
      ),
    );
    const onReauthenticationRequired = vi.fn();
    const wrapper = mountChangeCredential({attribute: 'pin', onReauthenticationRequired, policy: {regex: '^.{4,}$'}});

    await fill(wrapper, {confirmPassword: '1234', newPassword: '1234'});
    await wrapper.find('form').trigger('submit');
    await flushPromises();

    expect(wrapper.text()).toMatch(/sign in again to set your pin/i);
    expect(onReauthenticationRequired).toHaveBeenCalledWith({error: 'insufficient_user_authentication', maxAge: 300});
    expect(mockReauthenticate).not.toHaveBeenCalled();
  });

  describe('when a first value needs a recent sign-in', () => {
    const stepUp = async (): Promise<Error> => {
      const {StepUpRequiredError} = await import('@thunderid/browser');

      return new StepUpRequiredError(
        JSON.stringify({code: 'AUTH-4011', message: {defaultValue: 'Recent authentication required'}}),
        'updateMeCredentials-StepUpRequired-001',
        'vue',
        401,
        'Unauthorized',
        undefined,
        'Bearer error="insufficient_user_authentication", max_age="300"',
      );
    };

    const submitPin = async (wrapper: ReturnType<typeof mountChangeCredential>): Promise<void> => {
      await fill(wrapper, {confirmPassword: '1234', newPassword: '1234'});
      await wrapper.find('form').trigger('submit');
      await flushPromises();
    };

    beforeEach(() => {
      mockReauthenticate.mockReset();
    });

    it('signs the user in again with the challenge max_age and sends the same change once more', async () => {
      mockUpdateMeCredentials.mockRejectedValueOnce(await stepUp()).mockResolvedValueOnce(undefined);
      mockReauthenticate.mockResolvedValue(undefined);
      const wrapper = mountChangeCredential({attribute: 'pin', policy: {regex: '^.{4,}$'}});

      await submitPin(wrapper);

      expect(mockReauthenticate).toHaveBeenCalledWith({maxAge: 300});
      expect(mockUpdateMeCredentials).toHaveBeenCalledTimes(2);
      expect((mockUpdateMeCredentials.mock.calls[1][0] as {payload: unknown}).payload).toEqual({
        currentValue: undefined,
        name: 'pin',
        newValue: '1234',
      });
      expect(wrapper.emitted('success')).toBeTruthy();
    });

    it('shows the sign-in-again text when the change is refused again', async () => {
      mockUpdateMeCredentials.mockRejectedValue(await stepUp());
      mockReauthenticate.mockResolvedValue(undefined);
      const wrapper = mountChangeCredential({attribute: 'pin', policy: {regex: '^.{4,}$'}});

      await submitPin(wrapper);

      expect(wrapper.text()).toMatch(/sign in again to set your pin/i);
      expect(mockUpdateMeCredentials).toHaveBeenCalledTimes(2);
    });

    it('shows why signing in again failed and does not retry', async () => {
      mockUpdateMeCredentials.mockRejectedValue(await stepUp());
      mockReauthenticate.mockRejectedValue(Object.assign(new Error('other user'), {code: 'JS-AUTH_CORE-CRA-IV03'}));
      const wrapper = mountChangeCredential({attribute: 'pin', policy: {regex: '^.{4,}$'}});

      await submitPin(wrapper);

      expect(wrapper.text()).toMatch(/you signed in with a different account/i);
      expect(mockUpdateMeCredentials).toHaveBeenCalledTimes(1);
    });
  });

  it('derives the policy regex from the user schema', async () => {
    const wrapper = mountChangeCredential({}, {password: {credential: true, regex: '^[a-z]+$'}});

    await fill(wrapper, {newPassword: 'Str0ng!Pass'});

    // The schema regex is the whole policy; no SDK-side rules are layered alongside it.
    const items = wrapper.findAll('li[data-passed]');
    expect(items.length).toBe(1);
    expect(items[0].attributes('data-passed')).toBe('false');
  });

  it('derives the policy from a non-password credential attribute', async () => {
    const wrapper = mountChangeCredential({attribute: 'pin'}, {pin: {credential: true, regex: '^\\d{4}$'}});

    await fill(wrapper, {newPassword: '12'});

    const items = wrapper.findAll('li[data-passed]');
    expect(items.length).toBe(1);
    expect(items[0].attributes('data-passed')).toBe('false');
  });

  it('applies no client-side rules when the schema has no password regex', async () => {
    const wrapper = mountChangeCredential({}, {password: {credential: true}});

    await fill(wrapper, {newPassword: 'x'});

    expect(wrapper.findAll('li[data-passed]').length).toBe(0);
  });

  describe('when the schema defines no password attribute', () => {
    const schemaWithoutPassword = {email: {type: 'string'}, pin: {credential: true, type: 'string'}};

    it('explains why the form is unusable instead of rendering nothing', () => {
      const wrapper = mountChangeCredential({}, schemaWithoutPassword);

      expect(wrapper.find('[role="status"]').exists()).toBe(true);
      expect(wrapper.text()).toContain('Password changes unavailable');
    });

    it('still renders the form so the overlay has something to sit on', () => {
      const wrapper = mountChangeCredential({}, schemaWithoutPassword);

      expect(inputByName(wrapper, 'newPassword').exists()).toBe(true);
      expect(wrapper.find('[aria-hidden="true"]').exists()).toBe(true);
    });

    it('disables every control so nothing is reachable behind the overlay', () => {
      const wrapper = mountChangeCredential({}, schemaWithoutPassword);

      expect(inputByName(wrapper, 'newPassword').attributes('disabled')).toBeDefined();
      expect(inputByName(wrapper, 'confirmPassword').attributes('disabled')).toBeDefined();
      expect(wrapper.find('button[type="submit"]').attributes('disabled')).toBeDefined();
    });

    it('never writes credentials even if a submit is forced through', async () => {
      const wrapper = mountChangeCredential({}, schemaWithoutPassword);

      await wrapper.find('form').trigger('submit');

      expect(mockUpdateMeCredentials).not.toHaveBeenCalled();
    });

    it('renders the usable form when the schema does define a password', () => {
      const wrapper = mountChangeCredential({}, {password: {credential: true}});

      expect(wrapper.find('[role="status"]').exists()).toBe(false);
      expect(inputByName(wrapper, 'newPassword').attributes('disabled')).toBeUndefined();
    });

    it('is available when attribute points at a declared non-password credential', () => {
      const wrapper = mountChangeCredential({attribute: 'pin'}, schemaWithoutPassword);

      expect(wrapper.find('[role="status"]').exists()).toBe(false);
      expect(inputByName(wrapper, 'newPassword').attributes('disabled')).toBeUndefined();
    });

    it('shows a generic contact-administrator message rather than naming the credential', () => {
      const wrapper = mountChangeCredential({}, schemaWithoutPassword);

      expect(wrapper.text()).toMatch(/contact your administrator/i);
    });
  });

  it('takes the display name from the schema rather than title-casing the attribute', () => {
    const wrapper = mountChangeCredential({attribute: 'pin'}, {pin: {credential: true, displayName: 'Security PIN'}});

    expect(wrapper.text()).toContain('Change Security PIN');
  });

  it('falls back to title-casing the attribute when the schema has no displayName', () => {
    const wrapper = mountChangeCredential({attribute: 'pin'}, {pin: {credential: true}});

    expect(wrapper.text()).toContain('Change Pin');
  });

  it('overrides the default heading when title is set', () => {
    const wrapper = mountChangeCredential({title: 'Update your PIN'});

    expect(wrapper.text()).toContain('Update your PIN');
    expect(wrapper.text()).not.toContain('Change Password');
  });

  it('omits the heading entirely when title is an empty string', () => {
    const wrapper = mountChangeCredential({title: ''});

    expect(wrapper.text()).not.toContain('Change Password');
  });
});
