// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {
  EmbeddedFlowComponent,
  EmbeddedFlowResponseData,
  EmbeddedFlowResponseType,
  EmbeddedFlowType,
  FlowExecutionError,
} from './embedded-flow';

/**
 * Status of a self-service flow step.
 *
 * @experimental Part of the new ThunderID API
 */
export enum EmbeddedSelfServiceFlowStatus {
  /**
   * The flow completed, for example a verification was recorded.
   */
  Complete = 'COMPLETE',

  /**
   * The server refused the operation.
   */
  Error = 'ERROR',

  /**
   * The flow needs more input, such as the emailed code.
   */
  Incomplete = 'INCOMPLETE',
}

/**
 * Response of a self-service flow.
 *
 * @experimental Part of the new ThunderID API
 */
export interface EmbeddedSelfServiceFlowResponse {
  /**
   * Per-step challenge token, sent back on the next request when present.
   */
  challengeToken?: string;

  /**
   * Step data. In self attribute verification, `additionalData.maskedDestination` names where the code was sent.
   */
  data?: EmbeddedFlowResponseData & {components?: EmbeddedFlowComponent[]};

  /**
   * Structured error details when `flowStatus` is `ERROR`, or when a code was rejected.
   */
  error?: FlowExecutionError;

  /**
   * Identifier of this flow execution.
   */
  executionId: string;

  /**
   * Current status of the flow.
   */
  flowStatus: EmbeddedSelfServiceFlowStatus;

  /**
   * Type of the step.
   */
  type?: EmbeddedFlowResponseType;
}

/**
 * Request that starts or continues a self-service flow.
 *
 * @experimental Part of the new ThunderID API
 */
export interface EmbeddedSelfServiceFlowRequest {
  action?: string;
  challengeToken?: string;
  executionId?: string;
  flowType?: EmbeddedFlowType.SelfService;
  /**
   * Handle of the self-service flow to start, such as `default-self-attribute-verification-flow`.
   * Required on the request that starts a flow.
   */
  handle?: string;
  /**
   * Inputs of the step, such as `{attribute: 'email'}` on the request that starts self attribute
   * verification.
   */
  inputs?: Record<string, string>;
}
