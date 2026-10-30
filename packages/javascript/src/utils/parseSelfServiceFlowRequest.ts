// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {EmbeddedFlowType} from '../models/embedded-flow';
import {EmbeddedSelfServiceFlowRequest} from '../models/embedded-self-service-flow';

/**
 * Result of {@link parseSelfServiceFlowRequest}: the request to send, or the field that made it invalid.
 */
export type SelfServiceFlowRequestParseResult = {invalid: string} | {request: EmbeddedSelfServiceFlowRequest};

const isNonEmptyString = (value: unknown): value is string => typeof value === 'string' && value !== '';

const isStringRecord = (value: unknown): value is Record<string, string> =>
  !!value &&
  typeof value === 'object' &&
  !Array.isArray(value) &&
  Object.values(value as Record<string, unknown>).every((entry: unknown) => typeof entry === 'string');

/**
 * Checks a self-service flow step that a browser sent to a server-side SDK, which attaches the
 * session's access token before forwarding it. Such an endpoint is public, so its types protect
 * nothing.
 *
 * Only the fields of a step are kept, so a caller cannot add a user or application identifier. A
 * request without an `executionId` starts a flow, and must name a `SELF_SERVICE` flow by its handle,
 * so the endpoint cannot start a flow of another type with the user's token.
 *
 * @param raw - The request body as received.
 * @returns The request to send, or the name of the first invalid field.
 */
const parseSelfServiceFlowRequest = (raw: unknown): SelfServiceFlowRequestParseResult => {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return {invalid: 'body'};
  }

  const {action, challengeToken, executionId, flowType, handle, inputs} = raw as Record<string, unknown>;

  if (inputs !== undefined && !isStringRecord(inputs)) {
    return {invalid: 'inputs'};
  }

  if (executionId !== undefined) {
    if (!isNonEmptyString(executionId)) return {invalid: 'executionId'};
    if (action !== undefined && typeof action !== 'string') return {invalid: 'action'};
    if (challengeToken !== undefined && typeof challengeToken !== 'string') return {invalid: 'challengeToken'};

    return {
      request: {
        executionId,
        ...(action ? {action} : {}),
        ...(challengeToken ? {challengeToken} : {}),
        ...(inputs ? {inputs} : {}),
      },
    };
  }

  if (flowType !== EmbeddedFlowType.SelfService) return {invalid: 'flowType'};
  if (!isNonEmptyString(handle)) return {invalid: 'handle'};

  return {request: {flowType: EmbeddedFlowType.SelfService, handle, ...(inputs ? {inputs} : {})}};
};

export default parseSelfServiceFlowRequest;
