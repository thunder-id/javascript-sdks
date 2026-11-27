// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {AttributeSchema, User, getDefaultI18nBundles, substituteTranslationParams} from '@thunderid/browser';
import {DOMWrapper, VueWrapper, flushPromises, mount} from '@vue/test-utils';
import {Mock, beforeEach, describe, expect, it, vi} from 'vitest';
import {ref} from 'vue';
import UserProfile from '../../../components/account/user-profile/UserProfile';
import {FLOW_META_KEY, I18N_KEY, THUNDERID_KEY, USER_KEY} from '../../../keys';
import type {I18nContextValue, ThunderIDContext, UserContextValue} from '../../../models/contexts';

const mockUpdateMeProfile = vi.fn() as Mock;
const mockReauthenticate = vi.fn() as Mock;
const mockOnUpdateProfile = vi.fn() as Mock;

vi.mock('../../../api/account/updateMeProfile', () => ({
  default: (...args: unknown[]): unknown => mockUpdateMeProfile(...args) as unknown,
}));

const userSchema: Record<string, AttributeSchema> = {
  email: {displayName: 'Email', type: 'email'},
  given_name: {displayName: 'First name', type: 'string'},
} as Record<string, AttributeSchema>;

const attributes = {email: 'alex@example.com', given_name: 'Alex'};
const profile: User = {attributes, id: 'user-1', ...attributes, verifiedAttributes: {}};

const t = (key: string, params?: Record<string, string | number>): string => {
  const translations = getDefaultI18nBundles()['en-US']?.translations as unknown as Record<string, string>;
  const value: string = translations?.[key] ?? key;
  return params ? substituteTranslationParams(value, params) : value;
};

const mountUserProfile = (props: Record<string, unknown> = {}): VueWrapper =>
  mount(UserProfile, {
    global: {
      provide: {
        [FLOW_META_KEY as symbol]: {meta: ref(null)},
        [I18N_KEY as symbol]: {currentLanguage: ref('en-US'), t} as unknown as I18nContextValue,
        [THUNDERID_KEY as symbol]: {
          baseUrl: 'https://localhost:8090',
          instanceId: 0,
          isInitialized: ref(true),
          isLoading: ref(false),
          reauthenticate: (...args: unknown[]): unknown => mockReauthenticate(...args) as unknown,
          vendor: 'thunderid',
        } as unknown as ThunderIDContext,
        [USER_KEY as symbol]: {
          flattenedProfile: ref(profile),
          onUpdateProfile: mockOnUpdateProfile,
          profile: ref({flattenedProfile: profile, profile}),
          revalidateProfile: vi.fn().mockResolvedValue(undefined),
          userSchema: ref(userSchema),
        } as unknown as UserContextValue,
      },
    },
    props,
  }) as VueWrapper;

const row = (wrapper: VueWrapper, label: string): DOMWrapper<Element> =>
  wrapper
    .findAll('.thunderid-user-profile__field')
    .find((r: DOMWrapper<Element>) => r.find('.thunderid-user-profile__field-label').text() === label)!;

const editAndSave = async (wrapper: VueWrapper, label: string, value: string): Promise<void> => {
  await row(wrapper, label).find('button[title="Edit"]').trigger('click');
  await row(wrapper, label).find('input').setValue(value);
  await row(wrapper, label)
    .findAll('button')
    .find((b: DOMWrapper<Element>) => b.text() === 'Save')!
    .trigger('click');
  await flushPromises();
};

const stepUp = async (): Promise<Error> => {
  const {StepUpRequiredError} = await import('@thunderid/browser');

  return new StepUpRequiredError(
    JSON.stringify({code: 'AUTH-4011', message: {defaultValue: 'Recent authentication required'}}),
    'updateMeProfile-StepUpRequired-001',
    'vue',
    401,
    'Unauthorized',
    undefined,
    'Bearer error="insufficient_user_authentication", max_age="300"',
  );
};

describe('UserProfile recent sign-in', () => {
  beforeEach(() => {
    mockUpdateMeProfile.mockReset();
    mockReauthenticate.mockReset();
    mockOnUpdateProfile.mockReset();
  });

  it('signs the user in again with the challenge max_age and saves the change once more', async () => {
    const updated: User = {...profile, email: 'new@example.com'};
    mockUpdateMeProfile.mockRejectedValueOnce(await stepUp()).mockResolvedValueOnce(updated);
    mockReauthenticate.mockResolvedValue(undefined);
    const wrapper: VueWrapper = mountUserProfile();

    await editAndSave(wrapper, 'Email', 'new@example.com');

    expect(mockReauthenticate).toHaveBeenCalledWith({maxAge: 300});
    expect(mockUpdateMeProfile).toHaveBeenCalledTimes(2);
    expect(mockUpdateMeProfile.mock.calls[1][0]).toEqual(mockUpdateMeProfile.mock.calls[0][0]);
    expect(mockOnUpdateProfile).toHaveBeenCalledWith(updated);
  });

  it('shows an error when the change is refused again after signing in', async () => {
    mockUpdateMeProfile.mockRejectedValue(await stepUp());
    mockReauthenticate.mockResolvedValue(undefined);
    const wrapper: VueWrapper = mountUserProfile();

    await editAndSave(wrapper, 'Email', 'new@example.com');

    expect(wrapper.text()).toMatch(/sign in again to save this change/i);
    expect(mockUpdateMeProfile).toHaveBeenCalledTimes(2);
  });

  it('shows why signing in again failed and does not retry', async () => {
    mockUpdateMeProfile.mockRejectedValue(await stepUp());
    mockReauthenticate.mockRejectedValue(Object.assign(new Error('blocked'), {code: 'BROWSER-REAUTHENTICATION-PB01'}));
    const wrapper: VueWrapper = mountUserProfile();

    await editAndSave(wrapper, 'Email', 'new@example.com');

    expect(wrapper.text()).toMatch(/allow pop-ups for this site/i);
    expect(mockUpdateMeProfile).toHaveBeenCalledTimes(1);
  });

  it('hands the challenge to a reauthentication-required listener instead of signing in again', async () => {
    const onReauthenticationRequired = vi.fn();
    mockUpdateMeProfile.mockRejectedValue(await stepUp());
    const wrapper: VueWrapper = mountUserProfile({onReauthenticationRequired});

    await editAndSave(wrapper, 'Email', 'new@example.com');

    expect(onReauthenticationRequired).toHaveBeenCalledWith({error: 'insufficient_user_authentication', maxAge: 300});
    expect(mockReauthenticate).not.toHaveBeenCalled();
  });
});
