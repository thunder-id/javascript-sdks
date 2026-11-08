// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

/**
 * nuxt/quickstart — changing a credential (password) via the Account page's Security tab. See
 * react-quickstart/change-credential.spec.ts for the full prerequisites; identical shape,
 * different app.
 *
 * Signs in as a dedicated credential-test user (see constants/credential-test-users.ts),
 * distinct from the shared TEST_USER_USERNAME every sign-in-out spec uses: TC001 below changes
 * this user's password and changes it back (see the `finally` block), and the suite runs
 * `fullyParallel`, so mutating the shared user's password would race every other
 * concurrently-running spec's login across every app. The two tests in this file are run
 * serially (below) so they don't race each other over their own shared dedicated user either.
 */

import {credentialTestUser} from '../../constants/credential-test-users';
import {SampleApps, sampleAppUrl} from '../../constants/sample-apps';
import {Timeouts} from '../../constants/timeouts';
import {expect, test} from '../../fixtures/sample-apps';
import {setUserPassword} from '../../utils/users-api';

const appUrl = sampleAppUrl(SampleApps.NUXT);
const {username, password} = credentialTestUser('NUXT');
// Derived from the real password rather than hardcoded, so this works regardless of what
// policy the schema's password attribute is configured with in a given environment.
const tempPassword = `${password}-Tmp1!`;

test.describe.configure({mode: 'serial'});

test.describe('nuxt/quickstart - Change credential', () => {
  test.beforeEach(() => setUserPassword(username, password));

  test('TC001: a password change via the Security tab takes effect and can be reverted', async ({
    nuxtQuickstartPage,
  }) => {
    // Three full redirect-login round trips plus two credential submits, versus one round trip
    // for a typical test in this suite — the default per-test timeout leaves too little margin
    // for normal CI slowness.
    test.setTimeout(Timeouts.GLOBAL_TEST * 2);

    await nuxtQuickstartPage.goto(appUrl);
    await nuxtQuickstartPage.verifyHomePageLoaded();
    await nuxtQuickstartPage.clickSignInButton();
    await nuxtQuickstartPage.verifyLoginPageLoaded();
    await nuxtQuickstartPage.login(username, password);
    await nuxtQuickstartPage.verifyLoggedIn();

    await nuxtQuickstartPage.openSecurityTab();

    try {
      await nuxtQuickstartPage.changeCredential('Change password', tempPassword);

      // Prove the change landed server-side, not just that the UI collapsed the form: sign
      // out and back in using the new password.
      await nuxtQuickstartPage.logout();
      await nuxtQuickstartPage.verifyLoggedOut();

      await nuxtQuickstartPage.clickSignInButton();
      await nuxtQuickstartPage.verifyLoginPageLoaded();
      await nuxtQuickstartPage.login(username, tempPassword);
      await nuxtQuickstartPage.verifyLoggedIn();

      await nuxtQuickstartPage.openSecurityTab();
    } finally {
      // Always attempt to restore the shared test user's original password, even if an
      // assertion above failed. The try block can fail anywhere from right after the password
      // was changed to tempPassword through to confirming the re-login with it, and every one of
      // those failure points leaves the page signed out (logout already happened by then) with
      // the password already changed server-side — so if there's no active session, sign back in
      // with tempPassword (the password this point in the flow implies is current) before
      // reverting, rather than assuming the try block left us signed in and on the Security tab.
      if (!(await nuxtQuickstartPage.isLoggedIn())) {
        await nuxtQuickstartPage.clickSignInButton();
        await nuxtQuickstartPage.verifyLoginPageLoaded();
        await nuxtQuickstartPage.login(username, tempPassword);
        await nuxtQuickstartPage.verifyLoggedIn();
      }
      await nuxtQuickstartPage.openSecurityTab();
      await nuxtQuickstartPage.changeCredential('Change password', password);
    }

    // The restore itself also has to have actually worked, or the next test to sign in with
    // the original password would fail.
    await nuxtQuickstartPage.logout();
    await nuxtQuickstartPage.verifyLoggedOut();
    await nuxtQuickstartPage.clickSignInButton();
    await nuxtQuickstartPage.verifyLoginPageLoaded();
    await nuxtQuickstartPage.login(username, password);
    await nuxtQuickstartPage.verifyLoggedIn();
  });

  test('TC002: the submit button stays disabled until the new value and confirmation match', async ({
    nuxtQuickstartPage,
  }) => {
    await nuxtQuickstartPage.goto(appUrl);
    await nuxtQuickstartPage.verifyHomePageLoaded();
    await nuxtQuickstartPage.clickSignInButton();
    await nuxtQuickstartPage.verifyLoginPageLoaded();
    await nuxtQuickstartPage.login(username, password);
    await nuxtQuickstartPage.verifyLoggedIn();

    await nuxtQuickstartPage.openSecurityTab();
    await nuxtQuickstartPage.toggleCredential('Change password');

    expect(await nuxtQuickstartPage.isCredentialSubmitDisabled()).toBe(true);

    await nuxtQuickstartPage.fillCredentialFields('mismatch-one', 'mismatch-two');
    expect(await nuxtQuickstartPage.isCredentialSubmitDisabled()).toBe(true);

    // Collapse without submitting — nothing was written, so there is nothing to restore.
    await nuxtQuickstartPage.toggleCredential('Change password');
  });
});
