// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {ThunderIDAPIError, resolveResourceEndpoint} from '@thunderid/node';
import {ThunderIDNextConfig} from '../../../models/config';
import getClient from '../../getClient';
import getAccessToken from '../getAccessToken';

/**
 * What a personal agent server action returns. A failure carries the status and code of the refusal, never the
 * server's message, so it crosses the server action boundary as plain data.
 */
export type MeAgentActionResult<T> = {data: T; success: true} | {code?: string; statusCode?: number; success: false};

/**
 * Where a personal agent request goes, with the session's access token, which never leaves the server.
 */
export interface MeAgentRequestConfig {
  baseUrl: string | undefined;
  headers: Record<string, string>;
  url: string | undefined;
}

/**
 * Runs one `/users/me/agents` request for the signed-in user of the request's session. Shared by the personal agent
 * server actions, which take only typed values from the browser and build the request here.
 *
 * @param request - Performs the request with the session's token and the configured endpoint.
 * @returns The result, or the refusal without the server's message.
 */
const runMeAgentRequest = async <T>(
  request: (config: MeAgentRequestConfig) => Promise<T>,
): Promise<MeAgentActionResult<T>> => {
  const accessToken: string | undefined = await getAccessToken();

  if (!accessToken) {
    return {statusCode: 401, success: false};
  }

  try {
    const client = getClient();

    if (!client.isInitialized) {
      await client.initialize({} as ThunderIDNextConfig);
    }

    const config: ThunderIDNextConfig = await client.getConfiguration();
    const data: T = await request({
      baseUrl: config.baseUrl,
      headers: {Authorization: `Bearer ${accessToken}`},
      url: resolveResourceEndpoint('usersMeAgents', config),
    });

    return {data, success: true};
  } catch (error) {
    if (error instanceof ThunderIDAPIError) {
      return {code: error.code, statusCode: error.statusCode, success: false};
    }

    return {success: false};
  }
};

/**
 * Whether a value from the browser is an agent identifier the actions can send on.
 */
export const isAgentId = (value: unknown): value is string => typeof value === 'string' && value.trim().length > 0;

export default runMeAgentRequest;
