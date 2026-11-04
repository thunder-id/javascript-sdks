// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import type {AccessibleOrganizationUnitList, AccessibleOrganizationUnitScope} from '@thunderid/node';
import {defineEventHandler, getQuery, createError} from 'h3';
import type {H3Event} from 'h3';
import ThunderIDNuxtClient from '../../../ThunderIDNuxtClient';
import {verifyAndRehydrateSession} from '../../../utils/serverSession';
import {useRuntimeConfig} from '#imports';

const toInteger = (value: unknown): number | undefined => {
  if (value === undefined || value === null || value === '') {
    return undefined;
  }

  const parsed = Number(value);

  return Number.isInteger(parsed) && parsed >= 0 ? parsed : Number.NaN;
};

/**
 * GET /api/auth/user/organization-units
 *
 * Lists the organization units the signed-in user can access (`/users/me/ous`) with the server-held
 * session. The access token never reaches the browser.
 *
 * Query: optional `scope` (`siblings`), `limit` and `offset`.
 *
 * Response: the page, `{current, organizationUnits, totalResults, startIndex, count}`. `401` means an
 * invalid session, `400` a malformed query; a server rejection keeps its status.
 */
export default defineEventHandler(async (event: H3Event): Promise<AccessibleOrganizationUnitList> => {
  const config: ReturnType<typeof useRuntimeConfig> = useRuntimeConfig();
  const session: Awaited<ReturnType<typeof verifyAndRehydrateSession>> = await verifyAndRehydrateSession(
    event,
    config.thunderid?.sessionSecret,
  );

  if (!session) {
    throw createError({statusCode: 401, statusMessage: 'Unauthorized: Invalid or expired session.'});
  }

  const query: Record<string, unknown> = getQuery(event);
  const limit: number | undefined = toInteger(query.limit);
  const offset: number | undefined = toInteger(query.offset);
  const scope: unknown = query.scope;

  if (Number.isNaN(limit) || Number.isNaN(offset) || (scope !== undefined && scope !== '' && scope !== 'siblings')) {
    throw createError({statusCode: 400, statusMessage: 'Invalid query.'});
  }

  try {
    return await ThunderIDNuxtClient.getInstance().getAccessibleOrganizationUnits(
      {limit, offset, scope: scope === 'siblings' ? (scope as AccessibleOrganizationUnitScope) : undefined},
      session.sessionId,
    );
  } catch (error) {
    const statusCode: number | undefined = (error as {statusCode?: number} | null)?.statusCode;

    throw createError({
      statusCode: statusCode && statusCode >= 400 ? statusCode : 502,
      statusMessage: 'The organization units could not be loaded.',
    });
  }
});
