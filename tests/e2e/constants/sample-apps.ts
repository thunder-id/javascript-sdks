// Copyright 2025 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

/**
 * Sample App Registry
 *
 * One entry per browser-testable quickstart app fetched into `.samples/` from thunder-id/samples, each with a dedicated port (so
 * all apps can run concurrently against a single backend) and a dedicated OAuth2 client (declared
 * with matching redirectUris in `thunderid-config/sample-apps.yaml`) so one app's E2E run never
 * collides with another's. `quickstarts/quickstart-node` is deliberately absent from this registry — it has
 * no browser UI, so no page object or port — but it still has its own OAuth2 client, see
 * `NodeQuickstart` below and `tests/node-quickstart/client-credentials.spec.ts`.
 *
 * Ports match each dev server's own default where possible (quickstarts/quickstart-browser keeps Vite's 5173,
 * quickstarts/quickstart-express keeps its hardcoded 3000) and are staggered elsewhere via each tool's own
 * `--port`/`-p` flag — no sample app source changes required.
 */
export const SampleApps = {
  BROWSER: {
    clientId: 'JS_SDK_E2E_BROWSER',
    dir: '.samples/quickstarts/quickstart-browser',
    envVar: 'BROWSER_APP_URL',
    name: 'quickstarts/quickstart-browser',
    port: 5173,
  },
  EXPRESS: {
    clientId: 'JS_SDK_E2E_EXPRESS',
    dir: '.samples/quickstarts/quickstart-express',
    envVar: 'EXPRESS_APP_URL',
    name: 'quickstarts/quickstart-express',
    port: 3000,
  },
  NEXTJS: {
    clientId: 'JS_SDK_E2E_NEXTJS',
    dir: '.samples/quickstarts/quickstart-nextjs',
    envVar: 'NEXTJS_APP_URL',
    name: 'quickstarts/quickstart-nextjs',
    port: 3001,
  },
  NUXT: {
    clientId: 'JS_SDK_E2E_NUXT',
    dir: '.samples/quickstarts/quickstart-nuxt',
    envVar: 'NUXT_APP_URL',
    name: 'quickstarts/quickstart-nuxt',
    port: 3002,
  },
  REACT: {
    clientId: 'JS_SDK_E2E_REACT',
    dir: '.samples/quickstarts/quickstart-react',
    envVar: 'REACT_APP_URL',
    name: 'quickstarts/quickstart-react',
    port: 5174,
  },
  VUE: {
    clientId: 'JS_SDK_E2E_VUE',
    dir: '.samples/quickstarts/quickstart-vue',
    envVar: 'VUE_APP_URL',
    name: 'quickstarts/quickstart-vue',
    port: 5175,
  },
} as const;

export type SampleAppKey = keyof typeof SampleApps;

/**
 * The one non-browser sample under E2E test: no page, no port, authenticates itself via
 * client_credentials (see AuthService.mjs) rather than signing a user in.
 */
export const NodeQuickstart = {
  clientId: 'JS_SDK_E2E_NODE',
  dir: '.samples/quickstarts/quickstart-node',
  name: 'quickstarts/quickstart-node',
} as const;

/** Resolves an app's base URL from its env var, falling back to `http://localhost:<port>`. */
export function sampleAppUrl(app: (typeof SampleApps)[SampleAppKey]): string {
  return process.env[app.envVar] ?? `http://localhost:${app.port}`;
}
