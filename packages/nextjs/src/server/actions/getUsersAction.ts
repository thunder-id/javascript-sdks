// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

'use server';

import {mapPagedSelectError, toUserSelectPage} from '@thunderid/node';
import type {ManagedUserListResponse, PagedSelectErrorResult, PagedSelectPage} from '@thunderid/node';
import getSessionId from './getSessionId';
import getClient from '../getClient';

/**
 * Request from the browser. Carries no session ID, token, or URL; the session comes from the request cookie.
 */
export interface GetUsersActionRequest {
  filter?: string;
  limit?: number;
  offset?: number;
}

export type GetUsersActionResult = {page: PagedSelectPage; success: true} | ({success: false} & PagedSelectErrorResult);

const NO_SESSION_MESSAGE_KEY = 'elements.fields.paged_select.load_error';

/**
 * Loads one page of users for a `USER_SELECT` picker using the signed-in user's server-held session.
 *
 * Never throws across the server action boundary; failures are mapped to a plain result.
 */
const getUsersAction = async ({filter, limit, offset}: GetUsersActionRequest = {}): Promise<GetUsersActionResult> => {
  const sessionId: string | undefined = await getSessionId();

  if (!sessionId) {
    return {messageKey: NO_SESSION_MESSAGE_KEY, success: false};
  }

  try {
    const response: ManagedUserListResponse = await getClient().getUsers({filter, limit, offset}, sessionId);

    return {page: toUserSelectPage(response, offset ?? 0), success: true};
  } catch (error) {
    return {...mapPagedSelectError(error), success: false};
  }
};

export default getUsersAction;
