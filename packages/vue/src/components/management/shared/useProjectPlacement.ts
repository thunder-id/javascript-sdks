// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {type ComputedRef, computed, inject} from 'vue';
import useDefaultOuId from './useDefaultOuId';
import {THUNDERID_KEY} from '../../../keys';
import type {ThunderIDContext} from '../../../models/contexts';

/**
 * Where a new application or agent is placed, the two resources the server lets an app place by
 * project.
 */
export interface ProjectPlacement {
  /** The organization unit, when the app passed one or no project is chosen. */
  ouId?: string;
  /**
   * The current project, when one is chosen and the app passed no organization unit. The server places
   * the resource in the project's root organization unit.
   */
  projectId?: string;
}

/**
 * Resolves where a new application or agent is created: the organization unit passed in, otherwise the
 * current project (see `ProjectSwitcher`), otherwise the signed-in user's own organization unit. A
 * project's identifier is not an organization unit's, so it is sent as `projectId`, never as `ouId`.
 *
 * @param ouId - Getter for the organization unit chosen by the caller.
 * @returns The placement, empty when nothing is known.
 */
const useProjectPlacement = (ouId: () => string | undefined): ComputedRef<ProjectPlacement> => {
  const thunderID: ThunderIDContext | null = inject(THUNDERID_KEY, null);
  const defaultOuId: ComputedRef<string | undefined> = useDefaultOuId(ouId);

  return computed((): ProjectPlacement => {
    const projectId: string | undefined = thunderID?.currentProject?.value?.id;

    if (!ouId() && projectId) {
      return {projectId};
    }

    return defaultOuId.value ? {ouId: defaultOuId.value} : {};
  });
};

export default useProjectPlacement;
