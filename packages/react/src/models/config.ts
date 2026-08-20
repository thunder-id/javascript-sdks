// Copyright 2025 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {ThunderIDBrowserConfig} from '@thunderid/browser';

export type ThunderIDReactConfig = ThunderIDBrowserConfig & {
  /**
   * CSP nonce applied to the `<style>` tags Emotion injects into `<head>` at runtime.
   *
   * Set this when the consuming app enforces a strict `style-src` Content-Security-Policy
   * directive (i.e. one without `'unsafe-inline'`) - the nonce must match the one the app's
   * own CSP header/meta tag issues for the current request.
   */
  cspNonce?: string;

  /** Forwarded to `FlowMetaProvider`'s `namespace` prop. See its doc for details. */
  namespace?: string;
};
