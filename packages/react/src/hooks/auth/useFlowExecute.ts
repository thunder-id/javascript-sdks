// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {resolveResourceEndpoint} from '@thunderid/browser';
import {useCallback} from 'react';
import useThunderID from '../../contexts/ThunderID/useThunderID';

/**
 * Returns a function that posts a step to the flow execution endpoint with the signed-in user's access token, for
 * the flows an administrator runs from an application, such as an invitation. The flows run on the resource server,
 * which may differ from `baseUrl` (the authorization server) in a trusted-issuer setup, so the `flowExecute`
 * endpoint override is honoured.
 *
 * @returns The function, which resolves to the flow's response body.
 */
const useFlowExecute = <T = unknown>(): ((payload: Record<string, unknown>) => Promise<T>) => {
  const {http, baseUrl, endpoints} = useThunderID();
  const url: string = resolveResourceEndpoint('flowExecute', {endpoints}) ?? `${baseUrl}/flow/execute`;

  return useCallback(
    async (payload: Record<string, unknown>): Promise<T> => {
      const response: any = await http.request({
        data: payload,
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
        method: 'POST',
        url,
      } as any);

      return response.data as T;
    },
    [http, url],
  );
};

export default useFlowExecute;
