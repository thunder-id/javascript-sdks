// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {fromClientRegistrationWire, toClientRegistrationWire} from './mapClientRegistration';
import {ManagementRequestConfig} from '../../../models/api';
import {ClientRegistration, ClientRegistrationUpdateRequest} from '../../../models/client-registration';
import requestManagementResource from '../../../utils/requestManagementResource';

/**
 * Configuration for the updateClientRegistration request.
 */
export interface UpdateClientRegistrationConfig extends ManagementRequestConfig {
  /**
   * Identifier of the registered client.
   */
  clientId: string;
  /**
   * The client's new metadata. Replaces the registered metadata in full: omitted fields are not kept.
   */
  payload: ClientRegistrationUpdateRequest;
}

/**
 * Replaces the registration of a dynamically registered client (RFC 7592). The request carries
 * `client_id`, set from `clientId`; the client ID and secret are kept.
 *
 * @param config - Request configuration object.
 * @returns A promise that resolves with the updated registration.
 *
 * @example
 * ```typescript
 * const registration = await updateClientRegistration({
 *   baseUrl: 'https://localhost:8090',
 *   clientId,
 *   payload: {clientName: 'My Renamed App', redirectUris: ['https://myapp.example.com/callback2']},
 * });
 * ```
 */
const updateClientRegistration = async ({
  clientId,
  payload,
  ...config
}: UpdateClientRegistrationConfig): Promise<ClientRegistration> =>
  fromClientRegistrationWire(
    await requestManagementResource<Record<string, unknown>>(config, {
      body: toClientRegistrationWire({...payload, clientId}),
      collection: 'oauth2/dcr/register',
      failureMessage: 'Failed to update client registration',
      id: clientId,
      method: 'PUT',
      operation: 'updateClientRegistration',
    }),
  );

export default updateClientRegistration;
