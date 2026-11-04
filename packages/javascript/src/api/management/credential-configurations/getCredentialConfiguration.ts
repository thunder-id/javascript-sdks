// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {ManagementRequestConfig} from '../../../models/api';
import {CredentialConfiguration} from '../../../models/credential-configuration';
import requestManagementResource from '../../../utils/requestManagementResource';

/**
 * Configuration for the getCredentialConfiguration request.
 */
export interface GetCredentialConfigurationConfig extends ManagementRequestConfig {
  /**
   * Identifier of the credential configuration.
   */
  configurationId: string;
}

/**
 * Retrieves a credential configuration.
 *
 * @param config - Request configuration object.
 * @returns A promise that resolves with the credential configuration.
 *
 * @example
 * ```typescript
 * const item = await getCredentialConfiguration({baseUrl: 'https://localhost:8090', configurationId});
 * ```
 */
const getCredentialConfiguration = async ({
  configurationId,
  ...config
}: GetCredentialConfigurationConfig): Promise<CredentialConfiguration> =>
  requestManagementResource<CredentialConfiguration>(config, {
    collection: 'openid4vci/credential-configurations',
    failureMessage: 'Failed to fetch credential configuration',
    id: configurationId,
    method: 'GET',
    operation: 'getCredentialConfiguration',
  });

export default getCredentialConfiguration;
