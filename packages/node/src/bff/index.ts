// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

export {default as BffConstants} from './BffConstants';
export {
  default as handleBffRequest,
  bffJson,
  bffRedirect,
  bffSignedIn,
  checkBffRequest,
  renderSignInContinuePage,
  forwardToApi,
  getRequestOrigins,
  toBrowserSession,
  toSafeReturnTo,
} from './handleBffRequest';
export type {BffAdapter, BffOptions, BffSession, BffSwitchResult} from './models';
