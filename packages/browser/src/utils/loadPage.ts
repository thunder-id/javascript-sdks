// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

/**
 * Loads a page in full: `url`, resolved against the page's origin, or the current page again when unset.
 *
 * @param url - The page to load, or unset to reload the current one.
 */
const loadPage = (url?: string): void => {
  if (url) {
    window.location.assign(new URL(url, window.location.origin).toString());
  } else {
    window.location.reload();
  }
};

export default loadPage;
