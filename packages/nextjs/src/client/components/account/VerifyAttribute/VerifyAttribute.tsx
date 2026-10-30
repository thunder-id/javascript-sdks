// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

'use client';

import {
  AttributeVerificationConstants,
  EmbeddedFlowType,
  EmbeddedSelfServiceFlowRequest,
  EmbeddedSelfServiceFlowResponse,
  ThunderIDAPIError,
  ThunderIDRuntimeError,
  isVerifiableAttribute,
  startCase,
} from '@thunderid/node';
import {BaseVerifyAttribute, BaseVerifyAttributeProps, useUser} from '@thunderid/react';
import {FC, ReactElement, useCallback} from 'react';
import executeSelfServiceFlowAction, {
  ExecuteSelfServiceFlowActionResult,
} from '../../../../server/actions/auth/executeSelfServiceFlowAction';
import useThunderID from '../../../contexts/ThunderID/useThunderID';

/**
 * Props for the VerifyAttribute component.
 * Mirrors `@thunderid/react`'s `VerifyAttributeProps`, so a consumer moving between the React and
 * Next.js SDKs doesn't need to change how they call it.
 */
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

// Runs one step through the server action, which attaches the session's access token. A failure
// raises `VerifyAttribute-execute-ResponseError-001` with the refusal's status, never the server's reply.
const execute = async (payload: EmbeddedSelfServiceFlowRequest): Promise<EmbeddedSelfServiceFlowResponse> => {
  const result: ExecuteSelfServiceFlowActionResult = await executeSelfServiceFlowAction(payload);

  if (!result.success) {
    throw new ThunderIDAPIError(
      'Self-service flow request failed',
      'VerifyAttribute-execute-ResponseError-001',
      'nextjs',
      result.statusCode,
    );
  }

  return result.data;
};

/**
 * VerifyAttribute verifies one of the signed-in user's attributes, such as their email address, by
 * running a self attribute verification flow named by `flowHandle`.
 *
 * This is the Next.js-specific implementation: it renders `BaseVerifyAttribute` from
 * `@thunderid/react`, but runs every step through `executeSelfServiceFlowAction` (a server action that
 * attaches the server-held session's access token) instead of calling the ThunderID server from the
 * browser. Once the server records the verification, and when the user selects Done after a link is
 * sent, it re-reads the user's profile.
 *
 * Mount it with a `key` per attribute: each mount starts a new verification and sends a new code or
 * link.
 *
 * @example
 * ```tsx
 * <VerifyAttribute attribute="email" onComplete={() => setOpen(false)} onCancel={() => setOpen(false)} />
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
  const {isLoading} = useThunderID();
  const {revalidateProfile, userSchema} = useUser();

  // Re-reads the profile so the recorded verification shows; a failure leaves it stale, not broken.
  const refreshProfile = useCallback(async (): Promise<void> => {
    try {
      await revalidateProfile?.();
    } catch {
      // Non-fatal: the profile stays stale until the next re-read.
    }
  }, [revalidateProfile]);

  const handleInitialize = useCallback((): Promise<EmbeddedSelfServiceFlowResponse> => {
    if (!isVerifiableAttribute(userSchema, attribute)) {
      return Promise.reject(
        new ThunderIDRuntimeError(
          `Attribute "${attribute}" is not a verifiable email or mobile attribute.`,
          'VerifyAttribute-handleInitialize-RuntimeError-001',
          'nextjs',
          'Only a top-level, single-valued email or mobile attribute of the user schema can be verified.',
        ),
      );
    }

    return execute({
      flowType: EmbeddedFlowType.SelfService,
      handle: flowHandle,
      inputs: {[AttributeVerificationConstants.ATTRIBUTE_INPUT]: attribute},
    });
  }, [attribute, flowHandle, userSchema]);

  return (
    <BaseVerifyAttribute
      {...rest}
      attributeDisplayName={attributeDisplayName ?? userSchema?.[attribute]?.displayName ?? startCase(attribute)}
      // The schema decides whether the attribute can be verified, so wait for the session to load.
      isInitialized={!isLoading}
      onInitialize={handleInitialize}
      onSubmit={execute}
      onComplete={(response: EmbeddedSelfServiceFlowResponse): void => {
        void refreshProfile();
        onComplete?.(response);
      }}
      onDone={(): void => {
        void refreshProfile();
        onDone?.();
      }}
    />
  );
};

export default VerifyAttribute;
