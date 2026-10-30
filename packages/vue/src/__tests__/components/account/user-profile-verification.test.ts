// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {AttributeSchema, User, getDefaultI18nBundles, substituteTranslationParams} from '@thunderid/browser';
import {DOMWrapper, VueWrapper, flushPromises, mount} from '@vue/test-utils';
import {Mock, beforeEach, describe, expect, it, vi} from 'vitest';
import {type PropType, type Ref, type VNode, defineComponent, h, ref} from 'vue';
import BaseUserProfile, {
  type BaseUserProfileVerificationSlotProps,
  type BaseUserProfileVerificationState,
} from '../../../components/account/user-profile/BaseUserProfile';
import UserProfile from '../../../components/account/user-profile/UserProfile';
import {FLOW_META_KEY, I18N_KEY, THUNDERID_KEY, USER_KEY} from '../../../keys';
import type {I18nContextValue, ThunderIDContext, UserContextValue} from '../../../models/contexts';

const mockExecute = vi.fn() as Mock;

vi.mock('../../../api/auth/executeEmbeddedSelfServiceFlow', () => ({
  default: (...args: unknown[]): unknown => mockExecute(...args) as unknown,
}));

const VERIFIED_AT = '2026-10-16T08:30:00Z';

const userSchema: Record<string, AttributeSchema> = {
  email: {displayName: 'Email', type: 'email'},
  given_name: {displayName: 'First name', type: 'string'},
  mobile: {displayName: 'Mobile', type: 'mobile'},
} as Record<string, AttributeSchema>;

// A /users/me profile: attributes are nested and spread to the top level.
const profileOf = (attributes: Record<string, unknown>, verifiedAttributes?: Record<string, unknown>): User => ({
  attributes,
  id: 'user-1',
  ...attributes,
  ...(verifiedAttributes ? {verifiedAttributes} : {}),
});

const attributes = {email: 'alex@example.com', given_name: 'Alex', mobile: '+94771234567'};
const storedProfile: User = profileOf(attributes, {email: {verifiedAt: VERIFIED_AT}});
const unverifiedProfile: User = profileOf(attributes, {});
const legacyProfile: User = profileOf(attributes);

// The server drops the verification of a changed attribute.
const serverUpdate = (profile: User, payload: Record<string, unknown>): User => {
  const previous: Record<string, unknown> = profile['attributes'] as Record<string, unknown>;
  const verifiedAttributes: Record<string, unknown> = {...(profile['verifiedAttributes'] as Record<string, unknown>)};
  Object.keys(payload).forEach((key: string) => {
    if (payload[key] !== previous[key]) delete verifiedAttributes[key];
  });
  return profileOf({...previous, ...payload}, verifiedAttributes);
};

const t = (key: string, params?: Record<string, string | number>): string => {
  const translations = getDefaultI18nBundles()['en-US']?.translations as unknown as Record<string, string>;
  const value: string = translations?.[key] ?? key;
  return params ? substituteTranslationParams(value, params) : value;
};

const verificationSlot = (props: BaseUserProfileVerificationSlotProps) =>
  h('div', {'data-testid': 'verification-panel'}, [
    h('span', `Verifying ${props.attributeDisplayName} (${props.attribute})`),
    h('button', {onClick: props.onCancel, type: 'button'}, 'Not now'),
  ]);

const settle = async (): Promise<void> => {
  await flushPromises();
  await new Promise((resolve: (value: unknown) => void) => {
    setTimeout(resolve, 0);
  });
  await flushPromises();
};

// The row of a field: its label, value, status and actions.
const row = (wrapper: VueWrapper, label: string): DOMWrapper<Element> =>
  wrapper
    .findAll('.thunderid-user-profile__field')
    .find((r: DOMWrapper<Element>) => r.find('.thunderid-user-profile__field-label').text() === label)!;

const buttonIn = (scope: DOMWrapper<Element> | VueWrapper, text: string): DOMWrapper<Element> | undefined =>
  scope.findAll('button').find((b: DOMWrapper<Element>) => b.text() === text);

