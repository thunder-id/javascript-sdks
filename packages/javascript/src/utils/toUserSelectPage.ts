// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import computeNextPageOffset from './computeNextPageOffset';
import toPagedSelectOptions from './toPagedSelectOptions';
import UserSelectConstants from '../constants/UserSelectConstants';
import type {ManagedUserListResponse} from '../models/managed-user';
import type {PagedSelectOption, PagedSelectPage} from '../models/paged-select';
import type {UserSelectOptionMapping} from '../models/user-select';

/**
 * Converts a `getUsers` response into a loader page. The next offset comes from the backend's own
 * `count`, so users dropped by the mapping never shift the paging.
 */
const toUserSelectPage = (
  response: ManagedUserListResponse,
  requestOffset: number,
  mapping?: UserSelectOptionMapping,
): PagedSelectPage & {options: PagedSelectOption[]} => ({
  nextOffset: computeNextPageOffset(requestOffset, response.count, response.totalResults),
  options: toPagedSelectOptions(response.users, mapping, {labelAttributes: UserSelectConstants.LABEL_ATTRIBUTES}),
  totalResults: response.totalResults,
});

export default toUserSelectPage;
