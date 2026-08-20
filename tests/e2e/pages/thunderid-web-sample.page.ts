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
   * gap is wide enough to lose the first click outright rather than just render it late. */
  private async openDropdown(target: Locator): Promise<void> {
    const trigger = this.page.locator(USER_DROPDOWN_TRIGGER).first();
    for (let attempt = 1; attempt <= 3; attempt++) {
      await trigger.click();
      try {
        await expect(target).toBeVisible({timeout: 3000});
        return;
      } catch (error) {
        if (attempt === 3) throw error;
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

  /** Opens the SDK-provided profile dialog — `UserDropdown`'s built-in profile action, present
   * (and always on, no opt-in prop needed) in both the React and Vue packages, just under
   * different labels: React's wrapped `UserDropdown` hardcodes "Manage Profile"
   * (BaseUserDropdown.tsx's `handleManageProfile`); Vue's hardcodes plain "Profile"
   * (BaseUserDropdown.ts:359, `onProfileClick`/`profileContent`). Nuxt inherits Vue's via its own
   * `UserDropdown` wrapper, which delegates to the same `@thunderid/vue` component. */
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
