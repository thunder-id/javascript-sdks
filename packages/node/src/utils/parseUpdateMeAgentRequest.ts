// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import type {UpdateMeAgentRequest} from '@thunderid/javascript';

const isStringList = (value: unknown): value is string[] =>
  Array.isArray(value) && value.every((item: unknown) => typeof item === 'string');

/**
 * Reads a personal agent update sent from the browser to a server that holds the session, such as a Next.js server
 * action or a Nuxt server route. It keeps only the fields an owner may change, so nothing else the browser sends
 * reaches ThunderID, and refuses a body of the wrong shape.
 *
 * @param payload - The body as received.
 * @returns The update to send, or `undefined` when the body is not one.
 */
const parseUpdateMeAgentRequest = (payload: unknown): UpdateMeAgentRequest | undefined => {
  if (typeof payload !== 'object' || payload === null) {
    return undefined;
  }

  const {attributes, description, grantTypes, redirectUris} = payload as Record<string, unknown>;

  if (
    typeof attributes !== 'object' ||
    attributes === null ||
    Array.isArray(attributes) ||
    (description !== undefined && typeof description !== 'string') ||
    !isStringList(grantTypes) ||
    !isStringList(redirectUris)
  ) {
    return undefined;
  }

  return {attributes: attributes as Record<string, unknown>, description, grantTypes, redirectUris};
};

export default parseUpdateMeAgentRequest;
