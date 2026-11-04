// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import requestAccessApi from './requestAccessApi';
import {
  AccessEvaluationRequest,
  AccessEvaluationRequestConfig,
  AccessEvaluationResponse,
} from '../../models/access-evaluation';

/**
 * Asks the server's AuthZEN policy decision point whether a subject may perform an action on a resource,
 * at the `access_evaluation_endpoint` from `/.well-known/authzen-configuration`.
 *
 * Server-side only: it is authorized by the server-level secret in the `Direct-Auth-Secret` header,
 * which a browser or mobile app cannot hold.
 *
 * A denial is a result: `{decision: false}`, with the reason in `context`. Only a transport failure or a
 * 4xx/5xx answer throws.
 *
 * @example
 * ```typescript
 * const {decision} = await evaluateAccess(
 *   {subject: {type: 'user', id: userId}, resource: {type: 'https://api.example.com/booking'}, action: {name: 'booking:read'}},
 *   {baseUrl: 'https://localhost:8090', secret: process.env.THUNDERID_DIRECT_AUTH_SECRET!},
 * );
 * ```
 */
const evaluateAccess = (
  request: AccessEvaluationRequest,
  config: AccessEvaluationRequestConfig,
): Promise<AccessEvaluationResponse> =>
  requestAccessApi<AccessEvaluationResponse>('evaluateAccess', 'evaluation', config, request);

export default evaluateAccess;
