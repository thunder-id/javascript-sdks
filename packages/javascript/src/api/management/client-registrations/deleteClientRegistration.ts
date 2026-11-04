// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {ManagementRequestConfig} from '../../../models/api';
import requestManagementResource from '../../../utils/requestManagementResource';

/**
 * Configuration for the deleteClientRegistration request.
 */
export interface DeleteClientRegistrationConfig extends ManagementRequestConfig {
  /**
   * Identifier of the registered client.
   */
  clientId: string;
}

/**
 * Deletes a dynamically registered client (RFC 7592).
 *
 * @param config - Request configuration object.
 * @returns A promise that resolves once the server has made the change.
 *
 * @example
 * ```typescript
 * await deleteClientRegistration({baseUrl: 'https://localhost:8090', clientId});
 * ```
 */
const deleteClientRegistration = async ({clientId, ...config}: DeleteClientRegistrationConfig): Promise<void> => {
  await requestManagementResource<void>(config, {
    collection: 'oauth2/dcr/register',
    failureMessage: 'Failed to delete client registration',
    id: clientId,
    method: 'DELETE',
    operation: 'deleteClientRegistration',
  });
};

export default deleteClientRegistration;
