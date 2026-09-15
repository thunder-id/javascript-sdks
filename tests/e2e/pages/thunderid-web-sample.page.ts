// Copyright 2025 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

/**
 * ThunderID Web Sample Page Object
 *
 * react/quickstart, vue/quickstart, nextjs/quickstart, and nuxt/quickstart all render the same
 * `@thunderid/{react,vue}`-family components with the same markup: a `button.btn-primary`
 * "Sign in" CTA, and a `UserDropdown` trigger carrying either `data-testid=
 * "thunderid-user-dropdown-trigger"` (react and, since it wraps react, nextjs) or the vendor-
 * prefixed `user-dropdown__trigger` class (vue and, since it wraps vue, nuxt) — see
 * packages/react/src/components/presentation/UserDropdown/BaseUserDropdown.tsx and
 * packages/vue/src/components/presentation/user-dropdown/BaseUserDropdown.ts. One Page Object
 * covers all four apps; only the base URL differs (see fixtures/sample-apps).
 */

import {Locator, Page, expect} from '@playwright/test';
import {GateLoginPage} from './gate-login.page';
import {Timeouts} from '../constants/timeouts';

const USER_DROPDOWN_TRIGGER =
  'button[data-testid="thunderid-user-dropdown-trigger"], button[class*="user-dropdown__trigger"]';

/** Profile field labels, matching the schema's configured displayName — see
 * editProfileField's doc comment. */
export const ProfileFieldLabels = {
  familyName: /^Last Name$/,
  givenName: /^First Name$/,
};

export class ThunderIDWebSamplePage extends GateLoginPage {
  constructor(page: Page) {
    super(page);
  }

  async goto(url: string): Promise<void> {
    // 'load' alone isn't enough for nextjs/nuxt: both server-render this page, so the sign-in
    // button is visible (and Playwright-clickable) before client-side hydration attaches its
    // handler, making an early click a silent no-op. 'networkidle' waits out the trailing
    // hydration-related requests (Nuxt DevTools, etc.) that follow the load event.
    await this.page.goto(url, {waitUntil: 'networkidle'});
  }

  async verifyHomePageLoaded(): Promise<void> {
    await expect(this.page.locator('button.btn-primary', {hasText: 'Sign in'}).first()).toBeVisible({
      timeout: Timeouts.ELEMENT_VISIBILITY,
    });
  }

  async clickSignInButton(): Promise<void> {
    await this.page.locator('button.btn-primary', {hasText: 'Sign in'}).first().click();
  }

  async verifyLoggedIn(): Promise<void> {
    await expect(this.page.locator(USER_DROPDOWN_TRIGGER).first()).toBeVisible({timeout: Timeouts.REDIRECT});
  }

  async verifyLoggedOut(): Promise<void> {
    await this.verifyHomePageLoaded();
  }

