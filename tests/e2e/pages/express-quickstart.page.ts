// Copyright 2025 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

/**
 * quickstarts/quickstart-express Page Object — server-rendered Express app + @thunderid/express, cookie
 * session. No client SDK, plain server-rendered markup (a native <details> dropdown), so its own
 * selectors: see thunder-id/samples quickstarts/quickstart-express/lib/layout.mjs.
 */

import {Page, expect} from '@playwright/test';
import {GateLoginPage} from './gate-login.page';
import {Timeouts} from '../constants/timeouts';

export class ExpressQuickstartPage extends GateLoginPage {
  constructor(page: Page) {
    super(page);
  }

  async goto(url: string): Promise<void> {
    await this.page.goto(url, {waitUntil: 'commit'});
  }

  async verifyHomePageLoaded(): Promise<void> {
    await expect(this.page.locator('a.btn-primary[href="/login"]')).toBeVisible({
      timeout: Timeouts.ELEMENT_VISIBILITY,
    });
  }

  async clickSignInButton(): Promise<void> {
    await this.page.locator('a.btn-primary[href="/login"]').click();
  }

  async verifyLoggedIn(): Promise<void> {
    await expect(this.page.locator('.user-menu-trigger')).toBeVisible({timeout: Timeouts.REDIRECT});
  }

  async verifyLoggedOut(): Promise<void> {
    await this.verifyHomePageLoaded();
  }

  async logout(): Promise<void> {
    await this.page.locator('.user-menu-trigger').click();
    await this.page.locator('a.user-menu-item[href="/logout"]').click();
    await this.confirmSignOutIfPrompted();
  }

  /** Opens the token debug page via the user menu's "Token debug" link (see lib/layout.mjs). */
  async openTokenDebug(): Promise<void> {
    await this.page.locator('.user-menu-trigger').click();
    await this.page.locator('a.user-menu-item[href="/token"]').click();
  }

  async verifyTokenDebugLoaded(): Promise<void> {
    await expect(this.page.locator('.token-raw')).toBeVisible({timeout: Timeouts.ELEMENT_VISIBILITY});
  }

  /** Reads the raw access token JWT rendered across the three .token-part--* spans — see
   * thunder-id/samples quickstarts/quickstart-express/index.mjs's /token handler. */
  async getDisplayedAccessToken(): Promise<string> {
    const raw = this.page.locator('.token-raw');
    await raw.waitFor({state: 'visible', timeout: Timeouts.ELEMENT_VISIBILITY});
    const header = await raw.locator('.token-part--header').innerText();
    const payload = await raw.locator('.token-part--payload').innerText();
    const signature = await raw.locator('.token-part--signature').innerText();
    return `${header}.${payload}.${signature}`;
  }
}
