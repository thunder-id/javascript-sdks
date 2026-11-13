// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {ManagementRequestConfig} from '../../../models/api';
import {ManagedUserTypeDetails} from '../../../models/entity-type';
import computeNextPageOffset from '../../../utils/computeNextPageOffset';
import getUserTypes from './getUserTypes';
import requestManagementResource from '../../../utils/requestManagementResource';

export interface GetUserTypeConfig extends ManagementRequestConfig {
  /**
   * Identifier of the user type.
   */
  userTypeId: string;
}

/**
 * Fetches a user type with its attribute schema.
 */
const getUserType = async ({userTypeId, ...config}: GetUserTypeConfig): Promise<ManagedUserTypeDetails> =>
  requestManagementResource<ManagedUserTypeDetails>(config, {
    collection: 'user-types',
    failureMessage: 'Failed to fetch user type',
    id: userTypeId,
    method: 'GET',
    operation: 'getUserType',
    query: {include: 'display'},
  });

/**
 * Looks up the schema for the type handle reported by the users API.
 *
 * @internal Shared by the SDK packages. It is not part of the public API and can change in any release.
 */
export const getUserTypeByHandle = async (
  config: ManagementRequestConfig & {handle: string},
): Promise<ManagedUserTypeDetails | undefined> => {
  const {handle, ...endpoint} = config;
  let offset: number | null = 0;
  while (offset !== null) {
    const page = await getUserTypes({...endpoint, limit: 100, offset});
    const type = page.types.find((candidate) => candidate.handle === handle);
    if (type) {
      return getUserType({...endpoint, userTypeId: type.id});
    }
    offset = computeNextPageOffset(offset, page.count, page.totalResults);
  }

  return undefined;
};

export default getUserType;