const status = (scope: DOMWrapper<Element>): DOMWrapper<Element> =>
  scope.find('.thunderid-user-profile__verification-status');

const mountBase = (props: Record<string, unknown> = {}, withSlot = true): VueWrapper =>
  mount(BaseUserProfile, {
    props: {flattenedProfile: storedProfile, profile: storedProfile, t, userSchema, ...props},
    slots: withSlot ? {verification: verificationSlot} : {},
  }) as VueWrapper;

// Holds the profile and the save error as UserProfile does: a failed save sets `error` and keeps the profile.
const Harness = defineComponent({
  props: {
    initialProfile: {required: true, type: Object as PropType<User>},
    // A profile the next reload returns, as a revalidation from elsewhere would.
    reloadedProfile: {default: undefined, type: Object as PropType<User>},
    update: {
      required: true,
      type: Function as PropType<(profile: User, payload: Record<string, unknown>) => Promise<User>>,
    },
  },
  setup(props) {
    const profile: Ref<User> = ref(props.initialProfile);
    const error: Ref<string | null> = ref(null);
    const onUpdate = async (payload: Record<string, unknown>): Promise<void> => {
      error.value = null;
      try {
        profile.value = await props.update(profile.value, payload);
      } catch {
        error.value = 'Could not update your profile.';
      }
    };
    return () => [
      h(
        BaseUserProfile,
        {
          editable: true,
          error: error.value,
          flattenedProfile: profile.value,
          onUpdate,
          profile: profile.value,
          t,
          userSchema,
        },
        {verification: verificationSlot},
      ),
      props.reloadedProfile
        ? h(
            'button',
            {
              onClick: () => {
                profile.value = props.reloadedProfile!;
              },
              type: 'button',
            },
            'Reload profile',
          )
        : null,
    ];
  },
});

const editAndSave = async (wrapper: VueWrapper, label: string, value: string): Promise<void> => {
  await row(wrapper, label).find('button[title="Edit"]').trigger('click');
  await row(wrapper, label).find('input').setValue(value);
  await buttonIn(row(wrapper, label), 'Save')!.trigger('click');
};

// A custom profile drawn through the default slot; `seen` keeps the last slot props.
const customProfile =
  (seen: {props?: BaseUserProfileVerificationState}) =>
  (slotProps: BaseUserProfileVerificationState & {profile: User | null}): VNode => {
    seen.props = slotProps;
    return h(
      'ul',
      ['email', 'mobile', 'given_name']
        .map((name: string) =>
          h('li', {'data-attribute': name}, [
            h('span', `${name}: ${slotProps.verificationStatus(name) ?? 'n/a'}`),
            slotProps.canVerify(name)
              ? h('button', {onClick: () => slotProps.verify(name), type: 'button'}, `Verify ${name}`)
              : null,
          ]),
        )
        .concat([h('li', [slotProps.renderVerification()])]),
    );
  };