  /** Clicks the dropdown trigger and waits for `target` (a menu item scoped to the dropdown) to
   * appear, re-clicking if it doesn't. The redirect landing page is server-rendered, so the
   * trigger can be visible (and Playwright-clickable) before React/Vue finishes attaching its
   * click handler — the click lands on plain markup and is silently lost, no error, nothing left
   * to wait on. A second click after hydration catches up recovers cleanly; this has been
   * observed to matter specifically for nuxt/quickstart under CI-level CPU contention, where the
   * gap is wide enough to lose the first click outright rather than just render it late.
   *
   * Each click attempt is bounded by `DEFAULT_ACTION` (15 s) rather than the whole test timeout.
   * Without that bound, a trigger that is visible but not yet actionable (e.g. covered during a
   * Next.js SSR re-render after an OAuth redirect) would silently consume the entire remaining
   * budget before failing; with it, the loop retries at most three times and surfaces a clear
   * error if the trigger never becomes clickable. */
  protected async openDropdown(target: Locator): Promise<void> {
    const trigger = this.page.locator(USER_DROPDOWN_TRIGGER).first();
    // Fail fast before the loop if the trigger is absent outright (e.g. user not signed in).
    await trigger.waitFor({state: 'visible', timeout: Timeouts.ELEMENT_VISIBILITY});
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        await trigger.click({timeout: Timeouts.DEFAULT_ACTION});
        await expect(target).toBeVisible({timeout: 3000});
        return;
      } catch (error) {
        if (attempt === 3) throw error;
        // Brief pause before the next attempt - lets any transient animation or loading
        // overlay settle so the click is more likely to land cleanly.
        await this.page.waitForTimeout(500);
      }
    }
  }

  async logout(): Promise<void> {
    const signOutButton = this.page.getByRole('button', {name: 'Sign Out'});
    await this.openDropdown(signOutButton);
    await signOutButton.click();
    await this.confirmSignOutIfPrompted();
  }

  /** Opens the token debug page via the "Token debug" menu item each sample adds to
   * `UserDropdown`'s `menuItems` prop. React/Next.js render it as a real `/token` link; Vue/Nuxt
   * wire it to an `onClick` page-switch instead (no real navigation) — so this matches on text
   * rather than a specific role. */
  async openTokenDebug(): Promise<void> {
    const tokenDebugItem = this.page.getByText('Token debug', {exact: true});
    await this.openDropdown(tokenDebugItem);
    await tokenDebugItem.click();
  }

  async verifyTokenDebugLoaded(): Promise<void> {
    await expect(this.page.locator('.token-raw')).toBeVisible({timeout: Timeouts.ELEMENT_VISIBILITY});
  }

  /** Reads the raw access token JWT rendered across the three .token-part--* spans — the same
   * class names browser/quickstart's own hand-written token.js uses, since every sample's
   * TokenDebugPage is its own component, not part of the shared UI library. */
  async getDisplayedAccessToken(): Promise<string> {
    const raw = this.page.locator('.token-raw');
    await raw.waitFor({state: 'visible', timeout: Timeouts.ELEMENT_VISIBILITY});
    const header = await raw.locator('.token-part--header').innerText();
    const payload = await raw.locator('.token-part--payload').innerText();
    const signature = await raw.locator('.token-part--signature').innerText();
    return `${header}.${payload}.${signature}`;
  }

  /** Opens the SDK-provided profile dialog — `UserDropdown`'s built-in profile action, under the
   * plain "Profile" label. Nuxt inherits this via its own `UserDropdown` wrapper, which delegates
   * to the same `@thunderid/vue` component; nextjs likewise inherits React's "Manage Profile"
   * label and behavior. Every quickstart's own Nav component now overrides this action to
   * redirect to a full Account page instead — see {@link ThunderIDAccountPageSamplePage} below
   * for their variant of the methods in this section. */
  async openManageProfile(): Promise<void> {
    const profileButton = this.page.getByRole('button', {name: /^(Manage Profile|Profile)$/});
    await this.openDropdown(profileButton);
    await profileButton.click();
    await expect(this.page.getByRole('dialog')).toBeVisible({timeout: Timeouts.ELEMENT_VISIBILITY});
  }

  /** Edits one field of the profile form, which renders each attribute as its own row with an
   * "Edit" button that reveals an inline input plus row-scoped Save/Cancel buttons (not one big
   * form with a single submit) — see packages/react/.../BaseUserProfile.tsx and its Vue
   * equivalent. `label` matches the schema attribute's configured displayName (e.g. "First
   * Name"), which BaseUserProfile renders once it receives the app's `userSchema` (fetched from
   * `/users/me/meta`). */
  async editProfileField(label: RegExp, value: string): Promise<void> {
    const row = this.page.getByRole('dialog').getByText(label).locator('../..');
    await row.getByRole('button', {name: 'Edit'}).click();
    await row.locator('input').fill(value);
    await row.getByRole('button', {name: 'Save'}).click();
    await expect(row.locator('input')).toHaveCount(0, {timeout: Timeouts.DEFAULT_ACTION});
  }

  async closeManageProfile(): Promise<void> {
    await this.page.getByRole('dialog').getByRole('button', {name: 'Close'}).click();
  }

  /** Verifies a field's row reverted from edit mode back to display mode showing the just-saved
   * value — checked in place rather than via the dropdown trigger or homepage, since whether
   * those pick up the change without a session refresh isn't guaranteed. */
  async verifyProfileFieldValue(label: RegExp, value: string): Promise<void> {
    const row = this.page.getByRole('dialog').getByText(label).locator('../..');
    await expect(row).toContainText(value, {timeout: Timeouts.ELEMENT_VISIBILITY});
  }
}

/**
 * Variant of {@link ThunderIDWebSamplePage} for every quickstart (react, vue, nextjs, nuxt),
 * whose Nav components redirect `UserDropdown`'s profile action to a full "Manage Account" page
 * (Home / Personal info / Security tabs) instead of opening the SDK's built-in profile popup.
 * Kept as a subclass rather than folded into the shared base since the base class's dialog-based
 * behavior remains independently correct and testable (it's what the SDK components fall back to
 * when an app doesn't override `onManageProfile`, e.g. `browser/quickstart`).
 */
