# ThunderID Nuxt Playground

A Nuxt 3 app that exercises every capability of `@thunderid/nuxt`, in the browser and on the Nuxt server, against a
local ThunderID server. It links the SDK packages from this workspace (`workspace:*`), so it always runs the code you
are changing. It is not published.

| Page                         | What it does                                                                                                                                                                                                                                                                                                                       |
| ---------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Overview (`/`)               | Capability checks for the client and the server (run one or run all, pass/fail with a reason, filters), a session card with an access token countdown read from the server session, the module configuration, the resolved management endpoints, and a live SDK event log.                                                         |
| Components (`/components`)   | A component explorer: the components the module auto-imports (the admin components included), the primitives of `@thunderid/vue` (`DataTable` included) and `Attribution`, with stories, a viewport, theme, and grid toolbar, and Controls, Code (a Vue SFC generated from the props), Actions, and Accessibility panels.          |
| Composables (`/composables`) | Live values of `useThunderID`, `useUser`, `useThunderIDI18n`, `useTheme`, `useFlowMeta`, and `useFlow`, then the management composables: `useGrantedPermissions`, `useManagementEndpoint`, the group, role, user type, agent type, user group and agent group/role queries, and `useCreateGroup` (shown, not run).                 |
| Server (`/server`)           | The context the Nitro plugin built for the server render (`getThunderIDContext`), the session behind `useServerSession`, and an API explorer for every `/api/auth/*` route the module mounts (`POST /api/auth/management` included), the playground's own server routes, and the pages behind route middleware, with an SDK trace. |

The playground's own server code shows how an app uses the module:

- `server/api/playground/*.ts`: API routes built on `useServerSession`, `requireServerSession`, and
  `getValidAccessToken` from `@thunderid/nuxt/server`.
- `server/middleware/playground.ts`: server middleware that uses `createRouteMatcher` from `@thunderid/nuxt/utils`. It
  starts the SDK trace for API routes and records `getThunderIDContext` for page renders.
- `pages/protected/index.vue` and `pages/protected/scopes.vue`: pages behind the named `auth` route middleware and a
  `defineThunderIDMiddleware({requireScopes})` middleware.

## Set up a local ThunderID server

