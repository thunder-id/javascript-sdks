// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

'use server';

import {getTokenPermissions} from '@thunderid/node';
import getSessionId from './getSessionId';
import getClient from '../getClient';

/**
 * Reads the permissions the signed-in user's access token grants, on the server, so only the list of
 * permissions reaches the browser and the token itself never does. Use the result only to decide what
 * to show; the server still checks every request.
 *
 * Never throws across the server action boundary: without a session or a readable token it returns
 * an empty list.
 */
const getGrantedPermissionsAction = async (): Promise<string[]> => {
  const sessionId: string | undefined = await getSessionId();

  if (!sessionId) {
    return [];
  }

  try {
    return getTokenPermissions(await getClient().getAccessToken(sessionId));
  } catch {
    return [];
  }
};

export default getGrantedPermissionsAction;
