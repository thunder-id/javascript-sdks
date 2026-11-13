// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {AdministrationFlowConfigKey} from '../../../constants/AdministrationConstants';
import AttributeVerificationConstants from '../../../constants/AttributeVerificationConstants';
import AdministrationFlowError from '../../../errors/AdministrationFlowError';
import ThunderIDAPIError from '../../../errors/ThunderIDAPIError';
import {AdministrationFlowExecutionResponse} from '../../../models/administration';
import {ManagementRequestConfig} from '../../../models/api';
import {EmbeddedFlowType} from '../../../models/embedded-flow';
import requestManagementResource from '../../../utils/requestManagementResource';
import resolveAdministrationFlowHandles from '../administration/resolveAdministrationFlowHandles';
import toServerConfig from '../administration/toServerConfig';

/**
 * Configuration for the sendUserAttributeVerification request.
 */
export interface SendUserAttributeVerificationConfig extends ManagementRequestConfig {
  /**
   * The attribute to verify, such as `email`.
   */
  attribute: string;
  /**
   * Handle of the administrator-initiated verification flow to run. When omitted, the handle the server
   * names under `adminAttributeVerificationFlow` in its `flow` configuration is used.
   */
  handle?: string;
  /**
   * Identifier of the user.
   */
  userId: string;
}

/**
 * What the flow reports once it has sent the verification link. It never returns the link or the address.
 */
export interface SendUserAttributeVerificationResult {
  /**
   * The channel the link went out on, such as `email`.
   */
  channel: string;
  /**
   * Whether the flow's email step sent the link. `false` means the flow ran but no email went out, so check it
   * before telling the administrator the link was sent. Absent when the flow does not report it.
   */
  emailSent?: boolean;
  /**
   * The masked address the link was sent to, such as `j***@example.com`.
   */
  maskedDestination?: string;
}

const OPERATION = 'sendUserAttributeVerification';

/**
 * Sends a user a link to verify one of their attributes, through the server's administrator-initiated
 * verification flow. The flow pauses once the link is sent; the user finishes it from the link, without
 * the administrator. A refused step raises {@link AdministrationFlowError} with the step's code, such as
 * `FET-1114` for a suspended user. Without a `handle`, the flow is the one the server's
 * `adminAttributeVerificationFlow` setting names; when that is unset the call fails with
 * `sendUserAttributeVerification-NotConfiguredError-001`. A flow whose email step sends nothing still
 * resolves, with `emailSent: false`, as the account lifecycle actions do, so callers must check `emailSent`.
 *
 * @param config - Request configuration. Requires `baseUrl` and a token with the root `system` permission.
 * @returns The channel, masked destination and delivery flag reported by the flow.
 * @throws {ThunderIDAPIError} If required input is missing or the request fails.
 * @throws {AdministrationFlowError} If no flow is configured, the flow refuses the start or it does not return the delivery step.
 *
 * @example
 * ```typescript
 * const {emailSent, maskedDestination} = await sendUserAttributeVerification({baseUrl, attribute: 'email', userId});
 * ```
 */
const sendUserAttributeVerification = async ({
  attribute,
  handle,
  userId,
  ...config
}: SendUserAttributeVerificationConfig): Promise<SendUserAttributeVerificationResult> => {
  if (typeof userId !== 'string' || userId.trim() === '' || typeof attribute !== 'string' || !attribute.trim()) {
    throw new ThunderIDAPIError(
      'A user identifier and an attribute are required.',
      `${OPERATION}-ValidationError-002`,
      'javascript',
      400,
      'The provided user identifier or attribute is empty.',
    );
  }

  const flowHandle: string | undefined =
    handle ??
    (await resolveAdministrationFlowHandles(config, [AdministrationFlowConfigKey.ADMIN_ATTRIBUTE_VERIFICATION]))[
      AdministrationFlowConfigKey.ADMIN_ATTRIBUTE_VERIFICATION
    ];

  if (!flowHandle) {
    throw new AdministrationFlowError(
      'No administrator verification flow is configured, so no link was sent. ' +
        `Configure a flow for "${AdministrationFlowConfigKey.ADMIN_ATTRIBUTE_VERIFICATION}" in the server's flow configuration.`,
      `${OPERATION}-NotConfiguredError-001`,
    );
  }

  const result: AdministrationFlowExecutionResponse | undefined = await requestManagementResource(
    toServerConfig(config, OPERATION),
    {
      body: {
        flowType: EmbeddedFlowType.AdminInitiated,
        handle: flowHandle,
        inputs: {
          [AttributeVerificationConstants.ATTRIBUTE_INPUT]: attribute,
          [AttributeVerificationConstants.SUBJECT_INPUT]: userId,
        },
        verbose: true,
      },
      collection: 'flow',
      failureMessage: 'Failed to send the verification link',
      id: 'execute',
      method: 'POST',
      operation: OPERATION,
    },
  );

  const data: Record<string, string> = result?.data?.additionalData ?? {};
  const channel: string | undefined = data[AttributeVerificationConstants.CHANNEL_KEY];

  if (result?.flowStatus === 'INCOMPLETE' && channel) {
    const emailSent: string | undefined = data[AttributeVerificationConstants.EMAIL_SENT_KEY];
    const maskedDestination: string | undefined = data[AttributeVerificationConstants.MASKED_DESTINATION_KEY];

    return {
      channel,
      ...(emailSent !== undefined ? {emailSent: emailSent === 'true'} : {}),
      ...(maskedDestination ? {maskedDestination} : {}),
    };
  }

  if (result?.flowStatus === 'ERROR') {
    const flowError: AdministrationFlowExecutionResponse['error'] = result.error ?? {};

    throw new AdministrationFlowError(
      flowError.message?.defaultValue ?? flowError.description?.defaultValue ?? 'The verification link was not sent.',
      flowError.code ?? `${OPERATION}-FlowError-001`,
      flowError,
    );
  }

  throw new AdministrationFlowError(
    'The verification flow did not report a sent link.',
    `${OPERATION}-UnexpectedStateError-001`,
  );
};

export default sendUserAttributeVerification;
