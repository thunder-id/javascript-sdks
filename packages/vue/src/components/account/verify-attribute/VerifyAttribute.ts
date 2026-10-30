// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {
  AttributeVerificationConstants,
  EmbeddedFlowType,
  EmbeddedSelfServiceFlowRequest,
  EmbeddedSelfServiceFlowResponse,
  Preferences,
  ThunderIDRuntimeError,
  isVerifiableAttribute,
  resolveResourceEndpoint,
  startCase,
  withVendorCSSClassPrefix,
} from '@thunderid/browser';
import {type Component, type PropType, type SetupContext, type VNode, defineComponent, h} from 'vue';
import BaseVerifyAttribute from './BaseVerifyAttribute';
import executeEmbeddedSelfServiceFlow from '../../../api/auth/executeEmbeddedSelfServiceFlow';
import useThunderID from '../../../composables/useThunderID';
import useUser from '../../../composables/useUser';
import {createVueLogger} from '../../../utils/logger';

const logger: ReturnType<typeof createVueLogger> = createVueLogger('VerifyAttribute');

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
 * VerifyAttribute verifies one of the signed-in user's attributes, such as their email address, by
 * running a self attribute verification flow named by `flowHandle`. The flow picks the email or mobile
 * path from the attribute's type, sends a code or a link to the attribute's current value, and the
 * component renders the steps it describes; for a link it shows a Done action. Every request carries
 * the user's access token. Once the server records the verification, and when the user selects Done,
 * it re-reads the user's profile so `useUser()` shows the new status.
 *
 * It waits for the user schema to load, and refuses an attribute the schema does not declare as an
 * `email` or `mobile` property, since starting a verification sends a message.
 *
 * Mount it with a `key` per attribute: each mount starts a new verification and sends a new code or
 * link.
 *
 * @example
 * ```vue
 * <VerifyAttribute attribute="email" @complete="open = false" @cancel="open = false" />
 * ```
 */
const VerifyAttribute: Component = defineComponent({
  name: 'VerifyAttribute',
  props: {
    /**
     * Name of the signed-in user's attribute to verify, such as `email`. Only a top-level,
     * single-valued `email` or `mobile` property of the user's schema can be verified; any other is
     * refused without a request, through `onError`, with `VerifyAttribute-handleInitialize-RuntimeError-001`.
     */
    attribute: {required: true, type: String},
    /** Label of the attribute; defaults to the schema's display name. */
    attributeDisplayName: {default: undefined, type: String},
    /** Extra CSS class added to the root element. */
    className: {default: '', type: String},
    /** Handle of the `SELF_SERVICE` flow to run. */
    flowHandle: {default: AttributeVerificationConstants.DEFAULT_FLOW_HANDLE, type: String},
    onCancel: {default: undefined, type: Function as PropType<() => void>},
    onComplete: {default: undefined, type: Function as PropType<(response: EmbeddedSelfServiceFlowResponse) => void>},
    onDone: {default: undefined, type: Function as PropType<() => void>},
    onError: {default: undefined, type: Function as PropType<(error: Error) => void>},
    /** Component-level preferences to override global preferences. */
    preferences: {default: undefined, type: Object as PropType<Preferences>},
    showSubtitle: {default: true, type: Boolean},
    showTitle: {default: true, type: Boolean},
    size: {default: 'medium', type: String as PropType<'small' | 'medium' | 'large'>},
    variant: {default: 'outlined', type: String as PropType<'outlined' | 'flat'>},
  },
  setup(props: VerifyAttributeProps, {slots}: SetupContext): () => VNode {
    const {baseUrl, endpoints, instanceId, isInitialized, isLoading} = useThunderID();
    const {revalidateProfile, userSchema} = useUser();

    const flowExecuteUrl: string = resolveResourceEndpoint('flowExecute', {endpoints}) ?? `${baseUrl}/flow/execute`;

    const execute = (payload: EmbeddedSelfServiceFlowRequest): Promise<EmbeddedSelfServiceFlowResponse> =>
      executeEmbeddedSelfServiceFlow({
        baseUrl,
        instanceId,
        payload,
        url: flowExecuteUrl,
      });

    const handleInitialize = (): Promise<EmbeddedSelfServiceFlowResponse> => {
      if (!isVerifiableAttribute(userSchema?.value, props.attribute)) {
        return Promise.reject(
          new ThunderIDRuntimeError(
            `Attribute "${props.attribute}" is not a verifiable email or mobile attribute.`,
            'VerifyAttribute-handleInitialize-RuntimeError-001',
            'vue',
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
      } catch (caughtError: unknown) {
        logger.warn('Failed to re-read the user profile after verification:', caughtError);
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
          // The schema decides whether the attribute can be verified, so wait for it to load.
          isInitialized: isInitialized.value && !isLoading.value && !!userSchema?.value,
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
