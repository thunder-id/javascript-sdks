// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import requestAccessApi from './requestAccessApi';
import {
  AccessAction,
  AccessActionSearchRequest,
  AccessActionSearchResponse,
  AccessEvaluationRequestConfig,
} from '../../models/access-evaluation';

/**
 * Asks which actions a subject may perform on a resource, at the `search_action_endpoint`
 * (`/access/v1/search/action`). Server-side only, like {@link evaluateAccess}.
 *
 * @returns The actions the subject may perform.
 */
const searchActions = async (
  request: AccessActionSearchRequest,
  config: AccessEvaluationRequestConfig,
): Promise<AccessAction[]> => {
  const response: AccessActionSearchResponse = await requestAccessApi<AccessActionSearchResponse>(
    'searchActions',
    'searchAction',
    config,
    request,
  );

  return response?.results ?? [];
};

export default searchActions;
