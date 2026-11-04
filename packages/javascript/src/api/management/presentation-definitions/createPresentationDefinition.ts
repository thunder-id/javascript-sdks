// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {ManagementRequestConfig} from '../../../models/api';
import {PresentationDefinition, PresentationDefinitionRequest} from '../../../models/presentation-definition';
import requestManagementResource from '../../../utils/requestManagementResource';

/**
 * Configuration for the createPresentationDefinition request.
 */
export interface CreatePresentationDefinitionConfig extends ManagementRequestConfig {
  /**
   * The presentation definition to create.
   */
  payload: PresentationDefinitionRequest;
}

/**
 * Creates a presentation definition.
 *
 * @param config - Request configuration object.
 * @returns A promise that resolves with the presentation definition as the server stored it.
 *
 * @example
 * ```typescript
 * const item = await createPresentationDefinition({baseUrl: 'https://localhost:8090', payload: {handle: 'pid', ouId, vct: 'urn:example:pid:1'}});
 * ```
 */
const createPresentationDefinition = async ({
  payload,
  ...config
}: CreatePresentationDefinitionConfig): Promise<PresentationDefinition> =>
  requestManagementResource<PresentationDefinition>(config, {
    body: payload,
    collection: 'openid4vp/presentation-definitions',
    failureMessage: 'Failed to create presentation definition',
    method: 'POST',
    operation: 'createPresentationDefinition',
  });

export default createPresentationDefinition;
