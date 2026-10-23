// Copyright 2020 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import type {AuthorizationDetail} from './oauth-request';

export interface SessionData {
  access_token: string;
  authorization_details?: AuthorizationDetail[];
  created_at: number;
  expires_in: string;
  id_token: string;
  refresh_token?: string;
  scope: string;
  token_type: string;
}

export interface UserSession {
  authorizationDetails?: AuthorizationDetail[];
  scopes: string[];
}
