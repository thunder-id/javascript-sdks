// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {ManagementRequestConfig} from '../../../models/api';
import {PresentationDefinition, PresentationDefinitionRequest} from '../../../models/presentation-definition';
import requestManagementResource from '../../../utils/requestManagementResource';

/**
 * Configuration for the updatePresentationDefinition request.
 */
export interface UpdatePresentationDefinitionConfig extends ManagementRequestConfig {
  /**
   * Identifier of the presentation definition.
   */
  definitionId: string;
  /**
   * The presentation definition's new content. Replaces the stored one.
   */
  payload: PresentationDefinitionRequest;
}

/**
 * Replaces a presentation definition.
 *
 * @param config - Request configuration object.
 * @returns A promise that resolves with the presentation definition as the server stored it.
 *
 * @example
 * ```typescript
 * const item = await updatePresentationDefinition({baseUrl: 'https://localhost:8090', definitionId, payload});
 * ```
 */
const updatePresentationDefinition = async ({
  definitionId,
  payload,
  ...config
}: UpdatePresentationDefinitionConfig): Promise<PresentationDefinition> =>
  requestManagementResource<PresentationDefinition>(config, {
    body: payload,
    collection: 'openid4vp/presentation-definitions',
    failureMessage: 'Failed to update presentation definition',
    id: definitionId,
    method: 'PUT',
    operation: 'updatePresentationDefinition',
  });

export default updatePresentationDefinition;
