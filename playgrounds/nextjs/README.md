# ThunderID Next.js Playground

A Next.js (App Router) app that exercises every capability of `@thunderid/nextjs`, on the client and on the server,
against a local ThunderID server. It links the SDK packages from this workspace (`workspace:*`), so it always runs the
code you are changing. It is not published.

| Page                       | What it does                                                                                                                                                                                                                                                                                                                                                                 |
| -------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Overview (`/`)             | Capability checks driven by the real SDK API, client and server (run one or run all, pass/fail with a reason, filters), a session card with an access token countdown, the provider configuration as the server sees it, the resolved management endpoints, and a live SDK event log.                                                                                        |
| Components (`/components`) | A component explorer: a searchable tree of the `@thunderid/nextjs` components and their stories (including the Admin group: the management components, each as a Base story with sample data and a live story, plus `DataTable` and `Attribution`), a viewport, theme, and grid toolbar, and Controls, Code (a client component snippet), Actions, and Accessibility panels. |
| Hooks (`/hooks`)           | The management hooks from `@thunderid/nextjs` (groups, roles, user groups and types, agent types, groups and roles, and the group and role mutations on a temporary resource) and `useGrantedPermissions`, next to the `@thunderid/react` hook for comparison.                                                                                                               |
| Server (`/server`)         | A Server Component that reads the session with `thunderid()` while rendering, with a trace of each SDK call, and an API explorer for the proxy, route handlers, protected routes, and the back-channel logout endpoint ("Send as" session or anonymous).                                                                                                                     |
| Tokens (`/tokens`)         | The access token held in the session cookie, read through a server action and decoded locally, with expiry and claim notes.                                                                                                                                                                                                                                                  |
| Protected (`/protected`)   | A page behind `protectRoute()`.                                                                                                                                                                                                                                                                                                                                              |
| Sign in (`/signin`)        | The app-native `<SignIn />` page. Point `NEXT_PUBLIC_THUNDERID_SIGN_IN_URL` at it to use it instead of the hosted page.                                                                                                                                                                                                                                                      |

Where the SDK runs:

- `src/app/layout.tsx` mounts `ThunderIDProvider` from `@thunderid/nextjs/server`. It resolves the session on the server
  for every request and hands it to the client components.
- `src/middleware.ts` runs `thunderIDProxy()`: it verifies (and refreshes) the session cookie, protects `/protected(.*)`
  and `/api/protected(.*)` with `createRouteMatcher()` and `protectRoute()`, and answers `/api/proxy-trace` with what it
  resolved.
- `src/app/api/*` holds the route handlers: `thunderid()` in `/api/session` and `/api/protected/profile`, and
  `backchannelLogout()` in `/api/auth/backchannel-logout`.
- `src/app/layout.tsx` also passes `endpoints` to `ThunderIDProvider`, built from the optional management variables
  below (`src/lib/serverConfig.ts`). The provider hands the browser only the management overrides, and the admin
  components and hooks send every management request through the SDK's `managementRequestAction` server action, which
  adds the server-held access token. The Management checks wrap `fetch` while a request runs to confirm that only a
  `Next-Action` POST to the app leaves the browser.
- `src/app/actions.ts` holds the playground's own server actions. Sign-in, sign-out, sign-up, token refresh, and profile
  updates use the SDK's server actions through `useThunderID()`.

## Set up a local ThunderID server