export class ThunderIDAccountPageSamplePage extends ThunderIDWebSamplePage {
  /** Opens the Account page via the nav dropdown's "Manage Account" item. Lands on the Home
   * tab, same as the sidebar's own default. */
  private async openManageAccount(): Promise<void> {
    const manageAccountButton = this.page.getByRole('button', {name: 'Manage Account'});
    await this.openDropdown(manageAccountButton);
    await manageAccountButton.click();
  }

  /** Opens the Account page and switches to its Personal info tab. */
  async openManageProfile(): Promise<void> {
    await this.openManageAccount();

    const sidebar = this.page.getByRole('navigation');
    await sidebar.getByRole('button', {name: 'Personal info'}).click();
    await expect(this.page.getByRole('heading', {name: 'Personal info', level: 2})).toBeVisible({
      timeout: Timeouts.ELEMENT_VISIBILITY,
    });
  }

  /** Opens the Account page and switches to its Security tab, where each credential
   * (`ChangeCredential`) renders as a collapsed row that expands into the real form — see
   * {@link changeCredential}. */
  async openSecurityTab(): Promise<void> {
    await this.openManageAccount();

    const sidebar = this.page.getByRole('navigation');
    await sidebar.getByRole('button', {name: 'Security'}).click();
    await expect(this.page.getByRole('heading', {name: 'Security', level: 2})).toBeVisible({
      timeout: Timeouts.ELEMENT_VISIBILITY,
    });
  }

  /** Expands or collapses the named credential's row (`cta` is the row's own toggle button
   * text, e.g. "Change password") — the same button does both. Call {@link openSecurityTab}
   * first. */
  async toggleCredential(cta: string): Promise<void> {
    await this.page.getByRole('button', {name: cta}).click();
  }

  /** Fills the currently-open credential form's new-value and confirmation fields, without
   * submitting. */
  async fillCredentialFields(newValue: string, confirmValue: string): Promise<void> {
    await this.page.locator('input[name="newPassword"]').fill(newValue);
    await this.page.locator('input[name="confirmPassword"]').fill(confirmValue);
  }

  /** Whether the currently-open credential form's submit button is disabled. */
  async isCredentialSubmitDisabled(): Promise<boolean> {
    return this.page.getByRole('button', {name: /^Update /}).isDisabled();
  }

  /** Expands the named credential's row, fills the new value and its confirmation, and
   * submits. Waits for the row to collapse back afterward — `ChangeCredential`'s `onSuccess`
   * closes it in this sample, so that collapse is this method's proof the write actually
   * succeeded server-side rather than just that the button was clicked. Call
   * {@link openSecurityTab} first. */
  async changeCredential(cta: string, newValue: string): Promise<void> {
    const toggle = this.page.getByRole('button', {name: cta});
    // Bounded wait before the click: if the caller's page state doesn't actually have this row
    // (e.g. the Security tab isn't open), fail fast with a clear "not visible" error instead of
    // hanging on Playwright's default click-actionability wait, which is effectively bounded
    // only by the whole test's timeout.
    await expect(toggle).toBeVisible({timeout: Timeouts.ELEMENT_VISIBILITY});
    await toggle.click();

    await this.fillCredentialFields(newValue, newValue);
    await this.page.getByRole('button', {name: /^Update /}).click();

    await expect(toggle).toHaveAttribute('aria-expanded', 'false', {timeout: Timeouts.ELEMENT_VISIBILITY});
  }

  /** Same row structure as the base class's dialog variant (`BaseUserProfile` is unchanged —
   * only where it's mounted changed), scoped to the page's `<main>` landmark instead of a
   * dialog. */
  async editProfileField(label: RegExp, value: string): Promise<void> {
    const row = this.page.getByRole('main').getByText(label).locator('../..');
    await row.getByRole('button', {name: 'Edit'}).click();
    await row.locator('input').fill(value);
    await row.getByRole('button', {name: 'Save'}).click();
    await expect(row.locator('input')).toHaveCount(0, {timeout: Timeouts.DEFAULT_ACTION});
  }

  async verifyProfileFieldValue(label: RegExp, value: string): Promise<void> {
    const row = this.page.getByRole('main').getByText(label).locator('../..');
    await expect(row).toContainText(value, {timeout: Timeouts.ELEMENT_VISIBILITY});
  }
}
