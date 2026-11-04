// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {Project, getVendorPrefix} from '@thunderid/javascript';

/**
 * The `localStorage` key the current project is kept under, scoped to the vendor like the SDK's
 * other UI preferences.
 *
 * @param vendor - The vendor prefix.
 * @returns The key.
 */
export const getCurrentProjectStorageKey = (vendor?: string): string => `${getVendorPrefix(vendor)}-current-project`;

/**
 * Reads the project the user last chose. The current project is a client-side preference for the
 * management UI: it does not change the session, the tokens or what the server allows.
 *
 * @param vendor - The vendor prefix.
 * @returns The project, or `null` when none is kept or storage is unavailable.
 */
export const readCurrentProject = (vendor?: string): Project | null => {
  try {
    if (typeof window === 'undefined' || !window.localStorage) {
      return null;
    }

    const stored: string | null = window.localStorage.getItem(getCurrentProjectStorageKey(vendor));
    const parsed: unknown = stored ? JSON.parse(stored) : null;

    return parsed && typeof parsed === 'object' && typeof (parsed as Project).id === 'string'
      ? (parsed as Project)
      : null;
  } catch {
    return null;
  }
};

/**
 * Keeps the project the user chose, or forgets it with `null`.
 *
 * @param vendor - The vendor prefix.
 * @param project - The project, or `null`.
 */
export const writeCurrentProject = (vendor: string | undefined, project: Project | null): void => {
  try {
    if (typeof window === 'undefined' || !window.localStorage) {
      return;
    }

    const key: string = getCurrentProjectStorageKey(vendor);

    if (project) {
      window.localStorage.setItem(key, JSON.stringify(project));
    } else {
      window.localStorage.removeItem(key);
    }
  } catch {
    // Storage is full or blocked: the choice lasts for this page only.
  }
};
