// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {fromClientRegistrationWire} from './mapClientRegistration';
import {ManagementRequestConfig} from '../../../models/api';
import {ClientRegistration} from '../../../models/client-registration';
import requestManagementResource from '../../../utils/requestManagementResource';

/**
 * Configuration for the getClientRegistration request.
 */
export interface GetClientRegistrationConfig extends ManagementRequestConfig {
  /**
   * Identifier of the registered client.
   */
  clientId: string;
}

/**
 * Retrieves the registration of a dynamically registered client (RFC 7592). The client secret is
 * not returned.
 *
 * @param config - Request configuration object.
 * @returns A promise that resolves with the registration.
 *
 * @example
 * ```typescript
 * const registration = await getClientRegistration({baseUrl: 'https://localhost:8090', clientId});
 * ```
 */
const getClientRegistration = async ({clientId, ...config}: GetClientRegistrationConfig): Promise<ClientRegistration> =>
  fromClientRegistrationWire(
    await requestManagementResource<Record<string, unknown>>(config, {
      collection: 'oauth2/dcr/register',
      failureMessage: 'Failed to fetch client registration',
      id: clientId,
      method: 'GET',
      operation: 'getClientRegistration',
    }),
  );

export default getClientRegistration;
