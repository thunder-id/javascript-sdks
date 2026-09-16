// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

/**
 * nextjs/quickstart — changing a credential (password) via the Account page's Security tab.
 * See react-quickstart/change-credential.spec.ts for the full prerequisites; identical shape,
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

const appUrl = sampleAppUrl(SampleApps.NEXTJS);
const {username, password} = credentialTestUser('NEXTJS');
// Derived from the real password rather than hardcoded, so this works regardless of what
// policy the schema's password attribute is configured with in a given environment.
const tempPassword = `${password}-Tmp1!`;

test.describe.configure({mode: 'serial'});

test.describe('nextjs/quickstart - Change credential', () => {
  test('TC001: a password change via the Security tab takes effect and can be reverted', async ({
    nextjsQuickstartPage,
  }) => {
    // Three full redirect-login round trips plus two credential submits, versus one round trip
    // for a typical test in this suite. Next.js adds SSR overhead to every OAuth round trip that
    // pure-CSR apps (react, vue) avoid, so this test needs extra budget beyond the 2× that would
    // cover a CSR equivalent.
    test.setTimeout(Timeouts.GLOBAL_TEST * 3);

    await nextjsQuickstartPage.goto(appUrl);
    await nextjsQuickstartPage.verifyHomePageLoaded();
    await nextjsQuickstartPage.clickSignInButton();
    await nextjsQuickstartPage.verifyLoginPageLoaded();
    await nextjsQuickstartPage.login(username, password);
    await nextjsQuickstartPage.verifyLoggedIn();

    await nextjsQuickstartPage.openSecurityTab();

    try {
      await nextjsQuickstartPage.changeCredential('Change password', tempPassword);

      // Prove the change landed server-side, not just that the UI collapsed the form: sign
      // out and back in using the new password.
      await nextjsQuickstartPage.logout();
      await nextjsQuickstartPage.verifyLoggedOut();

      await nextjsQuickstartPage.clickSignInButton();
      await nextjsQuickstartPage.verifyLoginPageLoaded();
      await nextjsQuickstartPage.login(username, tempPassword);
      await nextjsQuickstartPage.verifyLoggedIn();

      await nextjsQuickstartPage.openSecurityTab();
    } finally {
      // Always attempt to restore the shared test user's original password, even if an
      // assertion above failed. Re-open the Security tab rather than assuming the try block
      // left us there: if it failed before reaching that point, the page could be anywhere, and
      // changeCredential would otherwise hang waiting for a row that was never rendered.
      await nextjsQuickstartPage.openSecurityTab();
      await nextjsQuickstartPage.changeCredential('Change password', password);
    }

    // The restore itself also has to have actually worked, or the next test to sign in with
    // the original password would fail.
    await nextjsQuickstartPage.logout();
    await nextjsQuickstartPage.verifyLoggedOut();
    await nextjsQuickstartPage.clickSignInButton();
    await nextjsQuickstartPage.verifyLoginPageLoaded();
    await nextjsQuickstartPage.login(username, password);
    await nextjsQuickstartPage.verifyLoggedIn();
  });

  test('TC002: the submit button stays disabled until the new value and confirmation match', async ({
    nextjsQuickstartPage,
  }) => {
    await nextjsQuickstartPage.goto(appUrl);
    await nextjsQuickstartPage.verifyHomePageLoaded();
    await nextjsQuickstartPage.clickSignInButton();
    await nextjsQuickstartPage.verifyLoginPageLoaded();
    await nextjsQuickstartPage.login(username, password);
    await nextjsQuickstartPage.verifyLoggedIn();

    await nextjsQuickstartPage.openSecurityTab();
    await nextjsQuickstartPage.toggleCredential('Change password');

    expect(await nextjsQuickstartPage.isCredentialSubmitDisabled()).toBe(true);

    await nextjsQuickstartPage.fillCredentialFields('mismatch-one', 'mismatch-two');
    expect(await nextjsQuickstartPage.isCredentialSubmitDisabled()).toBe(true);

    // Collapse without submitting — nothing was written, so there is nothing to restore.
    await nextjsQuickstartPage.toggleCredential('Change password');
  });
});
