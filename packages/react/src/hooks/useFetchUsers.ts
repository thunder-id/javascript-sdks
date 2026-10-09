// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {getUsers, toUserSelectPage} from '@thunderid/browser';
import type {FetchUsers, PagedSelectPage, PagedSelectRequest} from '@thunderid/browser';
import {useCallback} from 'react';
import useManagementEndpoint, {ManagementEndpoint} from './useManagementEndpoint';
import {useResolvedFetcher} from './useResourceQuery';

/**
 * A `FetchUsers` backed by the user directory, authenticated with the signed-in user's access token.
 * Its identity is stable across renders, since a picker resets its loaded pages when the loader changes.
 */
const useFetchUsers = (): FetchUsers => {
  const {baseUrl, url}: ManagementEndpoint = useManagementEndpoint('users');
  const fetcher: ReturnType<typeof useResolvedFetcher> = useResolvedFetcher();

  return useCallback(
    async ({filter, limit, offset, signal}: PagedSelectRequest): Promise<PagedSelectPage> =>
      toUserSelectPage(await getUsers({baseUrl, fetcher, filter, limit, offset, signal, url}), offset),
    [baseUrl, fetcher, url],
  );
};

export default useFetchUsers;