1. Start ThunderID on `https://localhost:8090` (see the [ThunderID docs](https://thunderid.dev)) and sign in to the
   Console.
2. Create an application and register this redirect URI: `http://localhost:3002/api/auth/callback`. The browser never
   calls ThunderID directly, so no allowed origins (CORS) are needed.
3. Note the application's client ID, and for the app-native flows its application ID and Flow Secret.

## Run

```bash
# From the repository root: install and build the SDKs once.
pnpm install
pnpm build

# Configure the playground.
cp playgrounds/nuxt/.env.example playgrounds/nuxt/.env
# Set NUXT_PUBLIC_THUNDERID_CLIENT_ID, and NUXT_PUBLIC_THUNDERID_APPLICATION_ID and THUNDERID_FLOW_SECRET for the
# app-native flows.

pnpm --filter @thunderid/playground-nuxt dev
```

Open http://localhost:3002. After changing SDK source, rebuild that package (for example
`pnpm --filter @thunderid/nuxt build`) and restart the dev server.

| Variable                                                                              | Purpose                                                                                    |
| ------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| `NUXT_PUBLIC_THUNDERID_BASE_URL`                                                      | ThunderID server, for example `https://localhost:8090`.                                    |
| `NUXT_PUBLIC_THUNDERID_CLIENT_ID`                                                     | Client ID of the application. Needed for the redirect sign-in.                             |
| `THUNDERID_CLIENT_SECRET`                                                             | Client secret, for a confidential client. Server-only.                                     |
| `NUXT_PUBLIC_THUNDERID_APPLICATION_ID`                                                | Application ID. Needed by `<SignIn />`, `<SignUp />`, and their checks.                    |
| `THUNDERID_FLOW_SECRET`                                                               | Flow Secret of the application, sent when an app-native flow starts. Server-only.          |
| `THUNDERID_SESSION_SECRET`                                                            | Signs the session cookie. Unset uses an insecure development default.                      |
| `NUXT_PUBLIC_THUNDERID_AFTER_SIGN_IN_URL`, `NUXT_PUBLIC_THUNDERID_AFTER_SIGN_OUT_URL` | Where the browser goes after sign-in and sign-out. Default to `/`.                         |
| `NUXT_PUBLIC_THUNDERID_ENDPOINTS_{USERS,USER_TYPES,GROUPS,ROLES,AGENTS,AGENT_TYPES}`  | Optional. Overrides one collection URL.                                                    |
| `NODE_TLS_REJECT_UNAUTHORIZED=0`                                                      | Lets the Nuxt server talk to a local ThunderID with a self-signed certificate. Local only. |

`nuxt.config.ts` turns on the opt-in features of the module so the playground can show them: back-channel logout, the
three resource pickers (`UserSelect`, `AuthFlowSelect`, `UserTypeSelect`), and `management`, which serves
`POST /api/auth/management`, installs it as the `http.fetcher` of the management composables, and auto-imports the admin
components and management composables of `@thunderid/vue`. It also builds `thunderid.endpoints` from the endpoint
variables above. Only set variables become overrides; unset collections resolve to
`NUXT_PUBLIC_THUNDERID_BASE_URL/<collection>`, and the Overview page shows where each collection resolves and why. The
per-collection names use `ENDPOINTS` (plural), not the `ENDPOINT_<KEY>` used by the other playgrounds, because that is
the name Nuxt's runtime config mapping gives `thunderid.endpoints.<key>` (`NUXT_PUBLIC_THUNDERID_ENDPOINTS_GROUPS`).
There is no `APPLICATIONS` key: the module's management route does not relay that collection.

Without a client ID the app still runs: the Nitro plugin does not initialize, and checks that need it fail with the
reason.

## Custom rendering

The admin components take a default scoped slot, the same pattern as `<SignIn>`, and render it in place of their own UI
with the component's data, state and handlers. The explorer's **Custom rendering** group draws `UserList` as a
[PrimeVue](https://primevue.org) DataTable, `GroupCreate` with PrimeVue inputs and `UserDetails` as a PrimeVue card,
registered through `plugins/primevue.ts`. PrimeVue is a playground dependency only.

## Checks

Checks that would leave the page (redirect sign-in, sign-out) only run from their own **Run** button; **Run all checks**
marks them as not run. Results are kept in `sessionStorage` so they survive the sign-in redirect.

The **Management** section checks the module option and fetcher, that every auto-imported admin component and composable
resolves to the `@thunderid/vue` export, the route's URL allowlist (a foreign host gets 400, the configured groups
collection is accepted), that a management call reaches only `/api/auth/management` (observed with a
`PerformanceObserver`), endpoint resolution with overrides for `agentTypes`, `groups` and `roles`, the groups, roles,
agent types, agent groups/roles, user groups and user types APIs, the permission helpers, and `useGrantedPermissions`.
The API checks always send the request: without a session they fail with the route's `HTTP 401` and the reason (for
example, no client ID configured).

## Known SDK gaps

The playground reports these instead of faking them:

- The client context is a facade over the server session: `getIdToken`, `getDecodedIdToken`, `signInSilently`,
  `exchangeToken`, and `http.request` are no-ops, and there is no `getStorageManager`. Their checks are shown as
  unavailable; the Server page reads claims on the server instead.
- No organization API (`useOrganization`, `switchOrganization`): the Organizations check is shown as unavailable.
- No public event subscription. The event log is built from observed composable state plus the calls the playground
  makes.
- No way to issue an expired copy of a session: the cookie is signed with `THUNDERID_SESSION_SECRET` and the module
  exposes no helper for it, so the API explorer's "Expired access token" identity is disabled.
- The management route only relays users, user types, groups, roles, agents and agent types. `applications` is a
  resource endpoint key and `useGetApplications` exists in `@thunderid/vue`, but the route answers 400 for it and the
  module does not auto-import the application composables.
- `DataTable`, `Attribution`, `useManagementEndpoint`, `useResourceQuery` and `useResourceMutation` are not
  auto-imported with `management`; the playground imports them from `@thunderid/vue`.
- The endpoint overrides have no env mapping in the module: `NUXT_PUBLIC_THUNDERID_ENDPOINTS_*` only works when the key
  is already in `nuxt.config.ts`, so the playground reads the variables in `nuxt.config.ts` itself.
- `MANAGEMENT_COMPONENTS`, `MANAGEMENT_COMPOSABLES`, `NuxtAPIRoutes.MANAGEMENT`, the `ThunderIDManagementRequest` and
  `ThunderIDManagementResult` types, and `getManagementCollectionUrls` are not exported from `@thunderid/nuxt`, so the
  playground repeats the lists and the route path, and cannot show the route's allowlist itself.
- The management composables are not SSR-aware: on a server render they report `isLoading` and fetch again in the
  browser.
- An unauthenticated management request (401) is shown by the admin components as the generic "could not load" message;
  `toManagementErrorMessage` only distinguishes 403 and 404. `RESOURCE_ENDPOINT_KEYS` is not exported either.
