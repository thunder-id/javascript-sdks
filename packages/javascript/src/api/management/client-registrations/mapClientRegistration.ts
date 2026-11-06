// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {ClientRegistration} from '../../../models/client-registration';

// Dynamic client registration speaks RFC 7591's snake_case on the wire; the SDK models it in camelCase.

/**
 * Every field a registration carries, in the SDK's casing. A field the server returns that is not
 * listed here, such as a language-tagged `client_name#fr`, is not kept.
 */
const FIELDS: readonly (keyof ClientRegistration)[] = [
  'appId',
  'backchannelLogoutUri',
  'clientId',
  'clientName',
  'clientSecret',
  'clientSecretExpiresAt',
  'clientUri',
  'contacts',
  'grantTypes',
  'idTokenEncryptedResponseAlg',
  'idTokenEncryptedResponseEnc',
  'idTokenSignedResponseAlg',
  'jwks',
  'jwksUri',
  'logoUri',
  'ouId',
  'policyUri',
  'postLogoutRedirectUris',
  'redirectUris',
  'requirePushedAuthorizationRequests',
  'responseTypes',
  'scope',
  'tokenEndpointAuthMethod',
  'tosUri',
  'userinfoEncryptedResponseAlg',
  'userinfoEncryptedResponseEnc',
  'userinfoSignedResponseAlg',
];

const toSnakeCase = (field: string): string => field.replace(/[A-Z]/g, (letter: string) => `_${letter.toLowerCase()}`);

/**
 * Converts a registration from the SDK's casing to the wire form, leaving out unset fields. Values,
 * such as a `jwks` document, are sent as given.
 */
export const toClientRegistrationWire = (registration: object): Record<string, unknown> => {
  const wire: Record<string, unknown> = {};

  FIELDS.forEach((field: string) => {
    const value: unknown = (registration as Record<string, unknown>)[field];

    if (value !== undefined) {
      wire[toSnakeCase(field)] = value;
    }
  });

  return wire;
};

/**
 * Converts a registration the server returned from the wire form to the SDK's casing.
 */
export const fromClientRegistrationWire = (wire: Record<string, unknown>): ClientRegistration => {
  const registration: Record<string, unknown> = {};

  FIELDS.forEach((field: string) => {
    const value: unknown = wire?.[toSnakeCase(field)];

    if (value !== undefined) {
      registration[field] = value;
    }
  });

  return registration as unknown as ClientRegistration;
};
