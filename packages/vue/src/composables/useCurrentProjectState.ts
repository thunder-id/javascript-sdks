// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {readCurrentProject, writeCurrentProject} from '@thunderid/browser';
import type {Project} from '@thunderid/browser';
import {type Ref, type ShallowRef, readonly, shallowRef} from 'vue';

/**
 * The current project a provider exposes, its setter, and the call that restores the stored choice.
 */
export interface CurrentProjectState {
  /**
   * The project the user chose for the management UI, or `null` when none is chosen.
   */
  currentProject: Readonly<Ref<Project | null>>;
  /**
   * Reads the stored choice. Call it on the client once the app is mounted, so a server-rendered page
   * and its first client render agree. A choice made before it runs is kept.
   */
  restore: () => void;
  /**
   * Chooses the current project, or clears it with `null`. The choice is kept per vendor in
   * `localStorage`.
   */
  setCurrentProject: (project: Project | null) => void;
}

/**
 * Holds the current project for a provider. It is a client-side preference: choosing a project does
 * not sign in again, and tokens and permissions stay as they are.
 *
 * @param vendor - The vendor prefix the choice is stored under.
 * @returns The current project, its setter, and `restore`.
 */
const useCurrentProjectState = (vendor?: string): CurrentProjectState => {
  const currentProject: ShallowRef<Project | null> = shallowRef<Project | null>(null);
  let isChosen = false;

  return {
    currentProject: readonly(currentProject) as Readonly<Ref<Project | null>>,
    restore: (): void => {
      if (!isChosen) {
        currentProject.value = readCurrentProject(vendor);
      }
    },
    setCurrentProject: (project: Project | null): void => {
      isChosen = true;
      currentProject.value = project;
      writeCurrentProject(vendor, project);
    },
  };
};

export default useCurrentProjectState;