1. Start ThunderID on `https://localhost:8090` (see the [ThunderID docs](https://thunderid.dev)) and sign in to the
   Console.
2. Create an application for a server-side web app and register these URLs:
   - Redirect URI: `http://localhost:3001`
   - Back-channel logout URI (optional): `http://localhost:3001/api/auth/backchannel-logout`
3. Note the client ID and client secret (redirect sign-in), and the application ID and Flow Secret (app-native sign-in,
   sign-up, and the flow metadata).

The Next.js server talks to ThunderID, not the browser, so no CORS setup is needed. The local server uses a self-signed
certificate; `.env.example` sets `NODE_TLS_REJECT_UNAUTHORIZED=0` so the Next.js server accepts it. Use that for local
development only.

## Run

```bash
# From the repository root: install and build the SDKs once.
pnpm install
pnpm build

# Configure the playground.
cp playgrounds/nextjs/.env.example playgrounds/nextjs/.env
# Set NEXT_PUBLIC_THUNDERID_CLIENT_ID and THUNDERID_CLIENT_SECRET, and/or NEXT_PUBLIC_THUNDERID_APPLICATION_ID and
# THUNDERID_FLOW_SECRET, and a THUNDERID_SECRET.

pnpm --filter @thunderid/playground-nextjs dev
```

Open http://localhost:3001. After changing SDK source, rebuild that package (for example
`pnpm --filter @thunderid/nextjs build`) and restart the dev server.

| Variable                                                                                  | Purpose                                                                                   |
| ----------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| `NEXT_PUBLIC_THUNDERID_BASE_URL`                                                          | ThunderID server. `.env.example` sets `https://localhost:8090`.                           |
| `NEXT_PUBLIC_THUNDERID_CLIENT_ID`, `THUNDERID_CLIENT_SECRET`                              | Redirect sign-in, and the token refresh in the proxy and in `refreshToken()`.             |
| `NEXT_PUBLIC_THUNDERID_APPLICATION_ID`, `THUNDERID_FLOW_SECRET`                           | App-native `<SignIn />` and `<SignUp />`, and the flow metadata (translations, theme).    |
| `NEXT_PUBLIC_THUNDERID_AFTER_SIGN_IN_URL`, `NEXT_PUBLIC_THUNDERID_AFTER_SIGN_OUT_URL`     | Redirect targets. Unset uses the app origin.                                              |
| `NEXT_PUBLIC_THUNDERID_SCOPES`                                                            | Space separated scopes.                                                                   |
| `NEXT_PUBLIC_THUNDERID_SIGN_IN_URL`                                                       | Optional. `/signin` sends `<SignInButton />` and `protectRoute()` to the app-native page. |
| `THUNDERID_SECRET`                                                                        | Signs the session cookie. Unset uses a development default and logs a warning.            |
| `NODE_TLS_REJECT_UNAUTHORIZED`                                                            | `0` accepts the local server's self-signed certificate. Local development only.           |
| `THUNDERID_ENDPOINT_GROUPS`, `_ROLES`, `_AGENT_TYPES`, `_AGENTS`, `_USERS`, `_USER_TYPES` | Optional, playground only. Full URL of one management collection.                         |

Unset, each management collection resolves to `NEXT_PUBLIC_THUNDERID_BASE_URL/<path>`. There is no
`THUNDERID_ENDPOINT_APPLICATIONS`: the SDK's management relay (`MANAGEMENT_COLLECTIONS` in `@thunderid/node`) does not
forward the applications collection.

Without a server or an application the app still runs: checks that need one fail with the reason.

## Custom rendering

The admin components take a `children` render function, the same pattern as `<SignIn>`, and render it in place of their
own UI with the component's data, state and handlers. The explorer's **Custom rendering** group draws `UserList` as an
[MUI](https://mui.com) DataGrid with server-side paging, `GroupCreate` as an MUI form and `UserDetails` as an MUI card.
MUI is a playground dependency only. The live stories still go through the server action, so the browser never holds the
token.

## Checks

Checks that would leave the page (redirect sign-in, sign-out) only run from their own **Run** button; **Run all checks**
marks them as not run. Results are kept in `sessionStorage` so they survive the sign-in redirect.

The Management and Permissions sections cover the management APIs:

- **Management endpoints**: the client context received exactly the server's management overrides and nothing else, an
  explicit URL wins over an override, and `groups`, `roles`, and `agentTypes` resolve to the override or
  `{baseUrl}/{path}`.
- **Management via server action**: a `getGroups()` call through the provider's `http.fetcher` makes no browser request
  to ThunderID and no request with an `Authorization` header; it passes signed out too (the action answers HTTP 401).
- **Groups, Roles, Agent types, Agent groups and roles, User groups, User types**: the core API functions with the
  provider's fetcher. Signed out they fail with "HTTP 401 from the management server action: no session, sign in first".
- **Group lifecycle, Role lifecycle**: create, update, add and remove yourself, and delete a temporary resource. They
  write data, so they only run from their own **Run** button.
- **Granted permissions (server)** compares `useGrantedPermissions()` (server action) with the token's `scope` claim;
  **(client token)** checks that the `@thunderid/react` hook gets `[]`, since the browser holds no token; **Permission
  helpers** runs `getTokenPermissions()` and `hasPermission()` on a fixture.

## Known SDK gaps

The playground reports these instead of faking them:

- No ID token on the server. The session cookie keeps the access token and a few claims, and `thunderid()` has no
  `getIdToken()` or `getDecodedIdToken()`. The Tokens page shows the ID token as unavailable.
- No public session API beyond the access token. Expiry and scopes come from decoding the access token; the session
  payload (`getSession()`, with the refresh token's presence) is only available inside `thunderIDProxy()`.
- No organization API (`useOrganization`, `switchOrganization`): the Organizations check is shown as unavailable.
- No event subscription. The event log is built from observed `useThunderID()`/`useUser()` state changes plus the SDK
  calls the playground makes.
- `useThunderID()` returns a context whose fields are all optional, and the package does not export its type; see
  `src/lib/sdk.ts`. Hooks such as `useUser()`, `useI18n()`, and `useTheme()` come from `@thunderid/react`, which
  `@thunderid/nextjs` does not re-export.
- No environment variable for `endpoints`. The SDK reads `NEXT_PUBLIC_THUNDERID_*` for the rest of the config but not
  the management overrides, so the playground reads its own variables and passes the `endpoints` prop.
- `managementRequestAction` initializes the client with `{}` when it is not initialized yet (for example in another
  worker), which loses `endpoints` passed as a prop; overridden collections would then be refused with HTTP 400.
- `managementRequestAction` and `getGrantedPermissionsAction` are not exported, so the playground reaches them only
  through the provider's `http.fetcher` and `useGrantedPermissions()`.
- `MANAGEMENT_COLLECTIONS` (from `@thunderid/node`) and `RESOURCE_ENDPOINT_KEYS` are not exported from
  `@thunderid/nextjs` or `@thunderid/browser`; `src/lib/management.ts` mirrors the collection paths.
- `DataTable` and `Attribution` are not re-exported from `@thunderid/nextjs`; the stories import them from
  `@thunderid/react`. The management core functions and `getTokenPermissions`/`hasPermission` come from
  `@thunderid/browser`.
- `useGrantedPermissions` from `@thunderid/react` resolves to `[]` under Next.js (its `getAccessToken()` is unsupported
  there) without any warning; only the `@thunderid/nextjs` hook works.
- `next build` warns that `jose` uses `CompressionStream`, which the Edge runtime does not support. The proxy needs
  `@thunderid/node`, and `@thunderid/node` and `@thunderid/javascript` import the whole of `jose` (including its JWE
  code) instead of the `jose/jwt/verify`-style subpaths.
