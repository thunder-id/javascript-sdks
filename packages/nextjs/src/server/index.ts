// Copyright 2025 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

// @thunderid/nextjs/server exports.

export {default as thunderid} from './thunderid';

export {default as ThunderIDProvider} from './ThunderIDProvider.js';
export * from './ThunderIDProvider.js';

export {default as thunderIDProxy} from './proxy/thunderIDProxy';
export * from './proxy/thunderIDProxy';

export {default as createRouteMatcher} from './proxy/createRouteMatcher';

export {default as backchannelLogout} from './backchannelLogout';
export type {BackchannelLogoutOptions} from './backchannelLogout';

export {default as thunderIDBff} from './bff';
export type {ThunderIDBffOptions} from './bff';