describe('BaseUserProfile verification', () => {
  describe('status', () => {
    it('shows Verified or Unverified for each email and mobile field with a value, not for a first name', () => {
      const wrapper: VueWrapper = mountBase();

      expect(status(row(wrapper, 'Email')).text()).toContain('Verified');
      expect(status(row(wrapper, 'Mobile')).text()).toBe('Unverified');
      expect(status(row(wrapper, 'First name')).exists()).toBe(false);
    });

    it('gives the verification time of a verified field, also as text for keyboard and touch users', () => {
      const wrapper: VueWrapper = mountBase();
      const verifiedOn = `Verified on ${new Date(VERIFIED_AT).toLocaleString('en-US')}`;

      expect(status(row(wrapper, 'Email')).attributes('title')).toBe(verifiedOn);
      expect(status(row(wrapper, 'Email')).text()).toBe(`Verified (${verifiedOn})`);
      expect(status(row(wrapper, 'Mobile')).attributes('title')).toBeUndefined();
    });

    it('shows no status and offers no Verify when the profile does not report verification', () => {
      const wrapper: VueWrapper = mountBase({flattenedProfile: legacyProfile, profile: legacyProfile});

      expect(wrapper.find('.thunderid-user-profile__verification-status').exists()).toBe(false);
      expect(buttonIn(wrapper, 'Verify')).toBeUndefined();
    });

    it('does not list the verification record as a profile field', () => {
      const wrapper: VueWrapper = mountBase({userSchema: null});

      expect(wrapper.text()).toContain('alex@example.com');
      expect(wrapper.text()).not.toContain('Verified Attributes');
      expect(wrapper.text()).not.toContain('verifiedAt');
    });

    it('hides the status while the field is being edited', async () => {
      const wrapper: VueWrapper = mountBase({onUpdate: vi.fn()});

      await row(wrapper, 'Email').find('button[title="Edit"]').trigger('click');

      expect(status(row(wrapper, 'Email')).exists()).toBe(false);
    });
  });

  describe('Verify action', () => {
    it('is offered for an unverified email and mobile, and not for a verified email', () => {
      const wrapper: VueWrapper = mountBase();

      expect(buttonIn(row(wrapper, 'Email'), 'Verify')).toBeUndefined();
      expect(buttonIn(row(wrapper, 'Mobile'), 'Verify')).toBeDefined();
    });

    it('carries test identifiers on the status and the Verify action', () => {
      const wrapper: VueWrapper = mountBase();

      expect(buttonIn(row(wrapper, 'Mobile'), 'Verify')?.attributes('data-testid')).toBe('thunderid-verify-mobile');
      expect(status(row(wrapper, 'Email')).attributes('data-testid')).toBe('thunderid-verification-status-email');
    });

    it('is not offered without a verification slot', () => {
      const wrapper: VueWrapper = mountBase({flattenedProfile: unverifiedProfile, profile: unverifiedProfile}, false);

      expect(status(row(wrapper, 'Email')).text()).toBe('Unverified');
      expect(buttonIn(wrapper, 'Verify')).toBeUndefined();
    });

    it('is not offered on a profile that cannot be edited', () => {
      const wrapper: VueWrapper = mountBase({
        editable: false,
        flattenedProfile: unverifiedProfile,
        profile: unverifiedProfile,
      });

      expect(status(row(wrapper, 'Email')).text()).toBe('Unverified');
      expect(buttonIn(wrapper, 'Verify')).toBeUndefined();
    });

    it('opens the panel for the field, hides its Verify, and closes it on dismiss', async () => {
      const wrapper: VueWrapper = mountBase({flattenedProfile: unverifiedProfile, profile: unverifiedProfile});

      await buttonIn(row(wrapper, 'Mobile'), 'Verify')!.trigger('click');

      expect(wrapper.text()).toContain('Verifying Mobile (mobile)');
      expect(buttonIn(row(wrapper, 'Mobile'), 'Verify')).toBeUndefined();

      await buttonIn(wrapper, 'Not now')!.trigger('click');

      expect(wrapper.find('[data-testid="verification-panel"]').exists()).toBe(false);
      expect(buttonIn(row(wrapper, 'Mobile'), 'Verify')).toBeDefined();
    });

    it('closes the panel when the field is edited', async () => {
      const wrapper: VueWrapper = mountBase({
        flattenedProfile: unverifiedProfile,
        onUpdate: vi.fn(),
        profile: unverifiedProfile,
      });

      await buttonIn(row(wrapper, 'Email'), 'Verify')!.trigger('click');
      await row(wrapper, 'Email').find('button[title="Edit"]').trigger('click');

      expect(wrapper.find('[data-testid="verification-panel"]').exists()).toBe(false);
    });
  });

  describe('after saving', () => {
    it('opens the panel once the profile shows a changed email as unverified, never during the save', async () => {
      let finishUpdate: (profile: User) => void = () => undefined;
      const update: Mock = vi.fn(
        () =>
          new Promise<User>((resolve: (profile: User) => void) => {
            finishUpdate = resolve;
          }),
      );
      const wrapper: VueWrapper = mount(Harness, {props: {initialProfile: storedProfile, update}});

      await editAndSave(wrapper, 'Email', 'new@example.com');

      expect(update).toHaveBeenCalledWith(storedProfile, {email: 'new@example.com'});
      expect(wrapper.find('[data-testid="verification-panel"]').exists()).toBe(false);
      expect(status(row(wrapper, 'Email')).exists()).toBe(false);

      finishUpdate(serverUpdate(storedProfile, {email: 'new@example.com'}));
      await settle();

      expect(wrapper.text()).toContain('Verifying Email (email)');
      expect(status(row(wrapper, 'Email')).text()).toBe('Unverified');
      expect(row(wrapper, 'Email').text()).toContain('new@example.com');
    });

    it('shows the stored value with its own status once the save fails, never the typed one', async () => {
      const update: Mock = vi.fn(() => Promise.reject(new Error('rejected')));
      const wrapper: VueWrapper = mount(Harness, {
        props: {
          initialProfile: unverifiedProfile,
          reloadedProfile: serverUpdate(unverifiedProfile, {email: 'other@example.com'}),
          update,
        },
      });

      await editAndSave(wrapper, 'Email', 'new@example.com');
      await settle();

      expect(wrapper.text()).toContain('Could not update your profile.');
      expect(row(wrapper, 'Email').text()).toContain('alex@example.com');
      expect(row(wrapper, 'Email').text()).not.toContain('new@example.com');
      expect(status(row(wrapper, 'Email')).text()).toBe('Unverified');
      expect(wrapper.find('[data-testid="verification-panel"]').exists()).toBe(false);

      // The failed save started nothing, so a later change from elsewhere opens nothing either.
      await buttonIn(wrapper, 'Reload profile')!.trigger('click');
      await settle();

      expect(row(wrapper, 'Email').text()).toContain('other@example.com');
      expect(wrapper.find('[data-testid="verification-panel"]').exists()).toBe(false);
    });

    it('opens no panel for a changed mobile, a changed first name, or an unchanged email', async () => {
      const update: Mock = vi.fn((profile: User, payload: Record<string, unknown>) =>
        Promise.resolve(serverUpdate(profile, payload)),
      );
      const wrapper: VueWrapper = mount(Harness, {props: {initialProfile: unverifiedProfile, update}});

      await editAndSave(wrapper, 'Mobile', '+94770000000');
      await settle();
      await editAndSave(wrapper, 'First name', 'Alexa');
      await settle();
      await editAndSave(wrapper, 'Email', 'alex@example.com');
      await settle();

      expect(update).toHaveBeenCalledTimes(3);
      expect(wrapper.find('[data-testid="verification-panel"]').exists()).toBe(false);
    });

    it('opens no panel when the profile shows the new email already verified', async () => {
      const update: Mock = vi.fn((profile: User, payload: Record<string, unknown>) =>
        Promise.resolve(
          profileOf(
            {...(profile['attributes'] as Record<string, unknown>), ...payload},
            {email: {verifiedAt: VERIFIED_AT}},
          ),
        ),
      );
      const wrapper: VueWrapper = mount(Harness, {props: {initialProfile: unverifiedProfile, update}});

      await editAndSave(wrapper, 'Email', 'new@example.com');
      await settle();

      expect(status(row(wrapper, 'Email')).text()).toContain('Verified');
      expect(wrapper.find('[data-testid="verification-panel"]').exists()).toBe(false);
    });

    it('opens no panel for a changed email when the profile does not report verification', async () => {
      const update: Mock = vi.fn((profile: User, payload: Record<string, unknown>) =>
        Promise.resolve(profileOf({...(profile['attributes'] as Record<string, unknown>), ...payload})),
      );
      const wrapper: VueWrapper = mount(Harness, {props: {initialProfile: legacyProfile, update}});

      await editAndSave(wrapper, 'Email', 'new@example.com');
      await settle();

      expect(row(wrapper, 'Email').text()).toContain('new@example.com');
      expect(wrapper.find('[data-testid="verification-panel"]').exists()).toBe(false);
    });
  });
  describe('custom render', () => {
    const mountCustom = (
      props: Record<string, unknown> = {},
      seen: {props?: BaseUserProfileVerificationState} = {},
    ): VueWrapper =>
      mount(BaseUserProfile, {
        props: {editable: true, flattenedProfile: storedProfile, profile: storedProfile, t, userSchema, ...props},
        slots: {default: customProfile(seen), verification: verificationSlot},
      }) as VueWrapper;

    it("hands a custom profile each attribute's status", () => {
      const seen: {props?: BaseUserProfileVerificationState} = {};
      const wrapper: VueWrapper = mountCustom({}, seen);

      expect(wrapper.text()).toContain('email: verified');
      expect(wrapper.text()).toContain('mobile: unverified');
      expect(wrapper.text()).toContain('given_name: n/a');
      expect(seen.props?.verifiedAttributes).toEqual({email: {verifiedAt: VERIFIED_AT}});
      expect(wrapper.find('.thunderid-user-profile__verification-status').exists()).toBe(false);
    });

    it('reports no status for an attribute without a stored value', () => {
      const empty: User = profileOf({...attributes, mobile: ''}, {});
      const wrapper: VueWrapper = mountCustom({flattenedProfile: empty, profile: empty});

      expect(wrapper.text()).toContain('email: unverified');
      expect(wrapper.text()).toContain('mobile: n/a');
      expect(buttonIn(wrapper, 'Verify mobile')).toBeUndefined();
    });

    it('reports no status when the server does not report verification', () => {
      const seen: {props?: BaseUserProfileVerificationState} = {};
      const wrapper: VueWrapper = mountCustom({flattenedProfile: legacyProfile, profile: legacyProfile}, seen);

      expect(wrapper.text()).toContain('email: n/a');
      expect(wrapper.text()).toContain('mobile: n/a');
      expect(seen.props?.verifiedAttributes).toBeUndefined();
      expect(buttonIn(wrapper, 'Verify mobile')).toBeUndefined();
    });

    it('starts a verification only for an unverified attribute and renders the verification slot for it', async () => {
      const seen: {props?: BaseUserProfileVerificationState} = {};
      const wrapper: VueWrapper = mountCustom({}, seen);

      expect(buttonIn(wrapper, 'Verify email')).toBeUndefined();
      seen.props?.verify('email');
      seen.props?.verify('given_name');
      await settle();
      expect(wrapper.find('[data-testid="verification-panel"]').exists()).toBe(false);

      await buttonIn(wrapper, 'Verify mobile')!.trigger('click');

      expect(seen.props?.verifyingAttribute).toBe('mobile');
      expect(wrapper.find('[data-testid="verification-panel"]').text()).toContain('Verifying Mobile (mobile)');

      await buttonIn(wrapper, 'Not now')!.trigger('click');
      expect(wrapper.find('[data-testid="verification-panel"]').exists()).toBe(false);
    });

    it('closes the open verification through cancelVerification', async () => {
      const seen: {props?: BaseUserProfileVerificationState} = {};
      const wrapper: VueWrapper = mountCustom({}, seen);
      await buttonIn(wrapper, 'Verify mobile')!.trigger('click');

      seen.props?.cancelVerification();
      await settle();

      expect(seen.props?.verifyingAttribute).toBeNull();
      expect(wrapper.find('[data-testid="verification-panel"]').exists()).toBe(false);
    });

    it('offers no verification without a verification slot', () => {
      const seen: {props?: BaseUserProfileVerificationState} = {};
      const wrapper: VueWrapper = mount(BaseUserProfile, {
        props: {editable: true, flattenedProfile: storedProfile, profile: storedProfile, t, userSchema},
        slots: {default: customProfile(seen)},
      }) as VueWrapper;

      expect(wrapper.text()).toContain('mobile: unverified');
      expect(seen.props?.canVerify('mobile')).toBe(false);
      expect(buttonIn(wrapper, 'Verify mobile')).toBeUndefined();
    });

    it('offers no verification when the profile is not editable', async () => {
      const seen: {props?: BaseUserProfileVerificationState} = {};
      const wrapper: VueWrapper = mountCustom({editable: false}, seen);

      expect(wrapper.text()).toContain('mobile: unverified');
      expect(seen.props?.canVerify('mobile')).toBe(false);
      seen.props?.verify('mobile');
      await settle();
      expect(wrapper.find('[data-testid="verification-panel"]').exists()).toBe(false);
    });
  });
});

