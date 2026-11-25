// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {createError, getRouterParam} from 'h3';
import type {H3Event} from 'h3';
import {verifyAndRehydrateSession} from './serverSession';
import ThunderIDNuxtClient from '../ThunderIDNuxtClient';
import {useRuntimeConfig} from '#imports';

/**
 * Where a personal agent request goes, with the session's access token.
 */
export interface MeAgentRequestConfig {
  baseUrl: string | undefined;
  headers: Record<string, string>;
  url: string | undefined;
}

/**
 * The agent identifier in the route, refused with `400` when absent.
 *
 * @param event - The request.
 * @returns The identifier.
 */
export const requireAgentId = (event: H3Event): string => {
  const agentId: string | undefined = getRouterParam(event, 'id', {decode: true});

  if (!agentId?.trim()) {
    throw createError({statusCode: 400, statusMessage: 'Invalid agent identifier.'});
  }

  return agentId;
};

/**
 * Runs one `/users/me/agents` request for the session's user, with the server-held session. The access token never
 * reaches the browser. `401` means an invalid session; a server rejection keeps its status, without its reply.
 *
 * @param event - The request.
 * @param request - Performs the request with the session's token and the configured endpoint.
 * @returns The result of the request.
 */
const handleMeAgentRequest = async <T>(
  event: H3Event,
  request: (config: MeAgentRequestConfig) => Promise<T>,
): Promise<T> => {
  const config: ReturnType<typeof useRuntimeConfig> = useRuntimeConfig();
  const session: Awaited<ReturnType<typeof verifyAndRehydrateSession>> = await verifyAndRehydrateSession(
    event,
    config.thunderid?.sessionSecret,
  );

  if (!session) {
    throw createError({statusCode: 401, statusMessage: 'Unauthorized: Invalid or expired session.'});
  }

  try {
    return await request(await ThunderIDNuxtClient.getInstance().getMeAgentRequestConfig(session.sessionId));
  } catch (error) {
    const {code, statusCode} = (error as {code?: string; statusCode?: number} | null) ?? {};

    throw createError({
      data: code ? {code} : undefined,
      statusCode: statusCode && statusCode >= 400 ? statusCode : 502,
      statusMessage: 'The personal agent request failed.',
    });
  }
};

export default handleMeAgentRequest;
