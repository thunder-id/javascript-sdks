// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import useDefaultOuId from './useDefaultOuId';
import useThunderID from '../../../contexts/ThunderID/useThunderID';

/**
 * Where a new application or agent is placed, the two resources the server lets an app place by
 * project.
 */
export interface ProjectPlacement {
  /**
   * The organization unit, when the app passed one or no project is chosen.
   */
  ouId?: string;
  /**
   * The current project, when one is chosen and the app passed no organization unit. The server
   * places the resource in the project's root organization unit.
   */
  projectId?: string;
}

/**
 * Resolves where a new application or agent is created: the organization unit passed in, otherwise the
 * current project (see `ProjectSwitcher`), otherwise the signed-in user's own organization unit. A
 * project's identifier is not an organization unit's, so it is sent as `projectId`, never as `ouId`.
 *
 * @param ouId - The organization unit chosen by the caller.
 * @returns The placement, empty when nothing is known.
 */
const useProjectPlacement = (ouId?: string): ProjectPlacement => {
  const {currentProject} = useThunderID();
  const defaultOuId: string | undefined = useDefaultOuId(ouId);

  if (!ouId && currentProject?.id) {
    return {projectId: currentProject.id};
  }

  return defaultOuId ? {ouId: defaultOuId} : {};
};

export default useProjectPlacement;
