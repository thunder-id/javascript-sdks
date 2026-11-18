// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

/**
 * Loads the given URL in place of the current page, without leaving the current page in the history. Unlike
 * {@link navigate}, it always loads the page, even on the same origin.
 *
 * @param url - The URL to load.
 */
const replaceLocation = (url: string): void => {
  window.location.replace(url);
};

export default replaceLocation;
