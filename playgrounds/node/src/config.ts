// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {MANAGEMENT_COLLECTIONS} from '@thunderid/node';

const env = (name: string): string | undefined => {
  const value: string | undefined = process.env[name]?.trim();
  return value === '' ? undefined : value;
};

/** THUNDERID_ENDPOINT_<KEY> names, for example agentTypes -> THUNDERID_ENDPOINT_AGENT_TYPES. */
export const endpointEnvName = (key: string): string =>
  `THUNDERID_ENDPOINT_${key.replace(/[A-Z]/g, (char: string) => `_${char}`).toUpperCase()}`;

/**
 * Paths of the management collections under `baseUrl`. `MANAGEMENT_COLLECTIONS` has no
 * entry for `applications` or `flows`, which the management client also addresses.
 */
export const MANAGEMENT_PATHS: Record<string, string> = {
  ...MANAGEMENT_COLLECTIONS,
  applications: 'applications',
  flows: 'flows',
};

/**
 * `endpoints` overrides for the SDK config, from THUNDERID_ENDPOINT_<KEY>. An unset key resolves to
 * `{baseUrl}/{path}`, the SDK default.
 */
const readEndpoints = (): Record<string, string> => {
  const endpoints: Record<string, string> = {};
  Object.keys(MANAGEMENT_PATHS).forEach((key: string): void => {
    const value: string | undefined = env(endpointEnvName(key));
    if (value) endpoints[key] = value;
  });
  return endpoints;
};

const port = Number(env('PORT') ?? 3003);
const appUrl: string = env('APP_URL') ?? `http://localhost:${port}`;

/** Playground settings, read from the environment (see `.env.example`). */
const config: {
  afterSignInUrl: string;
  afterSignOutUrl: string;
  appUrl: string;
  applicationId: string | undefined;
  baseUrl: string;
  clientId: string | undefined;
  clientSecret: string | undefined;
  endpoints: Record<string, string>;
  port: number;
  scopes: string[];
  serviceClientId: string | undefined;
  serviceClientSecret: string | undefined;
} = {
  afterSignInUrl: env('THUNDERID_AFTER_SIGN_IN_URL') ?? `${appUrl}/login`,
  afterSignOutUrl: env('THUNDERID_AFTER_SIGN_OUT_URL') ?? `${appUrl}/logout`,
  appUrl,
  applicationId: env('THUNDERID_APPLICATION_ID'),
  baseUrl: env('THUNDERID_BASE_URL') ?? 'https://localhost:8090',
  clientId: env('THUNDERID_CLIENT_ID'),
  clientSecret: env('THUNDERID_CLIENT_SECRET'),
  endpoints: readEndpoints(),
  port,
  scopes: (env('THUNDERID_SCOPES') ?? 'openid profile email').split(/\s+/),
  serviceClientId: env('THUNDERID_SERVICE_CLIENT_ID') ?? env('THUNDERID_CLIENT_ID'),
  serviceClientSecret: env('THUNDERID_SERVICE_CLIENT_SECRET') ?? env('THUNDERID_CLIENT_SECRET'),
};

export default config;
