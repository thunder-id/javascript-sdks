// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import toPagedSelectOption from './toPagedSelectOption';
import UserSelectConstants from '../constants/UserSelectConstants';
import type {ManagedUser} from '../models/managed-user';
import type {PagedSelectOption} from '../models/paged-select';
import type {UserSelectOptionMapping} from '../models/user-select';

/**
 * Converts one directory user into an option: submits the user's ID and labels it from `display`,
 * then `username`, then `email`, unless `mapping` says otherwise.
 */
const toUserSelectOption = (
  user: ManagedUser | string | number,
  mapping?: UserSelectOptionMapping,
): PagedSelectOption | null =>
  toPagedSelectOption(user, mapping, {labelAttributes: UserSelectConstants.LABEL_ATTRIBUTES});

export default toUserSelectOption;
