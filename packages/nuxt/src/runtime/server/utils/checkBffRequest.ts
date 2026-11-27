// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {BffConstants, checkBffRequest, getRequestOrigins} from '@thunderid/node';
import {getRequestHeaders, getRequestURL, setResponseStatus} from 'h3';
import type {H3Event} from 'h3';

/**
 * Applies the BFF contract's CSRF rules to a Nuxt route: the `X-Requested-With: XMLHttpRequest` header,
 * no cross-site `Sec-Fetch-Site`, and an `Origin` on the app's own origin. Reads only the headers, so the
 * route can still read the body.
 *
 * @returns The `403` body to answer with, or `undefined` when the request is accepted.
 */
export function refuseCrossSiteRequest(event: H3Event): {error: string; message: string} | undefined {
  const url: URL = getRequestURL(event);
  const headers = new Headers();

  Object.entries(getRequestHeaders(event)).forEach(([name, value]: [string, string | undefined]) => {
    if (value !== undefined) {
      headers.set(name, value);
    }
  });

  const request = new Request(url, {headers, method: event.method});
  const refusal: string | undefined = checkBffRequest(request, getRequestOrigins(request));

  if (!refusal) {
    return undefined;
  }

  setResponseStatus(event, 403);

  return {error: BffConstants.Errors.FORBIDDEN, message: refusal};
}
