// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {ThunderIDAPIError} from '@thunderid/browser';

/**
 * Waits for a request to a personal agent server route and returns its body, or raises its refusal as a
 * {@link ThunderIDAPIError} carrying the server's status and the SDK's error code. The Next.js SDK raises the same
 * error from its server actions, so a refusal reads the same in both.
 *
 * @param request - The pending `$fetch` call.
 * @returns The response body.
 */
const loadMeAgentFromRoute = async <T>(request: Promise<T>): Promise<T> => {
  try {
    return await request;
  } catch (error) {
    const failure: {data?: {data?: {code?: string}}; statusCode?: number} | null = error as {
      data?: {data?: {code?: string}};
      statusCode?: number;
    } | null;

    throw new ThunderIDAPIError(
      'Personal agent request failed',
      failure?.data?.data?.code ?? 'PersonalAgents-ResponseError-001',
      'nuxt',
      failure?.statusCode,
    );
  }
};

export default loadMeAgentFromRoute;
