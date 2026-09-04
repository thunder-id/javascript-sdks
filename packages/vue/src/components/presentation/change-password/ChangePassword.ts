// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {
  CredentialConstants,
  CredentialUpdateErrorResult,
  PasswordPolicy,
  Preferences,
  mapCredentialUpdateError,
  resolveChangePasswordPolicy,
  resolveResourceEndpoint,
  supportsPasswordCredential,
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
import BaseChangePassword, {type ChangePasswordValues} from './BaseChangePassword';
import updateMeCredentials from '../../../api/updateMeCredentials';
import useI18n from '../../../composables/useI18n';
import useThunderID from '../../../composables/useThunderID';
import useUser from '../../../composables/useUser';

type ChangePasswordProps = Readonly<{
  cardLayout: boolean;
  className: string;
  policy?: PasswordPolicy;
  preferences?: Preferences;
  showRequirements: boolean;
}>;

const ChangePassword: Component = defineComponent({
  name: 'ChangePassword',
  props: {
    /** Whether to wrap the form in a bordered card. */
    cardLayout: {default: false, type: Boolean},
    /** Extra CSS class added to the root element. */
    className: {default: '', type: String},
    /** Explicit password rules. When omitted, they are derived from the user schema. */
    policy: {default: undefined, type: Object as PropType<PasswordPolicy>},
    /** Component-level preferences to override global preferences. */
    preferences: {default: undefined, type: Object as PropType<Preferences>},
    /** Whether to render the live requirement checklist. */
    showRequirements: {default: true, type: Boolean},
  },
  emits: ['success'],
  setup(props: ChangePasswordProps, {emit}: SetupContext): () => VNode {
    const {baseUrl, endpoints, instanceId, preferences: contextPreferences} = useThunderID();
    const {userSchema} = useUser();
    const {t} = useI18n();

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
      resolveChangePasswordPolicy(userSchema?.value, props.policy),
    );

    async function handleSubmit({currentPassword, newPassword}: ChangePasswordValues): Promise<void> {
      error.value = null;
      fieldErrors.value = {};
      success.value = false;
      loading.value = true;

      try {
        await updateMeCredentials({
          baseUrl,
          currentPassword: currentPassword || undefined,
          instanceId,
          payload: {[CredentialConstants.PASSWORD]: newPassword},
          url: resolveResourceEndpoint('usersMeCredentials', {endpoints}),
        });

        success.value = true;
        emit('success');
      } catch (caughtError: unknown) {
        const {field, message, messageKey}: CredentialUpdateErrorResult = mapCredentialUpdateError(caughtError);
        const text: string = message ?? t(messageKey);

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
      h(BaseChangePassword, {
        cardLayout: props.cardLayout,
        class: withVendorCSSClassPrefix('change-password--styled'),
        className: props.className,
        error: error.value,
        fieldErrors: fieldErrors.value,
        loading: loading.value,
        onSubmit: handleSubmit,
        policy: resolvedPolicy.value,
        preferences: resolvedPreferences.value,
        showRequirements: props.showRequirements,
        success: success.value,
        t,
        unavailable: !supportsPasswordCredential(userSchema?.value),
      });
  },
});

export default ChangePassword;
