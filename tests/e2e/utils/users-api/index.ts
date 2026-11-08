// Copyright 2025 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

/**
 * Users API Helper
 *
 * Thin wrapper over the backend `/users` endpoint for E2E setup/teardown — creating the shared
 * test user before the suite runs and deleting it afterward.
 *
 * Modeled on thunderid/tests/e2e/utils/users-api/index.ts.
 */

import {send, sendOk} from '../api-request';
import {findUserTypeByName} from '../user-types-api';

export interface ApiUser {
  id: string;
  ouId: string;
  type: string;
}

/** Create a user directly via the API, bypassing any UI. */
export async function createUser(attributes: Record<string, unknown>, type = 'Person'): Promise<ApiUser> {
  const userType = await findUserTypeByName(type);
  if (!userType) {
    throw new Error(`GET /user-types returned no "${type}" user type`);
  }
  const response = await sendOk('POST', '/users', {
    attributes,
    ouId: userType.ouId,
    type: userType.name,
  });
  return (await response.json()) as ApiUser;
}

/** Delete a user by id. Returns false (rather than throwing) if the delete failed. */
export async function deleteUser(userId: string): Promise<boolean> {
  const response = await send('DELETE', `/users/${userId}`);
  return response.ok;
}

/**
 * Set a user's password through the admin API, bypassing any UI. The change-credential specs call
 * this before each attempt. If an attempt fails halfway, the temporary password stays set, and the
 * retry can't sign in with the original one.
 */
export async function setUserPassword(username: string, password: string): Promise<void> {
  const filter = `username eq "${username}"`;
  const response = await sendOk('GET', `/users?filter=${encodeURIComponent(filter)}`);
  const {users} = (await response.json()) as {users?: {attributes?: {username?: string}; id: string}[]};
  const user = (users ?? []).find((candidate) => candidate.attributes?.username === username);
  if (!user) {
    throw new Error(`No user "${username}" to set the password for`);
  }
  await sendOk('POST', `/users/${user.id}/update-credentials`, {credentials: {password}});
}
