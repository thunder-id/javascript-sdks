// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import type {ManagedUser} from './managed-user';
import type {FetchPagedOptions, PagedSelectOptionMapping} from './paged-select';

export type FetchUsers = FetchPagedOptions;

export type UserSelectOptionMapping = PagedSelectOptionMapping<ManagedUser>;
