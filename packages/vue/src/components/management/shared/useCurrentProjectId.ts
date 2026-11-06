// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {inject} from 'vue';
import {THUNDERID_KEY} from '../../../keys';
import type {ThunderIDContext} from '../../../models/contexts';

/**
 * Returns a getter for the project a list is scoped to: the one passed in, otherwise the current
 * project (see `ProjectSwitcher`) when one is chosen.
 *
 * @param projectId - Getter for the project chosen by the caller.
 * @returns The getter, which returns `undefined` when no project applies.
 */
const useCurrentProjectId = (projectId: () => string | undefined): (() => string | undefined) => {
  const thunderID: ThunderIDContext | null = inject(THUNDERID_KEY, null);

  return (): string | undefined => projectId() ?? thunderID?.currentProject?.value?.id;
};

export default useCurrentProjectId;
