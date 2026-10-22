# ThunderID Browser Playground

A framework-free TypeScript and Vite app that exercises every capability of `@thunderid/browser` and its
`ThunderIDBrowserClient` against a local ThunderID server. It links the SDK packages from this workspace
(`workspace:*`), so it always runs the code you are changing. It is not published.

| Page                     | What it does                                                                                                                                                                                                                                     |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Overview (`#/`)          | Capability checks driven by `ThunderIDBrowserClient` (run one or run all, pass/fail with a reason, filters), a session card with an access token countdown, the client configuration, and a live event log fed by the client's own `on()` hooks. |
| UI helpers (`#/helpers`) | An explorer for the UI helpers the package exports (avatars, anonymous names, logos, emoji URIs, theme detection, theme variables, border radius), with viewport, theme, and grid toolbar and Controls, Code, Actions, and Accessibility panels. |
| Tokens (`#/tokens`)      | The access and ID tokens held by the client, decoded locally, with expiry and claim notes.                                                                                                                                                       |

`@thunderid/browser` ships no UI components or stylesheets, so the explorer covers its UI helper functions instead.

## Set up a local ThunderID server

1. Start ThunderID on `https://localhost:8090` (see the [ThunderID docs](https://thunderid.dev)) and sign in to the
   Console.
2. Create a single-page (public) application and register these URLs:
   - Redirect URIs: `http://localhost:5175`
   - Allowed origins (CORS): `http://localhost:5175`
3. Note the application's client ID and application ID.
4. Accept the server's self-signed certificate once by opening `https://localhost:8090` in the browser you use for the
   playground.

## Run

```bash
# From the repository root: install and build the SDKs once.
pnpm install
pnpm build

# Configure the playground.
cp playgrounds/browser/.env.example playgrounds/browser/.env
# Set VITE_THUNDERID_CLIENT_ID, and VITE_THUNDERID_APPLICATION_ID for the flow checks.

pnpm --filter @thunderid/playground-browser dev
```

Open http://localhost:5175. After changing SDK source, rebuild that package (for example
`pnpm --filter @thunderid/browser build`) and reload.

| Variable                                                                | Purpose                                                                                                                                      |
| ----------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| `VITE_THUNDERID_BASE_URL`                                               | ThunderID server. Defaults to `https://localhost:8090`.                                                                                      |
| `VITE_THUNDERID_CLIENT_ID`                                              | Client ID of the SPA application. Required for sign-in.                                                                                      |
| `VITE_THUNDERID_APPLICATION_ID`                                         | Application ID. Needed by the flow metadata and app-native sign-in checks.                                                                   |
| `VITE_THUNDERID_AFTER_SIGN_IN_URL`, `VITE_THUNDERID_AFTER_SIGN_OUT_URL` | Redirect targets. Default to the app origin.                                                                                                 |
| `VITE_THUNDERID_SCOPES`                                                 | Space separated scopes. Defaults to `openid profile email`.                                                                                  |
| `VITE_THUNDERID_STORAGE`                                                | `sessionStorage`, `localStorage`, or `browserMemory`. Unset uses the SDK default.                                                            |
| `VITE_THUNDERID_ENDPOINT_<KEY>`                                         | Optional. One collection URL each. `<KEY>` is `USERS`, `USER_TYPES`, `GROUPS`, `ROLES`, `AGENTS`, `AGENT_TYPES`, `APPLICATIONS`, or `FLOWS`. |

The endpoint variables become `endpoints` in `initialize()`; unset collections resolve to
`VITE_THUNDERID_BASE_URL/<collection>`. A host other than the base URL must allow the playground's origin (CORS). The
Overview shows the **Resolved endpoints** card: each management collection and sign-in and self-service endpoint, and
which ones an override set.

Without a server or a client ID the app still runs: checks that need one fail with the reason.

## How it uses the SDK

`src/lib/client.ts` creates one `ThunderIDBrowserClient` with the default config type, subscribes to the `initialize`,
`sign-in`, `sign-out`, `sign-out-failed`, `revoke-access-token`, and `http-request-*` hooks, then calls `initialize()`.
When ThunderID redirects back with `?code=`, it calls `signIn()` to exchange the code; `?error=` is reported and
stripped. Every hook and every call the playground makes shows up in the event log.

## Checks

Checks that would leave the page or end the session (redirect sign-in, sign-out, token revocation) only run from their
own **Run** button; **Run all checks** marks them as not run. Results are kept in `sessionStorage` so they survive the
sign-in redirect.

The **Management** checks call the core management functions `@thunderid/browser` re-exports, with
`resolveResourceEndpoint()` for the collection URL and `createHttpClientFetcher()` as the fetcher, so the client
attaches the access token and the `http-request-*` hooks fire:

- endpoint resolution for `groups`, `roles` and `agentTypes`: the overrides survive `initialize()` (read back with
  `getConfiguration()`), and an explicit URL wins over `endpoints`, which wins over `baseUrl`;
- `getTokenPermissions()` on the access token, and `hasPermission()` for `system:group:view` and `system:role:view`;
- `hasPermission()` matching rules (a permission covers the paths under it), run locally;
- `getGroups()`, `getGroupMembers()` (first group), `getRoles()` with `getRole()`, `getRoleAssignments()` (first role),
  `getAgentTypes()`, and `getUserGroups()` for the signed-in user's `sub`. A 403 names the permission the token needs;
- `createResourceInvalidator()`, `resolveManagedIdentityName()` and `toManagementErrorMessage()` (with the default en-US
  bundle), run locally.

## Known SDK gaps

The playground reports these instead of faking them:

- Stored session data (`expires_in`, `created_at`, `refresh_token`) sits behind the protected `getStorageManager()`. The
  session card and Tokens page take expiry from the access token's `exp`/`iat`, which is unknown for opaque tokens, and
  refresh token presence can only be tested by calling `refreshAccessToken()`.
- `ThunderIDBrowserClient` has no management methods (no counterpart of `@thunderid/node`'s `management()`): the checks
  call the core functions with a `fetcher` and `url` they build themselves.
- No table of default resource paths reaches `@thunderid/browser` (`MANAGEMENT_COLLECTIONS` is in `@thunderid/node`
  only), so `src/config.ts` and `src/lib/endpoints.ts` list the collection and sign-in paths.
- Nothing reports the permissions of an opaque access token; `getTokenPermissions()` returns none for one.
