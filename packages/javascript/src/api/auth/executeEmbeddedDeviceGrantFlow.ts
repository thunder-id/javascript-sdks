// Copyright 2025-2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import ThunderIDAPIError from '../../errors/ThunderIDAPIError';
import {EmbeddedFlowExecuteRequestConfig, EmbeddedFlowType} from '../../models/embedded-flow';
import {EmbeddedSignInFlowResponse, EmbeddedSignInFlowStatus} from '../../models/embedded-signin-flow';

export interface EmbeddedDeviceGrantFlowStartPayload {
  applicationId: string;
  flowType: EmbeddedFlowType.DeviceGrant;
  inputs: {user_code?: string};
}

export interface EmbeddedDeviceGrantFlowContinuationPayload {
  action?: string;
  challengeToken?: string;
  executionId: string;
  inputs?: Record<string, unknown>;
}

export type EmbeddedDeviceGrantFlowPayload =
  | EmbeddedDeviceGrantFlowStartPayload
  | EmbeddedDeviceGrantFlowContinuationPayload;

/** Device Grant flow response returned by the Flow Execution API. */
export type EmbeddedDeviceGrantFlowResponse = EmbeddedSignInFlowResponse;

export interface EmbeddedDeviceGrantFlowRequestConfig
  extends Omit<EmbeddedFlowExecuteRequestConfig<EmbeddedDeviceGrantFlowPayload>, 'authId' | 'flowSecret'> {
  payload?: EmbeddedDeviceGrantFlowPayload;
}

interface DeviceGrantCallbackData {
  assertion: string;
  authId: string;
  type: string;
}

const resolveCallbackUrl = (endpoint: string, baseUrl?: string): string => {
  if (baseUrl) {
    return `${baseUrl.replace(/\/$/, '')}/oauth2/auth/callback`;
  }

  const flowEndpoint: URL = new URL(endpoint);
  const basePath: string = flowEndpoint.pathname.replace(/\/flow\/execute\/?$/, '');
  return new URL(`${basePath}/oauth2/auth/callback`, flowEndpoint.origin).toString();
};

const postAuthCallback = async (
  callbackUrl: string,
  body: DeviceGrantCallbackData,
  headers: HeadersInit | undefined,
  allowAccessDenied: boolean,
): Promise<Record<string, unknown>> => {
  const callbackResponse: Response = await fetch(callbackUrl, {
    body: JSON.stringify(body),
    credentials: 'include',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      ...headers,
    } as HeadersInit,
    method: 'POST',
  });

  if (!callbackResponse.ok) {
    const errorText: string = await callbackResponse.text();
    let errorPayload: unknown;
    try {
      errorPayload = JSON.parse(errorText);
    } catch {
      errorPayload = undefined;
    }
    const isAccessDenied: boolean =
      typeof errorPayload === 'object' &&
      errorPayload !== null &&
      'error' in errorPayload &&
      errorPayload.error === 'access_denied';

    // A denied terminal flow is expected to receive access_denied from the callback.
    // Return its flow response so the UI can show the configured failure prompt.
    if (allowAccessDenied && callbackResponse.status === 400 && isAccessDenied) return {};

    throw new ThunderIDAPIError(
      errorText,
      'executeEmbeddedDeviceGrantFlow-CallbackError-001',
      'javascript',
      callbackResponse.status,
      callbackResponse.statusText,
    );
  }

  return (await callbackResponse.json()) as Record<string, unknown>;
};

/**
 * Executes or continues the application's configured Device Grant flow.
 *
 * The request starts at the existing flow execution endpoint. When the terminal flow response
 * carries the server-issued authorization request ID and assertion, this function relays them
 * to the existing OAuth callback endpoint. A start request requires its application ID; an optional
 * user code is submitted as flow input.
 */
