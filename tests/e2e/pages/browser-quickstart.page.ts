// Copyright 2025 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

/**
 * quickstarts/browser Page Object — vanilla JS + @thunderid/browser, redirect flow.
 * Custom hand-built markup (not the shared component library), so its own selectors: see
 * thunder-id/samples quickstarts/browser/src/components/nav.js and src/pages/home.js.
 */

import {Page, expect} from '@playwright/test';
import {GateLoginPage} from './gate-login.page';
import {Timeouts} from '../constants/timeouts';

export const ProfileFieldKeys = {
  familyName: 'family_name',
  givenName: 'given_name',
};

export class BrowserQuickstartPage extends GateLoginPage {
  constructor(page: Page) {
    super(page);
  }

  async goto(url: string): Promise<void> {
    await this.page.goto(url, {waitUntil: 'commit'});
  }

  async verifyHomePageLoaded(): Promise<void> {
    await expect(this.page.locator('#hero-sign-in-btn, #sign-in-btn').first()).toBeVisible({
      timeout: Timeouts.ELEMENT_VISIBILITY,
    });
  }

  async clickSignInButton(): Promise<void> {
    await this.page.locator('#hero-sign-in-btn, #sign-in-btn').first().click();
  }

  async verifyLoggedIn(): Promise<void> {
    await expect(this.page.locator('#ud-trigger')).toBeVisible({timeout: Timeouts.REDIRECT});
  }

  async verifyLoggedOut(): Promise<void> {
    await this.verifyHomePageLoaded();
  }

  async logout(): Promise<void> {
    await this.page.locator('#ud-trigger').click();
    await this.page.locator('#ud-sign-out').click();
    await this.confirmSignOutIfPrompted();
  }

  /** Opens the token debug page via the user dropdown (src/pages/token.js — an in-memory SPA
   * "route" with no real URL change, so callers must wait for its content, not a URL). */
  async openTokenDebug(): Promise<void> {
    await this.page.locator('#ud-trigger').click();
    await this.page.locator('#ud-token-debug').click();
  }

  async verifyTokenDebugLoaded(): Promise<void> {
    await expect(this.page.locator('.token-main')).toBeVisible({timeout: Timeouts.ELEMENT_VISIBILITY});
  }

  /** Reads the raw access token JWT rendered across the three .token-part--* spans. */
  async getDisplayedAccessToken(): Promise<string> {
    const raw = this.page.locator('.token-raw');
    await raw.waitFor({state: 'visible', timeout: Timeouts.ELEMENT_VISIBILITY});
    const header = await raw.locator('.token-part--header').innerText();
    const payload = await raw.locator('.token-part--payload').innerText();
    const signature = await raw.locator('.token-part--signature').innerText();
    return `${header}.${payload}.${signature}`;
  }

  /** Opens the "Manage Account" page (src/pages/account.js) via the nav dropdown, then switches
   * to its Personal info tab — the account page lands on the Home tab first, same as
   * react/quickstarts/vue's own Account page. Replaces the old "Manage Profile" popup; the field
   * rendering/editing logic that used to back that popup (src/components/profileDialog.js) was
   * kept and repurposed to feed this page's Personal info tab instead (renamed to
   * profileFields.js). */
  async openManageProfile(): Promise<void> {
    await this.page.locator('#ud-trigger').click();
    await this.page.locator('#ud-manage-profile').click();
    await this.page.locator('.account-nav-item[data-tab="personal"]').click();
    await this.page.locator('#profile-field-list').waitFor({state: 'visible', timeout: Timeouts.ELEMENT_VISIBILITY});
  }

  /** Edits one field of the Personal info tab, which renders each schema attribute as its own
   * row with a pencil "Edit" button. */
  async editProfileField(fieldKey: string, value: string): Promise<void> {
    const row = this.page.locator(`.profile-field-row[data-field="${fieldKey}"]`);
    await row.locator('[data-action="edit"]').click();
    await row.locator('.profile-field-row-input').fill(value);
    await row.locator('[data-action="save"]').click();
    await expect(row.locator('.profile-field-row-input')).toHaveCount(0, {timeout: Timeouts.DEFAULT_ACTION});
  }

  /** Verifies a field's row reverted from edit mode back to display mode showing the just-saved value*/
  async verifyProfileFieldValue(fieldKey: string, value: string): Promise<void> {
    const row = this.page.locator(`.profile-field-row[data-field="${fieldKey}"]`);
    await expect(row.locator('.profile-field-row-value')).toHaveText(value, {timeout: Timeouts.ELEMENT_VISIBILITY});
  }

  /** Leaves the Account page via the nav's "‹ Home" back link, same as closing the old dialog
   * used to return control to the main app shell. */
  async closeManageProfile(): Promise<void> {
    await this.page.locator('#nav-back-btn').click();
    await this.page.locator('#profile-field-list').waitFor({state: 'hidden', timeout: Timeouts.DEFAULT_ACTION});
  }

  /** Opens the Account page and switches to its Security tab, where each credential renders as
   * a collapsed row (src/pages/account.js's `renderCredentialCard`) that expands into the real
   * form — see {@link changeCredential}. */
  async openSecurityTab(): Promise<void> {
    await this.page.locator('#ud-trigger').click();
    await this.page.locator('#ud-manage-profile').click();
    await this.page.locator('.account-nav-item[data-tab="security"]').click();
    await this.page.locator('.account-security-list').waitFor({state: 'visible', timeout: Timeouts.ELEMENT_VISIBILITY});
  }

  /** Expands or collapses the named credential's row — the same button does both, keyed by the
   * schema attribute (`"password"`) rather than its label. Call {@link openSecurityTab} first. */
  async toggleCredential(attribute: string): Promise<void> {
    await this.page.locator(`[data-cred-toggle="${attribute}"]`).click();
  }

  /** Fills the currently-open credential form's current-value, new-value and confirmation fields,
   * without submitting. */
  async fillCredentialFields(newValue: string, confirmValue: string, currentValue = ''): Promise<void> {
    await this.page.locator('[data-cred-field="currentValue"]').fill(currentValue);
    await this.page.locator('[data-cred-field="newValue"]').fill(newValue);
    await this.page.locator('[data-cred-field="confirmValue"]').fill(confirmValue);
  }

  /** Whether the currently-open credential form's submit button is disabled. */
  async isCredentialSubmitDisabled(): Promise<boolean> {
    return this.page.locator('[data-cred-submit]').isDisabled();
  }

  /** Expands the named credential's row, fills the current value, the new value and its
   * confirmation, and submits. Waits for the row to collapse back afterward, which is this sample's own
   * `onDone` behavior on a successful write — proof the change actually succeeded server-side
   * rather than just that the button was clicked. Call {@link openSecurityTab} first. */
  async changeCredential(attribute: string, currentValue: string, newValue: string): Promise<void> {
    const toggle = this.page.locator(`[data-cred-toggle="${attribute}"]`);
    await toggle.click();

    await this.fillCredentialFields(newValue, newValue, currentValue);
    await this.page.locator('[data-cred-submit]').click();

    await expect(toggle).toHaveAttribute('aria-expanded', 'false', {timeout: Timeouts.ELEMENT_VISIBILITY});
  }

  async verifyDisplayedName(fullName: string): Promise<void> {
    await expect(this.page.locator('.ud-name')).toHaveText(fullName, {timeout: Timeouts.ELEMENT_VISIBILITY});
  }
}
