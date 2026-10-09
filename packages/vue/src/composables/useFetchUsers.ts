// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {resolveResourceEndpoint, toUserSelectPage} from '@thunderid/browser';
import type {FetchUsers, PagedSelectPage, PagedSelectRequest} from '@thunderid/browser';
import useThunderID from './useThunderID';
import getUsers from '../api/getUsers';

/** A `FetchUsers` backed by the user directory, authenticated with the signed-in user's access token. */
const useFetchUsers = (): FetchUsers => {
  const {baseUrl, endpoints} = useThunderID();
  const usersUrl: string | undefined = resolveResourceEndpoint('users', {endpoints});

  return async ({filter, limit, offset, signal}: PagedSelectRequest): Promise<PagedSelectPage> =>
    toUserSelectPage(await getUsers({baseUrl, filter, limit, offset, signal, url: usersUrl}), offset);
};

export default useFetchUsers;
