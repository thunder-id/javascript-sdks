// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {
  AttributeVerificationConstants,
  EmbeddedFlowType,
  EmbeddedSelfServiceFlowRequest,
  EmbeddedSelfServiceFlowResponse,
  ThunderIDRuntimeError,
  createPackageComponentLogger,
  isVerifiableAttribute,
  resolveResourceEndpoint,
  startCase,
} from '@thunderid/browser';
import {FC, ReactElement, useCallback} from 'react';
import BaseVerifyAttribute, {BaseVerifyAttributeProps} from './BaseVerifyAttribute';
import executeEmbeddedSelfServiceFlow from '../../../api/auth/executeEmbeddedSelfServiceFlow';
import useThunderID from '../../../contexts/ThunderID/useThunderID';
import useUser from '../../../contexts/User/useUser';

const logger: ReturnType<typeof createPackageComponentLogger> = createPackageComponentLogger(
  '@thunderid/react',
  'VerifyAttribute',
);

export type VerifyAttributeProps = Omit<BaseVerifyAttributeProps, 'onInitialize' | 'onSubmit' | 'isInitialized'> & {
  /**
   * Name of the signed-in user's attribute to verify, such as `email`. Only a top-level, single-valued
   * `email` or `mobile` property of the user's schema can be verified; any other is refused without a
   * request, through `onError`, with `VerifyAttribute-handleInitialize-RuntimeError-001`.
   */
  attribute: string;
  /**
   * Handle of the `SELF_SERVICE` flow to run. Defaults to the server's shipped
   * `default-self-attribute-verification-flow`.
   */
  flowHandle?: string;
};

/**
 * VerifyAttribute verifies one of the signed-in user's attributes, such as their email address,
 * by running a self attribute verification flow, named by `flowHandle`. The flow picks the email or
 * mobile path from the attribute's type, sends a code or a link to the attribute's current value,
 * and the component renders the steps it describes; for a link it shows a Done action that calls
 * `onDone`. Every request carries the user's access token. Once the server records the verification,
 * and when the user selects Done, it re-reads the user's profile so `useUser()` shows the new status.
 *
 * It waits for the user schema to load, and refuses an attribute the schema does not declare as an
 * `email` or `mobile` property, since starting a verification sends a message.
 *
 * Mount it with a `key` per attribute: each mount starts a new verification and sends a new code
 * or link.
 *
 * @example
 * ```tsx
 * <VerifyAttribute
 *   attribute="email"
 *   onComplete={() => setOpen(false)}
 *   onCancel={() => setOpen(false)}
 * />
 * ```
 */
const VerifyAttribute: FC<VerifyAttributeProps> = ({
  attribute,
  attributeDisplayName,
  flowHandle = AttributeVerificationConstants.DEFAULT_FLOW_HANDLE,
  onComplete,
  onDone,
  ...rest
}: VerifyAttributeProps): ReactElement => {
  const {baseUrl, endpoints, instanceId, isInitialized, isLoading} = useThunderID();
  const {revalidateProfile, userSchema} = useUser();

  const flowExecuteUrl: string = resolveResourceEndpoint('flowExecute', {endpoints}) ?? `${baseUrl}/flow/execute`;

  // Re-reads the profile so the recorded verification shows; a failure leaves it stale, not broken.
  const refreshProfile = useCallback(async (): Promise<void> => {
    try {
      await revalidateProfile?.();
    } catch (caughtError: unknown) {
      logger.warn('Failed to re-read the user profile after verification:', caughtError);
    }
  }, [revalidateProfile]);

  const handleComplete = useCallback(
    (response: EmbeddedSelfServiceFlowResponse): void => {
      void refreshProfile();
      onComplete?.(response);
    },
    [refreshProfile, onComplete],
  );

  const handleDone = useCallback((): void => {
    void refreshProfile();
    onDone?.();
  }, [refreshProfile, onDone]);

  const execute = useCallback(
    (payload: EmbeddedSelfServiceFlowRequest): Promise<EmbeddedSelfServiceFlowResponse> =>
      executeEmbeddedSelfServiceFlow({
        baseUrl,
        instanceId,
        payload,
        url: flowExecuteUrl,
      }),
    [baseUrl, flowExecuteUrl, instanceId],
  );

  const handleInitialize = useCallback((): Promise<EmbeddedSelfServiceFlowResponse> => {
    if (!isVerifiableAttribute(userSchema, attribute)) {
      return Promise.reject(
        new ThunderIDRuntimeError(
          `Attribute "${attribute}" is not a verifiable email or mobile attribute.`,
          'VerifyAttribute-handleInitialize-RuntimeError-001',
          'react',
          'Only a top-level, single-valued email or mobile attribute of the user schema can be verified.',
        ),
      );
    }

    return execute({
      flowType: EmbeddedFlowType.SelfService,
      handle: flowHandle,
      inputs: {[AttributeVerificationConstants.ATTRIBUTE_INPUT]: attribute},
    });
  }, [execute, attribute, flowHandle, userSchema]);

  return (
    <BaseVerifyAttribute
      {...rest}
      attributeDisplayName={attributeDisplayName ?? userSchema?.[attribute]?.displayName ?? startCase(attribute)}
      // The schema decides whether the attribute can be verified, so wait for it to load.
      isInitialized={isInitialized && !isLoading && userSchema !== null}
      onInitialize={handleInitialize}
      onSubmit={execute}
      onComplete={handleComplete}
      onDone={handleDone}
    />
  );
};

export default VerifyAttribute;
