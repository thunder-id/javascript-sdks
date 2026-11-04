// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import requestAccessApi from './requestAccessApi';
import {
  AccessEvaluationRequest,
  AccessEvaluationRequestConfig,
  AccessEvaluationResponse,
  AccessEvaluationsRequest,
} from '../../models/access-evaluation';

/**
 * Evaluates a batch of access requests at the `access_evaluations_endpoint`, and returns one decision
 * per evaluation, in order. `defaults` apply to every evaluation that does not set that member itself.
 *
 * Server-side only, like {@link evaluateAccess}. A denial is a result, not an error.
 */
const evaluateAccesses = async (
  {defaults, evaluations}: AccessEvaluationsRequest,
  config: AccessEvaluationRequestConfig,
): Promise<AccessEvaluationResponse[]> => {
  const merged: Partial<AccessEvaluationRequest>[] = (evaluations ?? []).map(
    (evaluation: Partial<AccessEvaluationRequest>) => ({...defaults, ...evaluation}),
  );
  const response: {evaluations?: AccessEvaluationResponse[]} = await requestAccessApi<{
    evaluations?: AccessEvaluationResponse[];
  }>('evaluateAccesses', 'evaluations', config, {evaluations: merged});

  return response?.evaluations ?? [];
};

export default evaluateAccesses;
