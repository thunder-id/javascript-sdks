// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {getDefaultI18nBundles, substituteTranslationParams} from '@thunderid/browser';
import {DOMWrapper, mount} from '@vue/test-utils';
import {Mock, beforeEach, describe, expect, it, vi} from 'vitest';
import {nextTick, ref} from 'vue';
import ChangePassword from '../../components/presentation/change-password/ChangePassword';
import {I18N_KEY, THUNDERID_KEY, USER_KEY} from '../../keys';
import type {I18nContextValue, ThunderIDContext, UserContextValue} from '../../models/contexts';

const mockUpdateMeCredentials = vi.fn() as Mock;

vi.mock('../../api/updateMeCredentials', () => ({
  default: (...args: unknown[]): unknown => mockUpdateMeCredentials(...args) as unknown,
}));

const createThunderIDContext = (): ThunderIDContext =>
  ({
    baseUrl: 'https://localhost:8090',
    instanceId: 0,
    isInitialized: ref(true),
    isLoading: ref(false),
    isSignedIn: ref(true),
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

const mountChangePassword = (props: Record<string, unknown> = {}, userSchema: Record<string, unknown> | null = null) =>
  mount(ChangePassword, {
    global: {
      provide: {
        [I18N_KEY as symbol]: createI18nContext(),
        [THUNDERID_KEY as symbol]: createThunderIDContext(),
        [USER_KEY as symbol]: createUserContext(userSchema),
      },
    },
    props,
  });

const inputByName = (wrapper: ReturnType<typeof mountChangePassword>, name: string): DOMWrapper<HTMLInputElement> =>
  wrapper.find<HTMLInputElement>(`input[name="${name}"]`);

const fill = async (wrapper: ReturnType<typeof mountChangePassword>, values: Record<string, string>): Promise<void> => {
  for (const [name, value] of Object.entries(values)) {
    const field: DOMWrapper<HTMLInputElement> = inputByName(wrapper, name);
    await field.setValue(value);
  }
};

describe('ChangePassword', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the three fields by default', () => {
    const wrapper = mountChangePassword();

    expect(inputByName(wrapper, 'currentPassword').exists()).toBe(true);
    expect(inputByName(wrapper, 'newPassword').exists()).toBe(true);
    expect(inputByName(wrapper, 'confirmPassword').exists()).toBe(true);
  });

  it('marks the new password fields as new-password for password managers', () => {
    const wrapper = mountChangePassword();

    expect(inputByName(wrapper, 'currentPassword').attributes('autocomplete')).toBe('current-password');
    expect(inputByName(wrapper, 'newPassword').attributes('autocomplete')).toBe('new-password');
    expect(inputByName(wrapper, 'confirmPassword').attributes('autocomplete')).toBe('new-password');
  });

  it('updates the requirement checklist as the user types', async () => {
    const wrapper = mountChangePassword({policy: {regex: '^(?=.*\\d).{8,}$'}});

    const isPassed = (): string | undefined => wrapper.find('li[data-passed]').attributes('data-passed');

    expect(isPassed()).toBe('false');

    await fill(wrapper, {newPassword: 'longenough'});
    expect(isPassed()).toBe('false');

    await fill(wrapper, {newPassword: 'longenough1'});
    expect(isPassed()).toBe('true');
  });

  it('keeps submit disabled until every rule passes and the confirmation matches', async () => {
    const wrapper = mountChangePassword({policy: {regex: '^.{8,}$'}});
    const submit = (): DOMWrapper<HTMLButtonElement> => wrapper.find<HTMLButtonElement>('button[type="submit"]');

    expect(submit().attributes('disabled')).toBeDefined();

    await fill(wrapper, {confirmPassword: 'sh0rt', currentPassword: '0ldP@ssword!', newPassword: 'sh0rt'});
    expect(submit().attributes('disabled')).toBeDefined();

    await fill(wrapper, {confirmPassword: 'longenough1', newPassword: 'longenough1'});
    expect(submit().attributes('disabled')).toBeUndefined();
  });

  it('blocks reusing the current password as the new one', async () => {
    const wrapper = mountChangePassword({policy: {regex: '^.{8,}$'}});

    await fill(wrapper, {
      confirmPassword: 'longenough1',
      currentPassword: 'longenough1',
      newPassword: 'longenough1',
    });

    expect(wrapper.find('button[type="submit"]').attributes('disabled')).toBeDefined();
  });

  it('sends the current password alongside the new one and emits success', async () => {
    mockUpdateMeCredentials.mockResolvedValueOnce(undefined);
    const wrapper = mountChangePassword({policy: {regex: '^.{8,}$'}});

    await fill(wrapper, {
      confirmPassword: 'n3wP@ssword',
      currentPassword: '0ldP@ssword!',
      newPassword: 'n3wP@ssword',
    });
    await wrapper.find('form').trigger('submit');
    await nextTick();

    expect(mockUpdateMeCredentials).toHaveBeenCalledTimes(1);
    expect(mockUpdateMeCredentials).toHaveBeenCalledWith(
      expect.objectContaining({
        baseUrl: 'https://localhost:8090',
        currentPassword: '0ldP@ssword!',
        payload: {password: 'n3wP@ssword'},
      }),
    );
    expect(wrapper.emitted('success')).toBeTruthy();
  });

  it('clears the entered passwords after a successful change', async () => {
    mockUpdateMeCredentials.mockResolvedValueOnce(undefined);
    const wrapper = mountChangePassword({policy: {regex: '^.{8,}$'}});

    await fill(wrapper, {
      confirmPassword: 'n3wP@ssword',
      currentPassword: '0ldP@ssword!',
      newPassword: 'n3wP@ssword',
    });
    await wrapper.find('form').trigger('submit');
    await nextTick();
    await nextTick();

    expect(inputByName(wrapper, 'currentPassword').element.value).toBe('');
    expect(inputByName(wrapper, 'newPassword').element.value).toBe('');
    expect(inputByName(wrapper, 'confirmPassword').element.value).toBe('');
  });

  it('maps a 403 onto the current password field', async () => {
    const {ThunderIDAPIError} = await import('@thunderid/browser');

    mockUpdateMeCredentials.mockRejectedValueOnce(
      new ThunderIDAPIError('Invalid current password', 'x-001', 'vue', 403, 'Forbidden'),
    );
    const wrapper = mountChangePassword({policy: {regex: '^.{8,}$'}});

    await fill(wrapper, {
      confirmPassword: 'n3wP@ssword',
      currentPassword: 'wrong-but-long',
      newPassword: 'n3wP@ssword',
    });
    await wrapper.find('form').trigger('submit');
    await nextTick();
    await nextTick();

    expect(wrapper.text()).toMatch(/current password is incorrect/i);
  });

  it('derives the policy regex from the user schema', async () => {
    const wrapper = mountChangePassword({}, {password: {credential: true, regex: '^[a-z]+$'}});

    await fill(wrapper, {newPassword: 'Str0ng!Pass'});

    // The schema regex is the whole policy; no SDK-side rules are layered alongside it.
    const items = wrapper.findAll('li[data-passed]');
    expect(items.length).toBe(1);
    expect(items[0].attributes('data-passed')).toBe('false');
  });

  it('applies no client-side rules when the schema has no password regex', async () => {
    const wrapper = mountChangePassword({}, {password: {credential: true}});

    await fill(wrapper, {newPassword: 'x'});

    expect(wrapper.findAll('li[data-passed]').length).toBe(0);
  });

  describe('when the schema defines no password attribute', () => {
    const schemaWithoutPassword = {email: {type: 'string'}, pin: {credential: true, type: 'string'}};

    it('explains why the form is unusable instead of rendering nothing', () => {
      const wrapper = mountChangePassword({}, schemaWithoutPassword);

      expect(wrapper.find('[role="status"]').exists()).toBe(true);
      expect(wrapper.text()).toContain('Password changes unavailable');
    });

    it('still renders the form so the overlay has something to sit on', () => {
      const wrapper = mountChangePassword({}, schemaWithoutPassword);

      expect(inputByName(wrapper, 'newPassword').exists()).toBe(true);
      expect(wrapper.find('[aria-hidden="true"]').exists()).toBe(true);
    });

    it('disables every control so nothing is reachable behind the overlay', () => {
      const wrapper = mountChangePassword({}, schemaWithoutPassword);

      expect(inputByName(wrapper, 'currentPassword').attributes('disabled')).toBeDefined();
      expect(inputByName(wrapper, 'newPassword').attributes('disabled')).toBeDefined();
      expect(inputByName(wrapper, 'confirmPassword').attributes('disabled')).toBeDefined();
      expect(wrapper.find('button[type="submit"]').attributes('disabled')).toBeDefined();
    });

    it('never writes credentials even if a submit is forced through', async () => {
      const wrapper = mountChangePassword({}, schemaWithoutPassword);

      await wrapper.find('form').trigger('submit');

      expect(mockUpdateMeCredentials).not.toHaveBeenCalled();
    });

    it('renders the usable form when the schema does define a password', () => {
      const wrapper = mountChangePassword({}, {password: {credential: true}});

      expect(wrapper.find('[role="status"]').exists()).toBe(false);
      expect(inputByName(wrapper, 'newPassword').attributes('disabled')).toBeUndefined();
    });
  });
});
