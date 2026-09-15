// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

/**
 * Credential Test Users
 *
 * One dedicated user per app whose E2E suite includes a change-credential spec
 * (react/quickstart, vue/quickstart, nextjs/quickstart, nuxt/quickstart, browser/quickstart,
 * express/quickstart). These specs change the signed-in
 * user's password mid-test (see each change-credential.spec.ts's own doc comment) and restore
 * it afterward, but the suite runs `fullyParallel`, so any other concurrently-running test file
 * signing in as the same identity would race that temporary change and fail transiently.
 *
 * The shared TEST_USER_USERNAME/PASSWORD (global-setup.ts) is what every sign-in-out spec signs
 * in as across every app, so a credential-mutating test cannot safely use it. These users exist
 * solely so each change-credential spec can mutate a password without any other test in the
 * suite ever attempting to sign in as the same identity — see global-setup.ts/global-teardown.ts
 * for provisioning, and each change-credential.spec.ts for `describe.serial`, which keeps that
 * one dedicated user's own two tests (TC001/TC002) from racing each other too.
 *
 * Derived from TEST_USER_USERNAME/PASSWORD rather than requiring their own env vars/CI secrets:
 * a distinct username is all that's needed for a distinct identity, and reusing the shared
 * user's password as the dedicated user's starting password is no less secure than the shared
 * user having it in the first place.
 *
 * A function, not a precomputed object: dotenv only populates `process.env` once global-setup.ts
 * (or playwright.config.ts, for spec files) runs its own `dotenv.config()` call, which happens
 * after this module is imported, so reading `process.env` at import time would capture `undefined`.
 */
export interface CredentialTestUser {
  password: string;
  username: string;
}

export const CredentialTestUserApps = ['BROWSER', 'REACT', 'VUE', 'NEXTJS', 'NUXT', 'EXPRESS'] as const;
export type CredentialTestUserApp = (typeof CredentialTestUserApps)[number];

export function credentialTestUser(app: CredentialTestUserApp): CredentialTestUser {
  return {
    password: process.env.TEST_USER_PASSWORD!,
    username: `${process.env.TEST_USER_USERNAME}-cred-${app.toLowerCase()}`,
  };
}
