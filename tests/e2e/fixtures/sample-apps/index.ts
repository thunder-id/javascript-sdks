// Copyright 2025 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

/**
 * Sample App Fixtures
 *
 * One page-object fixture per sample app. Each test file only pulls in the one fixture it needs.
 */

import {test as base} from '@playwright/test';
import {BrowserQuickstartPage} from '../../pages/browser-quickstart.page';
import {ExpressQuickstartPage} from '../../pages/express-quickstart.page';
import {ThunderIDAccountPageSamplePage} from '../../pages/thunderid-web-sample.page';

interface SampleAppFixtures {
  browserQuickstartPage: BrowserQuickstartPage;
  expressQuickstartPage: ExpressQuickstartPage;
  nextjsQuickstartPage: ThunderIDAccountPageSamplePage;
  nuxtQuickstartPage: ThunderIDAccountPageSamplePage;
  reactQuickstartPage: ThunderIDAccountPageSamplePage;
  vueQuickstartPage: ThunderIDAccountPageSamplePage;
}

export const test = base.extend<SampleAppFixtures>({
  browserQuickstartPage: async ({page}, use) => {
    await use(new BrowserQuickstartPage(page));
  },
  expressQuickstartPage: async ({page}, use) => {
    await use(new ExpressQuickstartPage(page));
  },
  // Every quickstart's Nav redirects "Manage Profile" to a full Account page instead of the
  // SDK's built-in popup — see ThunderIDAccountPageSamplePage's doc comment.
  nextjsQuickstartPage: async ({page}, use) => {
    await use(new ThunderIDAccountPageSamplePage(page));
  },
  nuxtQuickstartPage: async ({page}, use) => {
    await use(new ThunderIDAccountPageSamplePage(page));
  },
  reactQuickstartPage: async ({page}, use) => {
    await use(new ThunderIDAccountPageSamplePage(page));
  },
  vueQuickstartPage: async ({page}, use) => {
    await use(new ThunderIDAccountPageSamplePage(page));
  },
});

export {expect} from '@playwright/test';
