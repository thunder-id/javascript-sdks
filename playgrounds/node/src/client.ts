// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

// The explorer shows the `#region` blocks of this file next to the operations that use them.

import {ThunderIDNodeClient} from '@thunderid/node';
import config from './config.ts';

// #region setup
export const client: ThunderIDNodeClient = new ThunderIDNodeClient();

await client.initialize({
  afterSignInUrl: config.afterSignInUrl,
  afterSignOutUrl: config.afterSignOutUrl,
  applicationId: config.applicationId,
  baseUrl: config.baseUrl,
  clientId: config.clientId,
  clientSecret: config.clientSecret,
  // Per-collection management endpoint overrides (see .env.example). Unset keys resolve to
  // {baseUrl}/{collection}.
  endpoints: config.endpoints,
  scopes: config.scopes,
});
// #endregion

// #region serviceSetup
// A second client, for machine-to-machine calls. With grantType 'client_credentials',
// getAccessToken() requests (and caches) a token for the client itself instead of reading a
// user's session.
export const serviceClient: ThunderIDNodeClient = new ThunderIDNodeClient(1);

await serviceClient.initialize({
  baseUrl: config.baseUrl,
  clientId: config.serviceClientId,
  clientSecret: config.serviceClientSecret,
  grantType: 'client_credentials',
  scopes: config.scopes,
});
// #endregion
