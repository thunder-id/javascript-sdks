// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {ManagementRequestConfig} from '../../../models/api';
import {PresentationDefinition} from '../../../models/presentation-definition';
import requestManagementResource from '../../../utils/requestManagementResource';

/**
 * Configuration for the getPresentationDefinition request.
 */
export interface GetPresentationDefinitionConfig extends ManagementRequestConfig {
  /**
   * Identifier of the presentation definition.
   */
  definitionId: string;
}

/**
 * Retrieves a presentation definition.
 *
 * @param config - Request configuration object.
 * @returns A promise that resolves with the presentation definition.
 *
 * @example
 * ```typescript
 * const item = await getPresentationDefinition({baseUrl: 'https://localhost:8090', definitionId});
 * ```
 */
const getPresentationDefinition = async ({
  definitionId,
  ...config
}: GetPresentationDefinitionConfig): Promise<PresentationDefinition> =>
  requestManagementResource<PresentationDefinition>(config, {
    collection: 'openid4vp/presentation-definitions',
    failureMessage: 'Failed to fetch presentation definition',
    id: definitionId,
    method: 'GET',
    operation: 'getPresentationDefinition',
  });

export default getPresentationDefinition;
