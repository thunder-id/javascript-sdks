// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

/**
 * express/quickstart — updating a credential (password) via the sample's own
 * `PATCH /api/me/credentials` route. Unlike react/vue/nextjs/nuxt/browser, express/quickstart
 * has no profile UI at all (see sign-in-out.spec.ts's own note on this), so there is no Security
 * tab to drive here: this calls the route directly with the access token read off the existing
 * Token debug page, the same token every other spec in this file already exercises.
 *
 * Signs in as a dedicated credential-test user (see constants/credential-test-users.ts),
 * distinct from the shared TEST_USER_USERNAME every sign-in-out spec uses: TC001 below changes
 * this user's password and changes it back (see the `finally` block), and the suite runs
 * `fullyParallel`, so mutating the shared user's password would race every other
 * concurrently-running spec's login across every app.
 */

import {APIRequestContext} from '@playwright/test';
import {credentialTestUser} from '../../constants/credential-test-users';
import {SampleApps, sampleAppUrl} from '../../constants/sample-apps';
import {expect, test} from '../../fixtures/sample-apps';

const appUrl = sampleAppUrl(SampleApps.EXPRESS);
const {username, password} = credentialTestUser('EXPRESS');
// Derived from the real password rather than hardcoded, so this works regardless of what
// policy the schema's password attribute is configured with in a given environment.
const tempPassword = `${password}-Tmp1!`;

function updateCredentials(request: APIRequestContext, accessToken: string, newPassword: string) {
  return request.patch(`${appUrl}/api/me/credentials`, {
    data: {password: newPassword},
    headers: {Authorization: `Bearer ${accessToken}`},
  });
}

test.describe('express/quickstart - Change credential', () => {
  test('TC001: a password change via PATCH /api/me/credentials takes effect and can be reverted', async ({
    expressQuickstartPage,
    request,
  }) => {
    await expressQuickstartPage.goto(appUrl);
    await expressQuickstartPage.verifyHomePageLoaded();
    await expressQuickstartPage.clickSignInButton();
    await expressQuickstartPage.verifyLoginPageLoaded();
    await expressQuickstartPage.login(username, password);
    await expressQuickstartPage.verifyLoggedIn();

    try {
      await expressQuickstartPage.openTokenDebug();
      await expressQuickstartPage.verifyTokenDebugLoaded();
      const accessToken = await expressQuickstartPage.getDisplayedAccessToken();

      const changeResponse = await updateCredentials(request, accessToken, tempPassword);
      expect(changeResponse.status()).toBe(204);

      // Prove the change landed server-side, not just that the route returned 204: sign out
      // and back in using the new password.
      await expressQuickstartPage.logout();
      await expressQuickstartPage.verifyLoggedOut();

      await expressQuickstartPage.clickSignInButton();
      await expressQuickstartPage.verifyLoginPageLoaded();
      await expressQuickstartPage.login(username, tempPassword);
      await expressQuickstartPage.verifyLoggedIn();
    } finally {
      // Always attempt to restore the shared test user's original password, even if an
      // assertion above failed. Re-open the Token debug page rather than assuming the try block
      // left us there: if it failed before reaching that point, the page could still be on the
      // login page or a stale session, and reading the token would hang or return the wrong one.
      await expressQuickstartPage.openTokenDebug();
      await expressQuickstartPage.verifyTokenDebugLoaded();
      const revertToken = await expressQuickstartPage.getDisplayedAccessToken();

      const revertResponse = await updateCredentials(request, revertToken, password);
      expect(revertResponse.status()).toBe(204);
    }

    // The restore itself also has to have actually worked, or the next test to sign in with
    // the original password would fail.
    await expressQuickstartPage.logout();
    await expressQuickstartPage.verifyLoggedOut();
    await expressQuickstartPage.clickSignInButton();
    await expressQuickstartPage.verifyLoginPageLoaded();
    await expressQuickstartPage.login(username, password);
    await expressQuickstartPage.verifyLoggedIn();
  });

  test('TC002: rejects an unauthenticated request', async ({request}) => {
    const response = await request.patch(`${appUrl}/api/me/credentials`, {
      data: {password: 'irrelevant'},
    });
    expect(response.status()).toBe(401);
  });
});
