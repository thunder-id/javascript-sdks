// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

/**
 * The management collections the module's management route relays, with their path under a base URL.
 * Each can be overridden through `thunderid.endpoints`.
 */
const MANAGEMENT_COLLECTIONS: Record<string, string> = {
  agentTypes: 'agent-types',
  agents: 'agents',
  groups: 'groups',
  roles: 'roles',
  userTypes: 'user-types',
  users: 'users',
};

// Only overrides that are set reach the config: an empty `endpoints.groups` would replace `{baseUrl}/groups` with ''.
// The env names follow Nuxt's runtime config convention, so a set one can also be changed at runtime.
const envName = (key: string): string =>
  `NUXT_PUBLIC_THUNDERID_ENDPOINTS_${key.replace(/[A-Z]/g, (char: string) => `_${char}`).toUpperCase()}`;

const managementEndpoints: Record<string, string> = {};

Object.keys(MANAGEMENT_COLLECTIONS).forEach((key: string) => {
  const url: string = process.env[envName(key)] ?? '';

  if (url) managementEndpoints[key] = url;
});

export default defineNuxtConfig({
  app: {
    head: {
      link: [
        {href: '/favicon.svg', rel: 'icon', type: 'image/svg+xml'},
        {href: 'https://fonts.googleapis.com', rel: 'preconnect'},
        {
          href: 'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600&family=JetBrains+Mono:wght@400;500&display=swap',
          rel: 'stylesheet',
        },
      ],
      title: 'ThunderID Nuxt Playground',
    },
  },
  compatibilityDate: '2025-07-15',
  css: ['~/assets/styles.css'],
  devServer: {port: 3002},
  // The Nuxt DevTools overlay would sit on top of the playground's own panels.
  devtools: {enabled: false},
  modules: ['@thunderid/nuxt'],
  nitro: {
    // The Server page shows the source of the playground's handlers, served by /api/playground/source.
    serverAssets: [
      {baseName: 'playground-server', dir: './'},
      {baseName: 'playground-pages', dir: '../pages/protected'},
    ],
  },
  thunderid: {
    // Serves POST /api/auth/backchannel-logout, so ending the session in ThunderID ends it here too.
    backchannelLogout: {enabled: true},
    // Management collection overrides from NUXT_PUBLIC_THUNDERID_ENDPOINTS_*. Unset keys stay at
    // {baseUrl}/{collection}.
    endpoints: managementEndpoints,
    // Serves POST /api/auth/management, installs it as the management composables' fetcher, and auto-imports
    // the admin components and management composables of @thunderid/vue.
    management: true,
    // Serves the picker routes and registers UserSelect, AuthFlowSelect and UserTypeSelect for the explorer.
    resourcePickers: {authFlows: true, userTypes: true, users: true},
    scopes: ['openid', 'profile', 'email'],
  },
});
