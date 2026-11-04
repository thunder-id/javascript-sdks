// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {Project, readCurrentProject, writeCurrentProject} from '@thunderid/browser';
import {useCallback, useEffect, useState} from 'react';

/**
 * The current project a provider exposes, and its setter.
 */
export interface CurrentProjectState {
  /**
   * The project the user chose for the management UI, or `null` when none is chosen.
   */
  currentProject: Project | null;
  /**
   * Chooses the current project, or clears it with `null`. The choice is kept per vendor in
   * `localStorage`.
   */
  setCurrentProject: (project: Project | null) => void;
}

/**
 * Holds the current project for a provider. It is a client-side preference: choosing a project does
 * not sign in again, and tokens and permissions stay as they are. The stored choice is read after
 * mount, so a server-rendered page and its first client render agree.
 *
 * @param vendor - The vendor prefix the choice is stored under.
 * @returns The current project and its setter.
 */
const useCurrentProjectState = (vendor?: string): CurrentProjectState => {
  const [currentProject, setProject] = useState<Project | null>(null);

  useEffect(() => {
    setProject(readCurrentProject(vendor));
  }, [vendor]);

  const setCurrentProject = useCallback(
    (project: Project | null): void => {
      setProject(project);
      writeCurrentProject(vendor, project);
    },
    [vendor],
  );

  return {currentProject, setCurrentProject};
};

export default useCurrentProjectState;
