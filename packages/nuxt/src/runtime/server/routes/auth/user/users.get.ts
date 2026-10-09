// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {mapPagedSelectError, toUserSelectPage} from '@thunderid/node';
import type {ManagedUserListResponse} from '@thunderid/node';
import {defineEventHandler, getQuery, createError} from 'h3';
import type {H3Event} from 'h3';
import type {ThunderIDGetUsersResult} from '../../../../types';
import ThunderIDNuxtClient from '../../../ThunderIDNuxtClient';
import {verifyAndRehydrateSession} from '../../../utils/serverSession';
import {useRuntimeConfig} from '#imports';

/** Upper bound on the `filter` expression the browser may send; the directory only takes a single equality expression. */
const MAX_FILTER_LENGTH = 512;

/**
 * Reads an optional non-negative integer query parameter; throws `400` if it is not a single plain integer.
 */
const readIntegerParam = (raw: unknown, name: string): number | undefined => {
  if (raw === undefined) {
    return undefined;
  }

  if (typeof raw !== 'string' || !/^\d+$/.test(raw)) {
    throw createError({statusCode: 400, statusMessage: `Invalid \`${name}\` parameter.`});
  }

  return Number(raw);
};

/**
 * GET /api/auth/users
 *
 * Loads one page of users for a `USER_SELECT` picker using the signed-in user's server-held session.
 *
 * Query: optional `limit`, `offset` and `filter`. No session ID, token, or URL is accepted from the browser.
 *
 * Response: `{success: true, page}` or `{success: false, message?, messageKey}`. A failed directory call returns `200` with `success: false`; `401` means an invalid session and `400` a malformed query.
 */
export default defineEventHandler(async (event: H3Event): Promise<ThunderIDGetUsersResult> => {
  const config: ReturnType<typeof useRuntimeConfig> = useRuntimeConfig();
  const sessionSecret: string | undefined = config.thunderid?.sessionSecret;

  const session: Awaited<ReturnType<typeof verifyAndRehydrateSession>> = await verifyAndRehydrateSession(
    event,
    sessionSecret,
  );
  if (!session) {
    throw createError({statusCode: 401, statusMessage: 'Unauthorized: Invalid or expired session.'});
  }

  const {filter: rawFilter, limit: rawLimit, offset: rawOffset}: Record<string, unknown> = getQuery(event);
  const limit: number | undefined = readIntegerParam(rawLimit, 'limit');
  const offset: number | undefined = readIntegerParam(rawOffset, 'offset');

  if (rawFilter !== undefined && (typeof rawFilter !== 'string' || rawFilter.length > MAX_FILTER_LENGTH)) {
    throw createError({statusCode: 400, statusMessage: 'Invalid `filter` parameter.'});
  }
  const filter: string | undefined = rawFilter === undefined || rawFilter === '' ? undefined : rawFilter;

  try {
    const client: ThunderIDNuxtClient = ThunderIDNuxtClient.getInstance();
    const response: ManagedUserListResponse = await client.getUsers({filter, limit, offset}, session.sessionId);

    return {page: toUserSelectPage(response, offset ?? 0), success: true};
  } catch (error) {
    return {...mapPagedSelectError(error), success: false};
  }
});
