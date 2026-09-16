// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {
  CredentialConstants,
  resolveChangeCredentialPolicy,
  supportsCredential,
  withVendorCSSClassPrefix,
  type CredentialUpdateErrorResult,
  type PasswordPolicy,
  type Preferences,
} from '@thunderid/browser';
import {BaseChangeCredential, type ChangePasswordValues, useI18n} from '@thunderid/vue';
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
import NuxtAPIRoutes from '../../constants/NuxtAPIRoutes';
import {useUser} from '#imports';

/**
 * Title-cases a credential attribute name for use as a display-name fallback when the schema
 * declares no `displayName` for it, e.g. `pin` -> `Pin`.
 */
const defaultDisplayName = (attribute: string): string => attribute.charAt(0).toUpperCase() + attribute.slice(1);

interface UpdateUserCredentialsResult extends CredentialUpdateErrorResult {
  success: boolean;
}

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
 * Nuxt-specific ChangeCredential container.
 *
 * Reads `userSchema` from `useUser()` (Nuxt auto-import, re-exported from `@thunderid/vue`) and
 * delegates rendering to {@link BaseChangeCredential} from `@thunderid/vue`, same as
 * `UserProfile` does for the profile form.
 *
 * The write itself goes through `PATCH /api/auth/user/credentials` (`NuxtAPIRoutes.
 * USER_CREDENTIALS`) rather than calling the ThunderID server directly from the browser —
 * matching `UserProfile`'s own `updateProfile`/`NuxtAPIRoutes.USER_PROFILE` round trip, and the
 * same reason `ThunderIDRoot.ts`'s `fetchMeta` proxies flow metadata: the browser never talks
 * to the ThunderID server directly, so no CORS configuration is required there.
 *
 * Preserves the same prop/event API as the Vue SDK's `ChangeCredential` component so consumers
 * don't need to change their templates.
 *
 * @example
 * ```vue
 * <ChangeCredential @success="onPasswordUpdated" />
 * <ChangeCredential attribute="pin" />
 * ```
 */
const ChangeCredential: Component = defineComponent({
  name: 'ChangeCredential',
  props: {
    attribute: {default: CredentialConstants.PASSWORD, type: String},
    cardLayout: {default: false, type: Boolean},
    className: {default: '', type: String},
    policy: {default: undefined, type: Object as PropType<PasswordPolicy>},
    preferences: {default: undefined, type: Object as PropType<Preferences>},
    showRequirements: {default: true, type: Boolean},
    title: {default: undefined, type: String},
  },
  emits: ['success'],
  setup(props: ChangeCredentialProps, {emit}: SetupContext): () => VNode {
    const {userSchema} = useUser();
    const {t} = useI18n();

    const resolvedDisplayName: ComputedRef<string> = computed(
      () => userSchema?.value?.[props.attribute]?.displayName ?? defaultDisplayName(props.attribute),
    );

    const error: Ref<string | null> = ref<string | null>(null);
    const fieldErrors: Ref<Record<string, string>> = ref<Record<string, string>>({});
    const loading: Ref<boolean> = ref(false);
    const success: Ref<boolean> = ref(false);

    const resolvedPolicy: ComputedRef<PasswordPolicy> = computed(() =>
      resolveChangeCredentialPolicy(userSchema?.value, props.attribute, props.policy),
    );

    async function handleSubmit({newPassword}: ChangePasswordValues): Promise<void> {
      error.value = null;
      fieldErrors.value = {};
      success.value = false;
      loading.value = true;

      try {
        const result: UpdateUserCredentialsResult = await $fetch(NuxtAPIRoutes.USER_CREDENTIALS, {
          body: {payload: {[props.attribute]: newPassword}},
          method: 'PATCH',
        });

        if (result.success) {
          success.value = true;
          emit('success');
        } else {
          const text: string =
            result.message ??
            t(result.messageKey, {
              credential: resolvedDisplayName.value,
              credentialLower: resolvedDisplayName.value.toLowerCase(),
            });

          if (result.field) {
            fieldErrors.value = {[result.field]: text};
          } else {
            error.value = text;
          }
        }
      } catch (caughtError: unknown) {
        // The Nitro route itself failed to respond (network error, session expired outright),
        // as opposed to the credential write it performed failing — that case resolves with
        // `success: false` above instead of throwing.
        error.value =
          caughtError instanceof Error && caughtError.message
            ? caughtError.message
            : t('user.change_password.generic.error', {
                credential: resolvedDisplayName.value,
                credentialLower: resolvedDisplayName.value.toLowerCase(),
              });
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
        onSubmit: (values: ChangePasswordValues): void => {
          void handleSubmit(values);
        },
        policy: resolvedPolicy.value,
        preferences: props.preferences,
        showRequirements: props.showRequirements,
        success: success.value,
        t,
        title: props.title,
        unavailable: !supportsCredential(userSchema?.value, props.attribute),
      });
  },
});

export default ChangeCredential;
