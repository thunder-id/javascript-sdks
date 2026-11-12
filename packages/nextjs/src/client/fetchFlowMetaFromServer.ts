// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {FlowMetadataResponse, ThunderIDAPIError, ThunderIDRuntimeError} from '@thunderid/node';
import getFlowMetaAction, {GetFlowMetaActionResult} from '../server/actions/auth/getFlowMetaAction';

/**
 * The `fetchMeta` behind `FlowMetaProvider`: loads flow metadata through {@link getFlowMetaAction} so the browser
 * never calls `baseUrl` directly, and throws the failure the action returned as an SDK error, which
 * `FlowMetaProvider` reports through its `error` state. Resolves to `null` when the server has no flow metadata
 * endpoint.
 */
const fetchFlowMetaFromServer = async (params: {
  applicationId?: string;
  language?: string;
}): Promise<FlowMetadataResponse | null> => {
  const result: GetFlowMetaActionResult = await getFlowMetaAction(params);

  if (result.success) {
    return result.meta;
  }

  if (result.statusCode !== undefined) {
    throw new ThunderIDAPIError(result.message, 'getFlowMetaAction-Error-001', 'nextjs', result.statusCode);
  }

  throw new ThunderIDRuntimeError(result.message, 'getFlowMetaAction-Error-001', 'nextjs');
};

export default fetchFlowMetaFromServer;
