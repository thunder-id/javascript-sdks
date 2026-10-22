// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {ENDPOINT_ENV, MANAGEMENT_KEYS, ManagementKey, ManagementOverrides} from './management';

/**
 * What the playground is configured with, as the server sees it. The SDK reads the same variables
 * (`NEXT_PUBLIC_THUNDERID_*`, `THUNDERID_*`) on its own; this summary only reports them, and never
 * returns a secret's value.
 */
export interface ConfigSummary {
  afterSignInUrl: string;
  afterSignOutUrl: string;
  applicationId: string;
  baseUrl: string;
  clientId: string;
  clientSecretSet: boolean;
  /** The `endpoints` overrides the layout hands to `ThunderIDProvider`. */
  endpointOverrides: ManagementOverrides;
  /** The `THUNDERID_ENDPOINT_*` variable that set each override. */
  endpointSources: Partial<Record<ManagementKey, string>>;
  flowSecretSet: boolean;
  scopes: string;
  sessionSecretSet: boolean;
  signInUrl: string;
  signUpUrl: string;
  tlsVerification: boolean;
}

const read = (key: string): string => process.env[key]?.trim() ?? '';

export const DEFAULT_BASE_URL = 'https://localhost:8090';

/**
 * Builds the management `endpoints` overrides from the playground's per-collection
 * `THUNDERID_ENDPOINT_*` variables. Returns `undefined` when nothing is overridden, so the SDK derives `{baseUrl}/{path}`.
 */
export const getManagementEndpointOverrides = (): ManagementOverrides | undefined => {
  const overrides: ManagementOverrides = {};

  MANAGEMENT_KEYS.forEach((key: ManagementKey) => {
    const value: string = read(ENDPOINT_ENV[key]);

    if (value) overrides[key] = value.replace(/\/+$/, '');
  });

  return Object.keys(overrides).length ? overrides : undefined;
};

export const getConfigSummary = (): ConfigSummary => ({
  afterSignInUrl: read('NEXT_PUBLIC_THUNDERID_AFTER_SIGN_IN_URL'),
  afterSignOutUrl: read('NEXT_PUBLIC_THUNDERID_AFTER_SIGN_OUT_URL'),
  applicationId: read('NEXT_PUBLIC_THUNDERID_APPLICATION_ID'),
  baseUrl: (read('NEXT_PUBLIC_THUNDERID_BASE_URL') || DEFAULT_BASE_URL).replace(/\/+$/, ''),
  clientId: read('NEXT_PUBLIC_THUNDERID_CLIENT_ID'),
  clientSecretSet: !!read('THUNDERID_CLIENT_SECRET'),
  endpointOverrides: getManagementEndpointOverrides() ?? {},
  endpointSources: Object.fromEntries(
    MANAGEMENT_KEYS.filter((key: ManagementKey) => read(ENDPOINT_ENV[key])).map((key: ManagementKey) => [
      key,
      ENDPOINT_ENV[key],
    ]),
  ),
  flowSecretSet: !!read('THUNDERID_FLOW_SECRET'),
  scopes: read('NEXT_PUBLIC_THUNDERID_SCOPES'),
  sessionSecretSet: !!read('THUNDERID_SECRET'),
  signInUrl: read('NEXT_PUBLIC_THUNDERID_SIGN_IN_URL'),
  signUpUrl: read('NEXT_PUBLIC_THUNDERID_SIGN_UP_URL'),
  tlsVerification: read('NODE_TLS_REJECT_UNAUTHORIZED') !== '0',
});
