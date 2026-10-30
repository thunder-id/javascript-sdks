// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {
  AttributeVerificationConstants,
  EmbeddedFlowType,
  ThunderIDRuntimeError,
  isVerifiableAttribute,
  startCase,
  withVendorCSSClassPrefix,
  type EmbeddedSelfServiceFlowRequest,
  type EmbeddedSelfServiceFlowResponse,
  type Preferences,
} from '@thunderid/browser';
import {BaseVerifyAttribute} from '@thunderid/vue';
import {
  type Component,
  type PropType,
  type Ref,
  type SetupContext,
  type VNode,
  defineComponent,
  h,
  onMounted,
  ref,
} from 'vue';
import NuxtAPIRoutes from '../../constants/NuxtAPIRoutes';
import {useUser} from '#imports';

type VerifyAttributeProps = Readonly<{
  attribute: string;
  attributeDisplayName?: string;
  className: string;
  flowHandle: string;
  onCancel?: () => void;
  onComplete?: (response: EmbeddedSelfServiceFlowResponse) => void;
  onDone?: () => void;
  onError?: (error: Error) => void;
  preferences?: Preferences;
  showSubtitle: boolean;
  showTitle: boolean;
  size: 'small' | 'medium' | 'large';
  variant: 'outlined' | 'flat';
}>;

/**
 * Nuxt-specific VerifyAttribute container.
 *
 * Renders {@link BaseVerifyAttribute} from `@thunderid/vue`, but runs every step through
 * `POST /api/auth/user/self-service-flow` (`NuxtAPIRoutes.USER_SELF_SERVICE_FLOW`), which attaches the
 * access token of the server-held session, rather than calling the ThunderID server from the browser,
 * where no token is held. Once the server records the verification, and when the user selects Done
 * after a link is sent, it re-reads the profile through `useUser().revalidateProfile`.
 *
 * Preserves the same prop/event API as the Vue SDK's `VerifyAttribute` component. An attribute the schema
 * does not declare as `email` or `mobile` is refused without a request, through `onError`, with
 * `VerifyAttribute-handleInitialize-RuntimeError-001`.
 *
 * @example
 * ```vue
 * <VerifyAttribute attribute="email" @complete="open = false" @cancel="open = false" />
 * ```
 */
const VerifyAttribute: Component = defineComponent({
  name: 'VerifyAttribute',
  props: {
    attribute: {required: true, type: String},
    attributeDisplayName: {default: undefined, type: String},
    className: {default: '', type: String},
    flowHandle: {default: AttributeVerificationConstants.DEFAULT_FLOW_HANDLE, type: String},
    onCancel: {default: undefined, type: Function as PropType<() => void>},
    onComplete: {default: undefined, type: Function as PropType<(response: EmbeddedSelfServiceFlowResponse) => void>},
    onDone: {default: undefined, type: Function as PropType<() => void>},
    onError: {default: undefined, type: Function as PropType<(error: Error) => void>},
    preferences: {default: undefined, type: Object as PropType<Preferences>},
    showSubtitle: {default: true, type: Boolean},
    showTitle: {default: true, type: Boolean},
    size: {default: 'medium', type: String as PropType<'small' | 'medium' | 'large'>},
    variant: {default: 'outlined', type: String as PropType<'outlined' | 'flat'>},
  },
  setup(props: VerifyAttributeProps, {slots}: SetupContext): () => VNode {
    const {revalidateProfile, userSchema} = useUser();
    // Start the flow on the client only; a server render would send a code that hydration sends again.
    const isMounted: Ref<boolean> = ref(false);
    onMounted(() => {
      isMounted.value = true;
    });

    const execute = (payload: EmbeddedSelfServiceFlowRequest): Promise<EmbeddedSelfServiceFlowResponse> =>
      $fetch<EmbeddedSelfServiceFlowResponse>(NuxtAPIRoutes.USER_SELF_SERVICE_FLOW, {body: payload, method: 'POST'});

    const handleInitialize = (): Promise<EmbeddedSelfServiceFlowResponse> => {
      if (!isVerifiableAttribute(userSchema?.value, props.attribute)) {
        return Promise.reject(
          new ThunderIDRuntimeError(
            `Attribute "${props.attribute}" is not a verifiable email or mobile attribute.`,
            'VerifyAttribute-handleInitialize-RuntimeError-001',
            'nuxt',
            'Only a top-level, single-valued email or mobile attribute of the user schema can be verified.',
          ),
        );
      }

      return execute({
        flowType: EmbeddedFlowType.SelfService,
        handle: props.flowHandle,
        inputs: {[AttributeVerificationConstants.ATTRIBUTE_INPUT]: props.attribute},
      });
    };

    // Re-reads the profile so the recorded verification shows; a failure leaves it stale, not broken.
    const refreshProfile = async (): Promise<void> => {
      try {
        await revalidateProfile?.();
      } catch {
        // Non-fatal: the profile stays stale until the next navigation.
      }
    };

    return (): VNode =>
      h(
        BaseVerifyAttribute,
        {
          attributeDisplayName:
            props.attributeDisplayName ??
            userSchema?.value?.[props.attribute]?.displayName ??
            startCase(props.attribute),
          class: withVendorCSSClassPrefix('verify-attribute--styled'),
          className: props.className,
          isInitialized: isMounted.value,
          onCancel: props.onCancel,
          onComplete: (response: EmbeddedSelfServiceFlowResponse): void => {
            void refreshProfile();
            props.onComplete?.(response);
          },
          onDone: (): void => {
            void refreshProfile();
            props.onDone?.();
          },
          onError: props.onError,
          onInitialize: handleInitialize,
          onSubmit: execute,
          preferences: props.preferences,
          showSubtitle: props.showSubtitle,
          showTitle: props.showTitle,
          size: props.size,
          variant: props.variant,
        },
        slots,
      );
  },
});

export default VerifyAttribute;
