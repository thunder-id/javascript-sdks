// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

'use server';

import type {AccessibleOrganizationUnitList} from '@thunderid/browser';
import {thunderid} from '@thunderid/nextjs/server';
import {ConfigSummary, getConfigSummary} from '../lib/serverConfig';
import {loadServerSession, ServerSession} from '../lib/serverSession';

export interface HealthResult {
  detail: string;
  state: 'up' | 'down';
  url: string;
}

/**
 * Probes the ThunderID liveness endpoint from the Next.js server. This is a plain fetch, not an SDK
 * call; it runs on the server because that is where @thunderid/nextjs talks to ThunderID.
 */
export const probeServer = async (): Promise<HealthResult> => {
  const url = `${getConfigSummary().baseUrl}/health/liveness`;

  try {
    const response: Response = await fetch(url, {cache: 'no-store', signal: AbortSignal.timeout(5000)});

    return {detail: response.ok ? 'healthy' : `HTTP ${response.status}`, state: response.ok ? 'up' : 'down', url};
  } catch (error) {
    const cause: unknown = (error as {cause?: unknown})?.cause;
    const reason: string = cause instanceof Error ? cause.message : error instanceof Error ? error.message : '';

    return {detail: `unreachable: ${reason || 'fetch failed'}`, state: 'down', url};
  }
};

export const readConfig = async (): Promise<ConfigSummary> => Promise.resolve(getConfigSummary());

/**
 * A server action that reads the session through `thunderid()`. Returning the access token to the
 * browser defeats the HttpOnly cookie; the playground does it on purpose so the Tokens page can
 * decode it. Do not copy this into an application.
 */
export const readServerSession = async (): Promise<ServerSession> => loadServerSession();

/**
 * Lists the signed-in user's organization units through the public `thunderid()` server API, so the
 * access token stays on the server.
 */
export const readOrganizationUnits = async (): Promise<AccessibleOrganizationUnitList> =>
  (await thunderid()).getAccessibleOrganizationUnits({limit: 5});
