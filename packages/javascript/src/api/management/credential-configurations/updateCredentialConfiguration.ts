// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {ManagementRequestConfig} from '../../../models/api';
import {CredentialConfiguration, CredentialConfigurationRequest} from '../../../models/credential-configuration';
import requestManagementResource from '../../../utils/requestManagementResource';

/**
 * Configuration for the updateCredentialConfiguration request.
 */
export interface UpdateCredentialConfigurationConfig extends ManagementRequestConfig {
  /**
   * Identifier of the credential configuration.
   */
  configurationId: string;
  /**
   * The credential configuration's new content. Replaces the stored one.
   */
  payload: CredentialConfigurationRequest;
}

/**
 * Replaces a credential configuration.
 *
 * @param config - Request configuration object.
 * @returns A promise that resolves with the credential configuration as the server stored it.
 *
 * @example
 * ```typescript
 * const item = await updateCredentialConfiguration({baseUrl: 'https://localhost:8090', configurationId, payload});
 * ```
 */
const updateCredentialConfiguration = async ({
  configurationId,
  payload,
  ...config
}: UpdateCredentialConfigurationConfig): Promise<CredentialConfiguration> =>
  requestManagementResource<CredentialConfiguration>(config, {
    body: payload,
    collection: 'openid4vci/credential-configurations',
    failureMessage: 'Failed to update credential configuration',
    id: configurationId,
    method: 'PUT',
    operation: 'updateCredentialConfiguration',
  });

export default updateCredentialConfiguration;
