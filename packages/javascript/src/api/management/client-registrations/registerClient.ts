// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {fromClientRegistrationWire, toClientRegistrationWire} from './mapClientRegistration';
import {ManagementRequestConfig} from '../../../models/api';
import {ClientRegistration, ClientRegistrationRequest} from '../../../models/client-registration';
import requestManagementResource from '../../../utils/requestManagementResource';

/**
 * Configuration for the registerClient request.
 */
export interface RegisterClientConfig extends ManagementRequestConfig {
  /**
   * The client metadata to register.
   */
  payload: ClientRegistrationRequest;
}

/**
 * Registers an OAuth 2.0 client through dynamic client registration (RFC 7591).
 *
 * The result carries the client secret. This is the only time it is returned: it cannot be read
 * back afterwards, so store it securely and never log it.
 *
 * @param config - Request configuration object.
 * @returns A promise that resolves with the registration, including the client secret.
 *
 * @example
 * ```typescript
 * const {clientId, clientSecret} = await registerClient({
 *   baseUrl: 'https://localhost:8090',
 *   payload: {clientName: 'My App', redirectUris: ['https://myapp.example.com/callback']},
 * });
 * ```
 */
const registerClient = async ({payload, ...config}: RegisterClientConfig): Promise<ClientRegistration> =>
  fromClientRegistrationWire(
    await requestManagementResource<Record<string, unknown>>(config, {
      body: toClientRegistrationWire(payload),
      collection: 'oauth2/dcr/register',
      failureMessage: 'Failed to register client',
      method: 'POST',
      operation: 'registerClient',
    }),
  );

export default registerClient;
