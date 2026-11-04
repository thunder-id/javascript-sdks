// Copyright 2025 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

// Client
export {default as ThunderIDExpressClient} from './ThunderIDExpressClient';

// Middleware
export {thunderID, handleSignIn, handleSignOut} from './middleware/authentication';
export {default as protect} from './middleware/protect';
export {default as handleFlow} from './middleware/flow';
export {default as handleBackchannelLogout} from './middleware/backchannelLogout';
export {default as requireAccess} from './middleware/requireAccess';
export type {RequireAccessOptions} from './middleware/requireAccess';

// Models
export type {ExpressClientConfig, ThunderIDExpressConfig, StrictExpressClientConfig} from './models/config';

// Constants
// Note: session cookie *naming* is owned by `@thunderid/node`'s `CookieConfig` class,
// re-exported below, so every server-side SDK derives the same cookie name.
export {default as CookieConfig} from './constants/CookieConfig';

// Re-export everything from the Node SDK (includes SessionCookieConfig, ThunderIDNodeConfig,
// the `CookieConfig` naming class, etc.)
export * from '@thunderid/node';
