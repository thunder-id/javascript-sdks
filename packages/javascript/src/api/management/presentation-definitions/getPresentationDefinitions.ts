// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {ManagementRequestConfig} from '../../../models/api';
import {PresentationDefinitionSummary} from '../../../models/presentation-definition';
import requestManagementResource from '../../../utils/requestManagementResource';

/**
 * Configuration for the getPresentationDefinitions request.
 */
export type GetPresentationDefinitionsConfig = ManagementRequestConfig;

/**
 * Retrieves the presentation definitions.
 *
 * @param config - Request configuration object.
 * @returns A promise that resolves with the presentation definitions.
 *
 * @example
 * ```typescript
 * const definitions = await getPresentationDefinitions({baseUrl: 'https://localhost:8090'});
 * ```
 */
const getPresentationDefinitions = async (
  config: GetPresentationDefinitionsConfig,
): Promise<PresentationDefinitionSummary[]> =>
  requestManagementResource<PresentationDefinitionSummary[]>(config, {
    collection: 'openid4vp/presentation-definitions',
    failureMessage: 'Failed to fetch presentation definitions',
    method: 'GET',
    operation: 'getPresentationDefinitions',
  });

export default getPresentationDefinitions;
