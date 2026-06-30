/**
 * Copyright (c) 2025-2026, WSO2 LLC. (https://www.wso2.com).
 *
 * WSO2 LLC. licenses this file to you under the Apache License,
 * Version 2.0 (the "License"); you may not use this file except
 * in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied. See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import ThunderIDAPIError from '../errors/ThunderIDAPIError';
import ThunderIDRuntimeError from '../errors/ThunderIDRuntimeError';
import {EmbeddedFlowExecuteRequestConfig} from '../models/embedded-flow';
import {EmbeddedSignInFlowResponse, EmbeddedSignInFlowStatus} from '../models/embedded-signin-flow';
import injectRequestedPermissions from '../utils/injectRequestedPermissions';

/**
 * Detects whether the SDK is executing inside a browser.
 */
const isBrowser = (): boolean =>
  typeof window !== 'undefined' && typeof (window as {document?: unknown}).document !== 'undefined';

/**
 * Executes a step of the embedded sign-in flow against `POST /flow/execute`.
 *
 * @remarks
 * Initiating a new sign-in flow directly from a **browser SPA** (by passing `applicationId` and
 * `flowType`) is not supported — browser SPAs must use the redirect-based OAuth2
 * `authorization_code` + PKCE flow, where the IdP enforces redirection to a pre-registered
 * `redirect_uri`. Attempting it in a browser throws a {@link ThunderIDRuntimeError}.
 *
 * Continuing an existing flow with an `executionId` — the path the hosted sign-in (Gate) UI uses —
 * is unaffected, and server-side (confidential client) code may still initiate the flow.
 */
const executeEmbeddedSignInFlow = async ({
  url,
  baseUrl,
  payload,
  authId,
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

  // Browser SPAs must not initiate a sign-in flow directly; they must use the redirect-based
  // authorization_code + PKCE flow. Server-side (confidential client) initiation and browser-side
  // continuation with an executionId remain supported.
  if (isNewFlowStart && isBrowser()) {
    throw new ThunderIDRuntimeError(
      'Browser single-page applications cannot initiate a sign-in flow directly via ' +
        '"POST /flow/execute". Use the redirect-based OAuth2 authorization_code + PKCE flow instead.',
      'executeEmbeddedSignInFlow-SPAInitiationNotSupported',
      'javascript',
    );
  }

  const basePayload: Record<string, unknown> = isNewFlowStart
    ? injectRequestedPermissions(cleanPayload as Record<string, unknown>)
    : (cleanPayload as Record<string, unknown>);

  const requestPayload: Record<string, unknown> =
    isNewFlowStart || hasOnlyFlowId ? {...basePayload, verbose: true} : basePayload;

  const response: Response = await fetch(endpoint, {
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
      'executeEmbeddedSignInFlow-ResponseError-001',
      'javascript',
      response.status,
      response.statusText,
      'Authorization request failed',
    );
  }

  const flowResponse: EmbeddedSignInFlowResponse = await response.json();

  // IMPORTANT: Only applicable for ThunderID V2 platform.
  // Check if the flow is complete and has an assertion and authId is provided, then call OAuth2 auth callback.
  if (flowResponse.flowStatus === EmbeddedSignInFlowStatus.Complete && flowResponse.assertion && authId) {
    try {
      const oauth2Response: Response = await fetch(`${baseUrl}/oauth2/auth/callback`, {
        body: JSON.stringify({
          assertion: flowResponse.assertion,
          authId,
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
          'executeEmbeddedSignInFlow-OAuth2Error-002',
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
        'executeEmbeddedSignInFlow-OAuth2Error-001',
        'javascript',
        500,
        'Failed to complete OAuth2 authorization after successful embedded sign-in flow.',
        'OAuth2 authorization failed',
      );
    }
  }

  return flowResponse;
};

export default executeEmbeddedSignInFlow;
