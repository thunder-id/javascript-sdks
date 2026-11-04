// Copyright 2025-2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {collectFlowSessions, takeFlowSessions} from './flowSessions';
import ThunderIDAPIError from '../../errors/ThunderIDAPIError';
import {EmbeddedFlowExecuteRequestConfig, EmbeddedFlowSessionData} from '../../models/embedded-flow';
import {EmbeddedSignInFlowResponse, EmbeddedSignInFlowStatus} from '../../models/embedded-signin-flow';
import injectRequestedPermissions from '../../utils/injectRequestedPermissions';
import logger from '../../utils/logger';

const readErrorAssertion = (body: string): string | undefined => {
  try {
    return (JSON.parse(body) as {errorAssertion?: string}).errorAssertion;
  } catch {
    return undefined;
  }
};

const postAuthCallback = async (
  baseUrl: string | undefined,
  body: Record<string, unknown>,
  headers: HeadersInit | undefined,
): Promise<Record<string, unknown>> => {
  const oauth2Response: Response = await fetch(`${baseUrl}/oauth2/auth/callback`, {
    body: JSON.stringify(body),
    credentials: 'include',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      ...headers,
    } as HeadersInit,
    method: 'POST',
  });

  if (!oauth2Response.ok) {
    const oauth2ErrorText: string = await oauth2Response.text();

    logger.error(
      `OAuth2 authorization failed. The callback responded ` + `${oauth2Response.status} ${oauth2Response.statusText}:`,
      oauth2ErrorText,
    );

    throw new ThunderIDAPIError(
      'OAuth2 authorization failed',
      'executeEmbeddedSignInFlow-OAuth2Error-002',
      'javascript',
      oauth2Response.status,
      oauth2Response.statusText,
    );
  }

  return oauth2Response.json();
};

const relayFailure = async (
  baseUrl: string | undefined,
  authId: string,
  errorAssertion: string,
  headers?: HeadersInit,
  flowResponse?: EmbeddedSignInFlowResponse,
): Promise<EmbeddedSignInFlowResponse> => {
  // A failed sign-in issues no code, so the sessions it collected are not posted.
  takeFlowSessions(authId);

  const oauth2Result: Record<string, unknown> = await postAuthCallback(
    baseUrl,
    {assertion: errorAssertion, authId},
    headers,
  );

  return {
    ...flowResponse,
    flowStatus: EmbeddedSignInFlowStatus.Error,
    redirectUrl: oauth2Result['redirect_uri'],
  } as any;
};

const executeEmbeddedSignInFlow = async ({
  url,
  baseUrl,
  payload,
  authId,
  flowSecret,
  ...requestConfig
}: EmbeddedFlowExecuteRequestConfig): Promise<EmbeddedSignInFlowResponse> => {
  if (!payload) {
    throw new ThunderIDAPIError(
      'Authorization payload is required',
      'executeEmbeddedSignInFlow-ValidationError-002',
      'javascript',
      400,
      'If an authorization payload is not provided, the request cannot be constructed correctly.',
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

  // `ouId` bounds a sign-in to an organization unit, and the server accepts it only on the request that
  // starts the flow; it is never sent on a continuation.
  const startPayload: Record<string, unknown> = cleanPayload as Record<string, unknown>;
  const scopedPayload: Record<string, unknown> =
    !isNewFlowStart && typeof startPayload === 'object' && startPayload !== null && 'ouId' in startPayload
      ? Object.fromEntries(Object.entries(startPayload).filter(([key]: [string, unknown]) => key !== 'ouId'))
      : startPayload;

  const basePayload: Record<string, unknown> = isNewFlowStart
    ? injectRequestedPermissions(scopedPayload)
    : scopedPayload;

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
      // A backend/server-side application presents its Flow Secret to initiate a new flow. It is
      // only relevant on initiation, so it is omitted from continuation requests.
      ...(isNewFlowStart && flowSecret ? {'Flow-Secret': flowSecret} : {}),
      ...requestConfig.headers,
    } as HeadersInit,
    method: requestConfig.method || 'POST',
  });

  if (!response.ok) {
    const errorText: string = await response.text();

    const errorAssertion: string | undefined = readErrorAssertion(errorText);

    if (authId && errorAssertion) {
      return await relayFailure(baseUrl, authId, errorAssertion, requestConfig.headers);
    }

    throw new ThunderIDAPIError(
      errorText,
      'executeEmbeddedSignInFlow-ResponseError-001',
      'javascript',
      response.status,
      response.statusText,
      'Authorization request failed',
    );
  }

  const flowResponse: EmbeddedSignInFlowResponse = await response.json();

  if (authId) {
    collectFlowSessions(authId, flowResponse);
  }

  // IMPORTANT: Only applicable for ThunderID V2 platform.
  // Check if the flow is complete and has an assertion and authId is provided, then call OAuth2 auth callback.
  if (flowResponse.flowStatus === EmbeddedSignInFlowStatus.Complete && flowResponse.assertion && authId) {
    try {
      // When the application asked for the device_sso scope, the server keeps the posted sessions with
      // the code, so the code exchange can return them as the device secret.
      const sessionData: EmbeddedFlowSessionData[] = takeFlowSessions(authId);
      const oauth2Result: Record<string, unknown> = await postAuthCallback(
        baseUrl,
        {assertion: flowResponse.assertion, authId, ...(sessionData.length > 0 ? {sessionData} : {})},
        requestConfig.headers,
      );

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
        'executeEmbeddedSignInFlow-OAuth2Error-001',
        'javascript',
        500,
        'Failed to complete OAuth2 authorization after successful embedded sign-in flow.',
        'OAuth2 authorization failed',
      );
    }
  }

  if (flowResponse.flowStatus === EmbeddedSignInFlowStatus.Error && flowResponse.errorAssertion && authId) {
    return relayFailure(baseUrl, authId, flowResponse.errorAssertion, requestConfig.headers, flowResponse);
  }

  return flowResponse;
};

export default executeEmbeddedSignInFlow;
