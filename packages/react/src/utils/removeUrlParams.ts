// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

/**
 * Removes query parameters from the browser URL in place, without a navigation or a history entry.
 *
 * @param names - The query parameters to remove.
 */
const removeUrlParams = (...names: string[]): void => {
  if (!window?.location?.href) return;

  const url: URL = new URL(window.location.href);
  names.forEach((name: string) => url.searchParams.delete(name));
  window.history?.replaceState({}, '', url.toString());
};

export default removeUrlParams;
