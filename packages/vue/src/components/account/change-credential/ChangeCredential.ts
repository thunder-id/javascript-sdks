// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {
  CredentialConstants,
  CredentialUpdateErrorResult,
  PasswordPolicy,
  Preferences,
  mapCredentialUpdateError,
  resolveChangeCredentialPolicy,
  resolveResourceEndpoint,
  supportsCredential,
  withVendorCSSClassPrefix,
} from '@thunderid/browser';
import {
  type Component,
  type ComputedRef,
  type PropType,
  type Ref,
  type SetupContext,
  type VNode,
  computed,
  defineComponent,
  h,
  ref,
} from 'vue';
import BaseChangeCredential, {type ChangePasswordValues} from './BaseChangeCredential';
import updateMeCredentials from '../../../api/account/updateMeCredentials';
import useI18n from '../../../composables/useI18n';
import useThunderID from '../../../composables/useThunderID';
import useUser from '../../../composables/useUser';

/**
 * Title-cases a credential attribute name for use as a display-name fallback when the schema
 * declares no `displayName` for it, e.g. `pin` -> `Pin`.
 */
const defaultDisplayName = (attribute: string): string => attribute.charAt(0).toUpperCase() + attribute.slice(1);

type ChangeCredentialProps = Readonly<{
  attribute: string;
  cardLayout: boolean;
  className: string;
  policy?: PasswordPolicy;
  preferences?: Preferences;
  showRequirements: boolean;
  title?: string;
}>;

/**
 * ChangeCredential lets the signed-in user set a new value for one of their own credentials.
 *
 * It collects only a new value and its confirmation. The self-service credential write path
 * does not verify the account's existing value today, so this component does not ask for one;
 * once server-side current-value verification ships, that field returns without a breaking
 * change to this component's public props.
 */
const ChangeCredential: Component = defineComponent({
  name: 'ChangeCredential',
  props: {
    /**
     * The credential attribute this instance manages, any attribute the user's entity type
     * schema declares `credential: true` (for example `password` or `pin`). Defaults to
     * `password`. Render the component once per credential to let a user manage more than
     * one, for example `<ChangeCredential />` for the password and
     * `<ChangeCredential attribute="pin" />` for a PIN. Every default label, placeholder and
     * message is built from the attribute's own `displayName` in the schema (`GET
     * /users/me/meta`); when the schema carries none, it falls back to the attribute name
     * title-cased (`pin` -> `Pin`).
     */
    attribute: {default: CredentialConstants.PASSWORD, type: String},
    /** Whether to wrap the form in a bordered card. */
    cardLayout: {default: false, type: Boolean},
    /** Extra CSS class added to the root element. */
    className: {default: '', type: String},
    /** Explicit rules. When omitted, they are derived from the user schema. */
    policy: {default: undefined, type: Object as PropType<PasswordPolicy>},
    /** Component-level preferences to override global preferences. */
    preferences: {default: undefined, type: Object as PropType<Preferences>},
    /** Whether to render the live requirement checklist. */
    showRequirements: {default: true, type: Boolean},
    /**
     * Overrides the default "Change {credential}" heading. Pass an empty string to omit the
     * heading entirely, for example when an app's own surrounding layout (a card header, a
     * dialog title) already names the credential and a second heading would be redundant.
     */
    title: {default: undefined, type: String},
  },
  emits: ['success'],
  setup(props: ChangeCredentialProps, {emit}: SetupContext): () => VNode {
    const {baseUrl, endpoints, instanceId, preferences: contextPreferences} = useThunderID();
    const {userSchema} = useUser();
    const {t} = useI18n();
    const resolvedDisplayName: ComputedRef<string> = computed(
      () => userSchema?.value?.[props.attribute]?.displayName ?? defaultDisplayName(props.attribute),
    );

    const resolvedPreferences = computed(() => ({
      ...contextPreferences,
      ...props.preferences,
      user: {
        ...contextPreferences?.user,
        ...props.preferences?.user,
      },
    }));

    const error: Ref<string | null> = ref<string | null>(null);
    const fieldErrors: Ref<Record<string, string>> = ref<Record<string, string>>({});
    const loading: Ref<boolean> = ref(false);
    const success: Ref<boolean> = ref(false);

    const resolvedPolicy: ComputedRef<PasswordPolicy> = computed(() =>
      resolveChangeCredentialPolicy(userSchema?.value, props.attribute, props.policy),
    );

    async function handleSubmit({currentPassword, newPassword}: ChangePasswordValues): Promise<void> {
      error.value = null;
      fieldErrors.value = {};
      success.value = false;
      loading.value = true;

      try {
        await updateMeCredentials({
          baseUrl,
          instanceId,
          payload: {
            currentValue: currentPassword || undefined,
            name: props.attribute,
            newValue: newPassword,
          },
          url: resolveResourceEndpoint('usersMeCredentials', {endpoints}),
        });

        success.value = true;
        emit('success');
      } catch (caughtError: unknown) {
        const {field, message, messageKey}: CredentialUpdateErrorResult = mapCredentialUpdateError(caughtError);
        const text: string =
          message ??
          t(messageKey, {
            credential: resolvedDisplayName.value,
            credentialLower: resolvedDisplayName.value.toLowerCase(),
          });

        if (field) {
          fieldErrors.value = {[field]: text};
        } else {
          error.value = text;
        }
      } finally {
        loading.value = false;
      }
    }

    return (): VNode =>
      h(BaseChangeCredential, {
        cardLayout: props.cardLayout,
        class: withVendorCSSClassPrefix('change-credential--styled'),
        className: props.className,
        credentialDisplayName: resolvedDisplayName.value,
        error: error.value,
        fieldErrors: fieldErrors.value,
        loading: loading.value,
        onSubmit: handleSubmit,
        policy: resolvedPolicy.value,
        preferences: resolvedPreferences.value,
        showRequirements: props.showRequirements,
        success: success.value,
        t,
        title: props.title,
        unavailable: !supportsCredential(userSchema?.value, props.attribute),
      });
  },
});

export default ChangeCredential;
