// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

/**
 * The header the BFF contract requires on calls to the session endpoints. A page on another origin
 * cannot add it without a CORS preflight, so a cross-site request cannot use the session cookie.
 */
const bffRequestHeaders: Readonly<Record<string, string>> = {'X-Requested-With': 'XMLHttpRequest'};

export default bffRequestHeaders;
