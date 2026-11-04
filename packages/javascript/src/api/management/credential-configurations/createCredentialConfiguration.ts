// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {ManagementRequestConfig} from '../../../models/api';
import {CredentialConfiguration, CredentialConfigurationRequest} from '../../../models/credential-configuration';
import requestManagementResource from '../../../utils/requestManagementResource';

/**
 * Configuration for the createCredentialConfiguration request.
 */
export interface CreateCredentialConfigurationConfig extends ManagementRequestConfig {
  /**
   * The credential configuration to create.
   */
  payload: CredentialConfigurationRequest;
}

/**
 * Creates a credential configuration.
 *
 * @param config - Request configuration object.
 * @returns A promise that resolves with the credential configuration as the server stored it.
 *
 * @example
 * ```typescript
 * const item = await createCredentialConfiguration({baseUrl: 'https://localhost:8090', payload: {handle: 'pid', ouId, vct: 'urn:example:pid:1'}});
 * ```
 */
const createCredentialConfiguration = async ({
  payload,
  ...config
}: CreateCredentialConfigurationConfig): Promise<CredentialConfiguration> =>
  requestManagementResource<CredentialConfiguration>(config, {
    body: payload,
    collection: 'openid4vci/credential-configurations',
    failureMessage: 'Failed to create credential configuration',
    method: 'POST',
    operation: 'createCredentialConfiguration',
  });

export default createCredentialConfiguration;
