// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {ManagementRequestConfig} from '../../../models/api';
import requestManagementResource from '../../../utils/requestManagementResource';

/**
 * Configuration for the deletePresentationDefinition request.
 */
export interface DeletePresentationDefinitionConfig extends ManagementRequestConfig {
  /**
   * Identifier of the presentation definition.
   */
  definitionId: string;
}

/**
 * Deletes a presentation definition. Deleting one that does not exist succeeds.
 *
 * @param config - Request configuration object.
 * @returns A promise that resolves once the server has made the change.
 *
 * @example
 * ```typescript
 * await deletePresentationDefinition({baseUrl: 'https://localhost:8090', definitionId});
 * ```
 */
const deletePresentationDefinition = async ({
  definitionId,
  ...config
}: DeletePresentationDefinitionConfig): Promise<void> => {
  await requestManagementResource<void>(config, {
    collection: 'openid4vp/presentation-definitions',
    failureMessage: 'Failed to delete presentation definition',
    id: definitionId,
    method: 'DELETE',
    operation: 'deletePresentationDefinition',
  });
};

export default deletePresentationDefinition;
