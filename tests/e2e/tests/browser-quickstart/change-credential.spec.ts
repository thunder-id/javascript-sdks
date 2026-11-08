// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

/**
 * browser/quickstart — changing a credential (password) via the Account page's Security tab.
 * See browser-quickstart/sign-in-out.spec.ts for the rest of the prerequisites.
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
import {expect, test} from '../../fixtures/sample-apps';
import {setUserPassword} from '../../utils/users-api';

const appUrl = sampleAppUrl(SampleApps.BROWSER);
const {username, password} = credentialTestUser('BROWSER');
// Derived from the real password rather than hardcoded, so this works regardless of what
// policy the schema's password attribute is configured with in a given environment.
const tempPassword = `${password}-Tmp1!`;

test.describe.configure({mode: 'serial'});

test.describe('browser/quickstart - Change credential', () => {
  test.beforeEach(() => setUserPassword(username, password));

  test('TC001: a password change via the Security tab takes effect and can be reverted', async ({
    browserQuickstartPage,
  }) => {
    await browserQuickstartPage.goto(appUrl);
    await browserQuickstartPage.verifyHomePageLoaded();
    await browserQuickstartPage.clickSignInButton();
    await browserQuickstartPage.verifyLoginPageLoaded();
    await browserQuickstartPage.login(username, password);
    await browserQuickstartPage.verifyLoggedIn();

    await browserQuickstartPage.openSecurityTab();

    try {
      await browserQuickstartPage.changeCredential('password', tempPassword);

      // Prove the change landed server-side, not just that the UI collapsed the form: sign
      // out and back in using the new password.
      await browserQuickstartPage.logout();
      await browserQuickstartPage.verifyLoggedOut();

      await browserQuickstartPage.clickSignInButton();
      await browserQuickstartPage.verifyLoginPageLoaded();
      await browserQuickstartPage.login(username, tempPassword);
      await browserQuickstartPage.verifyLoggedIn();

      await browserQuickstartPage.openSecurityTab();
    } finally {
      // Always attempt to restore the shared test user's original password, even if an
      // assertion above failed.
      await browserQuickstartPage.changeCredential('password', password);
    }

    // The restore itself also has to have actually worked, or the next test to sign in with
    // the original password would fail.
    await browserQuickstartPage.logout();
    await browserQuickstartPage.verifyLoggedOut();
    await browserQuickstartPage.clickSignInButton();
    await browserQuickstartPage.verifyLoginPageLoaded();
    await browserQuickstartPage.login(username, password);
    await browserQuickstartPage.verifyLoggedIn();
  });

  test('TC002: the submit button stays disabled until the new value and confirmation match', async ({
    browserQuickstartPage,
  }) => {
    await browserQuickstartPage.goto(appUrl);
    await browserQuickstartPage.verifyHomePageLoaded();
    await browserQuickstartPage.clickSignInButton();
    await browserQuickstartPage.verifyLoginPageLoaded();
    await browserQuickstartPage.login(username, password);
    await browserQuickstartPage.verifyLoggedIn();

    await browserQuickstartPage.openSecurityTab();
    await browserQuickstartPage.toggleCredential('password');

    expect(await browserQuickstartPage.isCredentialSubmitDisabled()).toBe(true);

    await browserQuickstartPage.fillCredentialFields('mismatch-one', 'mismatch-two');
    expect(await browserQuickstartPage.isCredentialSubmitDisabled()).toBe(true);

    // Collapse without submitting — nothing was written, so there is nothing to restore.
    await browserQuickstartPage.toggleCredential('password');
  });
});
