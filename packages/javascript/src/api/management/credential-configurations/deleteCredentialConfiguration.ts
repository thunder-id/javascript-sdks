// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {ManagementRequestConfig} from '../../../models/api';
import requestManagementResource from '../../../utils/requestManagementResource';

/**
 * Configuration for the deleteCredentialConfiguration request.
 */
export interface DeleteCredentialConfigurationConfig extends ManagementRequestConfig {
  /**
   * Identifier of the credential configuration.
   */
  configurationId: string;
}

/**
 * Deletes a credential configuration. Deleting one that does not exist succeeds.
 *
 * @param config - Request configuration object.
 * @returns A promise that resolves once the server has made the change.
 *
 * @example
 * ```typescript
 * await deleteCredentialConfiguration({baseUrl: 'https://localhost:8090', configurationId});
 * ```
 */
const deleteCredentialConfiguration = async ({
  configurationId,
  ...config
}: DeleteCredentialConfigurationConfig): Promise<void> => {
  await requestManagementResource<void>(config, {
    collection: 'openid4vci/credential-configurations',
    failureMessage: 'Failed to delete credential configuration',
    id: configurationId,
    method: 'DELETE',
    operation: 'deleteCredentialConfiguration',
  });
};

export default deleteCredentialConfiguration;