const executeEmbeddedDeviceGrantFlow = async ({
  baseUrl,
  payload,
  url,
  ...requestConfig
}: EmbeddedDeviceGrantFlowRequestConfig): Promise<EmbeddedDeviceGrantFlowResponse> => {
  if (!payload) {
    throw new ThunderIDAPIError(
      'A flow payload is required',
      'executeEmbeddedDeviceGrantFlow-ValidationError-001',
      'javascript',
      400,
      'The Device Grant flow cannot be executed without a request payload.',
    );
  }

  if (!url && !baseUrl) {
    throw new ThunderIDAPIError(
      'A server URL is required',
      'executeEmbeddedDeviceGrantFlow-ValidationError-002',
      'javascript',
      400,
      'The Device Grant flow endpoint cannot be resolved without a server URL.',
    );
  }

  const isContinuation: boolean =
    typeof payload === 'object' &&
    payload !== null &&
    'executionId' in payload &&
    typeof payload.executionId === 'string' &&
    payload.executionId.length > 0;
  const isNewDeviceGrantFlow: boolean =
    typeof payload === 'object' &&
    payload !== null &&
    'flowType' in payload &&
    payload.flowType === EmbeddedFlowType.DeviceGrant &&
    'inputs' in payload &&
    typeof payload.applicationId === 'string' &&
    payload.applicationId.trim().length > 0;

  if (!isContinuation && !isNewDeviceGrantFlow) {
    throw new ThunderIDAPIError(
      'The Device Grant flow payload is invalid',
      'executeEmbeddedDeviceGrantFlow-ValidationError-003',
      'javascript',
      400,
      'Start requests require the DEVICE_GRANT flow type and a non-empty application ID; continuation requests require an execution ID.',
    );
  }

  const endpoint: string = url ?? `${baseUrl}/flow/execute`;
  const callbackUrl: string = resolveCallbackUrl(endpoint, baseUrl);

  // Strip any caller-provided `verbose` value. The SDK controls when component
  // metadata is requested, matching the other embedded-flow executors.
  const cleanPayload: EmbeddedDeviceGrantFlowPayload =
    typeof payload === 'object' && payload !== null
      ? (Object.fromEntries(
          Object.entries(payload).filter(([key]: [string, unknown]) => key !== 'verbose'),
        ) as EmbeddedDeviceGrantFlowPayload)
      : payload;

  // Bare execution-ID requests resume a flow and also need verbose component metadata.
  const hasOnlyFlowId: boolean =
    typeof cleanPayload === 'object' &&
    cleanPayload !== null &&
    'executionId' in cleanPayload &&
    Object.keys(cleanPayload).length === 1;

  const requestPayload: Record<string, unknown> =
    isNewDeviceGrantFlow || hasOnlyFlowId
      ? {...cleanPayload, verbose: true}
      : (cleanPayload as unknown as Record<string, unknown>);

  const response: Response = await fetch(endpoint, {
    // Device Grant verification may use the existing browser SSO session.
    // Callers can still override this through requestConfig.
    credentials: 'include',
    ...requestConfig,
    body: JSON.stringify(requestPayload),
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      ...requestConfig.headers,
    } as HeadersInit,
    method: requestConfig.method ?? 'POST',
  });

  if (!response.ok) {
    const errorText: string = await response.text();
    let errorResponse: Record<string, unknown> | undefined;
    try {
      const parsed: unknown = JSON.parse(errorText);
      if (typeof parsed === 'object' && parsed !== null) errorResponse = parsed as Record<string, unknown>;
    } catch {
      // Preserve the API error below when the response is not a JSON flow error.
    }

    const errorData: unknown = errorResponse?.['data'];
    const additionalData: unknown =
      typeof errorData === 'object' && errorData !== null
        ? (errorData as Record<string, unknown>)['additionalData']
        : undefined;
    const errorAssertion: unknown = errorResponse?.['errorAssertion'];
    const authId: unknown =
      typeof additionalData === 'object' && additionalData !== null
        ? (additionalData as Record<string, unknown>)['authId']
        : undefined;
    const callbackType: unknown =
      typeof additionalData === 'object' && additionalData !== null
        ? (additionalData as Record<string, unknown>)['callbackType']
        : undefined;

    if (
      typeof errorAssertion === 'string' &&
      typeof authId === 'string' &&
      typeof callbackType === 'string' &&
      errorResponse
    ) {
      const callbackResponse: Record<string, unknown> = await postAuthCallback(
        callbackUrl,
        {assertion: errorAssertion, authId, type: callbackType},
        requestConfig.headers,
        true,
      );
      const redirectUri: unknown = callbackResponse['redirect_uri'];
      return {
        ...errorResponse,
        errorAssertion,
        flowStatus: EmbeddedSignInFlowStatus.Error,
        ...(typeof redirectUri === 'string' ? {redirectUrl: redirectUri} : {}),
      } as EmbeddedDeviceGrantFlowResponse;
    }

    throw new ThunderIDAPIError(
      errorText,
      'executeEmbeddedDeviceGrantFlow-FlowError-001',
      'javascript',
      response.status,
      response.statusText,
    );
  }

  const flowResponse = (await response.json()) as EmbeddedDeviceGrantFlowResponse;
  const additionalData: Record<string, unknown> | undefined = flowResponse.data?.additionalData;
  const authId: unknown = additionalData?.['authId'];
  const callbackType: unknown = additionalData?.['callbackType'];
  const assertion: string | undefined =
    flowResponse.flowStatus === EmbeddedSignInFlowStatus.Complete
      ? flowResponse.assertion
      : flowResponse.errorAssertion;
  const isTerminal: boolean =
    flowResponse.flowStatus === EmbeddedSignInFlowStatus.Complete ||
    flowResponse.flowStatus === EmbeddedSignInFlowStatus.Error;

  if (isTerminal) {
    if (typeof authId !== 'string' || typeof callbackType !== 'string' || typeof assertion !== 'string') {
      throw new ThunderIDAPIError(
        'The completed Device Grant flow did not include its callback data.',
        'executeEmbeddedDeviceGrantFlow-CallbackError-002',
        'javascript',
      );
    }

    const callbackResponse: Record<string, unknown> = await postAuthCallback(
      callbackUrl,
      {assertion, authId, type: callbackType},
      requestConfig.headers,
      flowResponse.flowStatus === EmbeddedSignInFlowStatus.Error,
    );
    const redirectUri: unknown = callbackResponse['redirect_uri'];
    if (typeof redirectUri === 'string') {
      flowResponse.redirectUrl = redirectUri;
    }
  }

  return flowResponse;
};

export default executeEmbeddedDeviceGrantFlow;