describe('UserProfile verification', () => {
  const mountUserProfile = (props: Record<string, unknown> = {}, slots: Record<string, unknown> = {}): VueWrapper =>
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
            vendor: 'thunderid',
          } as unknown as ThunderIDContext,
          [USER_KEY as symbol]: {
            flattenedProfile: ref(unverifiedProfile),
            onUpdateProfile: vi.fn(),
            profile: ref({flattenedProfile: unverifiedProfile, profile: unverifiedProfile}),
            revalidateProfile: vi.fn().mockResolvedValue(undefined),
            updateProfile: vi.fn(),
            userSchema: ref(userSchema),
          } as unknown as UserContextValue,
        },
      },
      props,
      slots: slots as never,
    }) as VueWrapper;

  beforeEach(() => {
    mockExecute.mockReset().mockReturnValue(new Promise(() => undefined));
  });

  it('verifies the email through the flow the app names by verificationFlowHandle', async () => {
    const wrapper: VueWrapper = mountUserProfile({verificationFlowHandle: 'email-link-verification'});

    expect(buttonIn(row(wrapper, 'First name'), 'Verify')).toBeUndefined();
    await buttonIn(row(wrapper, 'Email'), 'Verify')!.trigger('click');
    await settle();

    expect(mockExecute).toHaveBeenCalledTimes(1);
    expect(mockExecute).toHaveBeenCalledWith(
      expect.objectContaining({
        payload: {flowType: 'SELF_SERVICE', handle: 'email-link-verification', inputs: {attribute: 'email'}},
      }),
    );
  });

  it('closes the panel when Done is selected after a link is sent', async () => {
    mockExecute.mockResolvedValue({
      data: {additionalData: {maskedDestination: 'a•••@example.com'}, components: []},
      executionId: 'exec-1',
      flowStatus: 'INCOMPLETE',
    });
    const wrapper: VueWrapper = mountUserProfile();

    await buttonIn(row(wrapper, 'Email'), 'Verify')!.trigger('click');
    await settle();
    await buttonIn(wrapper, 'Done')!.trigger('click');
    await settle();

    expect(buttonIn(wrapper, 'Done')).toBeUndefined();
    expect(mockExecute).toHaveBeenCalledTimes(1);
  });

  it('offers no Verify when the profile is not editable', () => {
    const wrapper: VueWrapper = mountUserProfile({editable: false});

    expect(status(row(wrapper, 'Email')).text()).toBe('Unverified');
    expect(buttonIn(wrapper, 'Verify')).toBeUndefined();
  });

  it('verifies from a custom profile through the connected verification flow', async () => {
    const wrapper: VueWrapper = mountUserProfile({}, {default: customProfile({})});

    expect(wrapper.text()).toContain('email: unverified');
    await buttonIn(wrapper, 'Verify email')!.trigger('click');
    await settle();

    expect(mockExecute).toHaveBeenCalledTimes(1);
    expect(mockExecute).toHaveBeenCalledWith(
      expect.objectContaining({
        payload: {
          flowType: 'SELF_SERVICE',
          handle: 'default-self-attribute-verification-flow',
          inputs: {attribute: 'email'},
        },
      }),
    );
  });
});
