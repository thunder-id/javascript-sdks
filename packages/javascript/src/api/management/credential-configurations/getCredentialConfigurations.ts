// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {ManagementRequestConfig} from '../../../models/api';
import {CredentialConfigurationSummary} from '../../../models/credential-configuration';
import requestManagementResource from '../../../utils/requestManagementResource';

/**
 * Configuration for the getCredentialConfigurations request.
 */
export type GetCredentialConfigurationsConfig = ManagementRequestConfig;

/**
 * Retrieves the credential configurations.
 *
 * @param config - Request configuration object.
 * @returns A promise that resolves with the credential configurations.
 *
 * @example
 * ```typescript
 * const configurations = await getCredentialConfigurations({baseUrl: 'https://localhost:8090'});
 * ```
 */
const getCredentialConfigurations = async (
  config: GetCredentialConfigurationsConfig,
): Promise<CredentialConfigurationSummary[]> =>
  requestManagementResource<CredentialConfigurationSummary[]>(config, {
    collection: 'openid4vci/credential-configurations',
    failureMessage: 'Failed to fetch credential configurations',
    method: 'GET',
    operation: 'getCredentialConfigurations',
  });

export default getCredentialConfigurations;
