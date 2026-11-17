// Copyright 2025-2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {collectFlowSessions, createCallFlowSessionStore, takeFlowSessions} from './flowSessions';
import ThunderIDAPIError from '../../errors/ThunderIDAPIError';
import {
  EmbeddedFlowExecuteRequestConfig as EmbeddedFlowExecuteRequestConfig,
  EmbeddedFlowSessionData,
} from '../../models/embedded-flow';
import {EmbeddedSignUpFlowResponse, EmbeddedSignUpFlowStatus} from '../../models/embedded-signup-flow';
import injectRequestedPermissions from '../../utils/injectRequestedPermissions';

const executeEmbeddedSignUpFlow = async ({
  url,
  baseUrl,
  payload,
  authId,
  sessionStore = createCallFlowSessionStore(),
  ...requestConfig
}: EmbeddedFlowExecuteRequestConfig): Promise<EmbeddedSignUpFlowResponse> => {
  if (!payload) {
    throw new ThunderIDAPIError(
      'Registration payload is required',
      'executeEmbeddedSignUpFlow-ValidationError-002',
      'javascript',
      400,
      'If a registration payload is not provided, the request cannot be constructed correctly.',
    );
  }

  const endpoint: string = url ?? `${baseUrl}/flow/execute`;

  // Strip any user-provided 'verbose' parameter as it should only be used internally
  const cleanPayload: typeof payload =
    typeof payload === 'object' && payload !== null
      ? Object.fromEntries(Object.entries(payload).filter(([key]: [string, unknown]) => key !== 'verbose'))
      : payload;

  // `verbose: true` is required to get the `meta` field in the response that includes component details.
  // Add verbose:true if:
  // 1. payload contains applicationId and flowType (new flow start; may also carry scopes or other init params)
  // 2. payload contains only executionId (flow resumption without step data)
  const isNewFlowStart: boolean =
    typeof cleanPayload === 'object' &&
    cleanPayload !== null &&
    'applicationId' in cleanPayload &&
    'flowType' in cleanPayload;
  const hasOnlyFlowId: boolean =
    typeof cleanPayload === 'object' &&
    cleanPayload !== null &&
    'executionId' in cleanPayload &&
    Object.keys(cleanPayload).length === 1;

  const basePayload: Record<string, unknown> = isNewFlowStart
    ? injectRequestedPermissions(cleanPayload as Record<string, unknown>)
    : (cleanPayload as Record<string, unknown>);

  const requestPayload: Record<string, unknown> =
    isNewFlowStart || hasOnlyFlowId ? {...basePayload, verbose: true} : basePayload;

  const response: Response = await fetch(endpoint, {
    // Send and accept cookies on the cross-origin call to the ThunderID server. A flow that
    // establishes an SSO session returns its handle as a Set-Cookie on this response, and the browser
    // discards it unless credentials are included. Callers can still override this via requestConfig.
    credentials: 'include',
    ...requestConfig,
    body: JSON.stringify(requestPayload),
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      ...requestConfig.headers,
    } as HeadersInit,
    method: requestConfig.method || 'POST',
  });

  if (!response.ok) {
    const errorText: string = await response.text();

    throw new ThunderIDAPIError(
      errorText,
      'executeEmbeddedSignUpFlow-ResponseError-001',
      'javascript',
      response.status,
      response.statusText,
      'Registration request failed',
    );
  }

  const flowResponse: EmbeddedSignUpFlowResponse = await response.json();

  if (authId) {
    await collectFlowSessions(sessionStore, authId, flowResponse);
  }

  // IMPORTANT: Only applicable for ThunderID V2 platform.
  // Check if the flow is complete and has an assertion and authId is provided, then call OAuth2 auth callback.
  if (flowResponse.flowStatus === EmbeddedSignUpFlowStatus.Complete && (flowResponse as any).assertion && authId) {
    try {
      // When the application asked for the device_sso scope, the server keeps the posted sessions with
      // the code, so the code exchange can return them as the device secret.
      const sessionData: EmbeddedFlowSessionData[] = await takeFlowSessions(sessionStore, authId);
      const oauth2Response: Response = await fetch(`${baseUrl}/oauth2/auth/callback`, {
        body: JSON.stringify({
          assertion: (flowResponse as any).assertion,
          authId,
          ...(sessionData.length > 0 ? {sessionData} : {}),
        }),
        credentials: 'include',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
          ...requestConfig.headers,
        } as HeadersInit,
        method: 'POST',
      });

      if (!oauth2Response.ok) {
        const oauth2ErrorText: string = await oauth2Response.text();

        throw new ThunderIDAPIError(
          oauth2ErrorText,
          'executeEmbeddedSignUpFlow-OAuth2Error-002',
          'javascript',
          oauth2Response.status,
          oauth2Response.statusText,
          'OAuth2 authorization failed',
        );
      }

      const oauth2Result: Record<string, unknown> = await oauth2Response.json();

      return {
        flowStatus: flowResponse.flowStatus,
        redirectUrl: oauth2Result['redirect_uri'],
      } as any;
    } catch (authError) {
      if (authError instanceof ThunderIDAPIError) {
        throw authError;
      }

      throw new ThunderIDAPIError(
        authError instanceof Error ? authError.message : 'Unknown error',
        'executeEmbeddedSignUpFlow-OAuth2Error-001',
        'javascript',
        500,
        'Failed to complete OAuth2 authorization after successful embedded sign-up flow.',
        'OAuth2 authorization failed',
      );
    }
  }

  return flowResponse;
};

export default executeEmbeddedSignUpFlow;
