# ThunderID React Playground

A Vite app that exercises every capability of `@thunderid/react` against a local ThunderID server. It links the SDK
packages from this workspace (`workspace:*`), so it always runs the code you are changing. It is not published.

| Page                        | What it does                                                                                                                                                                                                                                     |
| --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Overview (`#/`)             | Capability checks driven by the real SDK API (run one or run all, pass/fail with a reason, filters), a session card with an access token countdown, the provider configuration with the resolved management endpoints, and a live SDK event log. |
| Components (`#/components`) | A component explorer: a searchable tree of the SDK components and their stories (including the admin components, `DataTable`, and `Attribution`), a viewport, theme, and grid toolbar, and Controls, Code, Actions, and Accessibility panels.    |
| Hooks (`#/hooks`)           | Live values of `useThunderID`, `useUser`, `useI18n`, `useTranslation`, `useTheme`, `useFlow`, `useGrantedPermissions`, the management query hooks, and the group and role mutation hooks.                                                        |
| Tokens (`#/tokens`)         | The access and ID tokens held by the SDK, decoded locally, with expiry and claim notes.                                                                                                                                                          |

## Set up a local ThunderID server

1. Start ThunderID on `https://localhost:8090` (see the [ThunderID docs](https://thunderid.dev)) and sign in to the
   Console.
2. Create a single-page (public) application and register these URLs:
   - Redirect URIs: `http://localhost:5173`
   - Allowed origins (CORS): `http://localhost:5173`
3. Note the application's client ID and application ID.
4. Accept the server's self-signed certificate once by opening `https://localhost:8090` in the browser you use for the
   playground.

## Run

```bash
# From the repository root: install and build the SDKs once.
pnpm install
pnpm build

# Configure the playground.
cp playgrounds/react/.env.example playgrounds/react/.env
# Set VITE_THUNDERID_CLIENT_ID, and VITE_THUNDERID_APPLICATION_ID for the app-native flows.

pnpm --filter @thunderid/playground-react dev
```

Open http://localhost:5173. After changing SDK source, rebuild that package (for example
`pnpm --filter @thunderid/react build`) and reload.

| Variable                                                                | Purpose                                                                                                                                                                                             |
| ----------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `VITE_THUNDERID_BASE_URL`                                               | ThunderID server. Defaults to `https://localhost:8090`.                                                                                                                                             |
| `VITE_THUNDERID_CLIENT_ID`                                              | Client ID of the SPA application. Required for sign-in.                                                                                                                                             |
| `VITE_THUNDERID_APPLICATION_ID`                                         | Application ID. Needed by `<SignIn />`, `<SignUp />`, `<Recovery />` and their checks.                                                                                                              |
| `VITE_THUNDERID_AFTER_SIGN_IN_URL`, `VITE_THUNDERID_AFTER_SIGN_OUT_URL` | Redirect targets. Default to the app origin.                                                                                                                                                        |
| `VITE_THUNDERID_SCOPES`                                                 | Space separated scopes. Defaults to `openid profile email`.                                                                                                                                         |
| `VITE_THUNDERID_STORAGE`                                                | `sessionStorage`, `localStorage`, or `browserMemory`. Unset uses the SDK default.                                                                                                                   |
| `VITE_THUNDERID_ENDPOINT_<KEY>`                                         | Optional per-collection override (full URL), passed to `<ThunderIDProvider endpoints />`. `<KEY>` is `USERS`, `USER_TYPES`, `GROUPS`, `ROLES`, `AGENTS`, `AGENT_TYPES`, `APPLICATIONS`, or `FLOWS`. |

Unset, each management collection resolves to `VITE_THUNDERID_BASE_URL/<collection>`.

Without a server or a client ID the app still runs: checks that need one fail with the reason.

## Custom rendering

Every admin component also takes a `children` render function, the same pattern as `<SignIn>`, and renders it in place
of its own UI. The function receives the component's data, loading and error state, and handlers: for a list, the rows,
the default `columns`, `limit`, `offset`, `totalResults`, `onPageChange` and `onSelect`; for a form, the values,
`handleInputChange`, `handleSubmit` and `isValid`; for details, the record and its actions.

The **Custom rendering** group in the explorer shows this with [MUI](https://mui.com), which only the playground depends
on:

- **UserList → MUI DataGrid**: the SDK's columns become grid columns, and the grid's server-side paging drives
  `onPageChange`.
- **GroupCreate → MUI form**: MUI text fields bound to `values` and `handleInputChange`.
- **UserDetails → MUI card**: the user's visible attributes and groups as chips, with delete only when allowed.

Each has a sample-data story (the `Base*` component) and a live story (the connected component).

## Checks

Checks that would leave the page (redirect sign-in, sign-out) only run from their own **Run** button; **Run all checks**
marks them as not run. Results are kept in `sessionStorage` so they survive the sign-in redirect.

The **Management endpoints** checks run offline: one confirms the provider context carries every `endpoints` override,
the other routes `getGroups`, `getRoles`, and `getAgentTypes` through a recording fetcher to prove the default
(`{baseUrl}/{collection}`), override, and explicit `url` precedence for the new keys. The **Management** checks call the
core API functions (`getGroups`, `getRoles`, `getUserTypes`, `getUserGroups`, `getAgentTypes`, `getAgentGroups`,
`getAgentRoles`, and `getTokenPermissions`/`hasPermission`) with the signed-in user's token; a 403 names the missing
permission. They never write; the group and role writes run only from the buttons on the Hooks page (they create and
then act on a `playground-*` scratch group or role) and from the live admin stories.

The playground has no admin route section: `createAdminRoutes()` and `AdminPage` need `react-router` (or TanStack
Router) and a router provider, while this app uses a tiny hash router and depends only on `@thunderid/react`. The admin
components they render are covered by the explorer's live stories instead.

## Known SDK gaps

The playground reports these instead of faking them:

- No organization API in `@thunderid/react` (`useOrganization`, `switchOrganization`): the Organizations check is shown
  as unavailable.
- No public event subscription. The browser client has `on('sign-in' | 'sign-out' | ...)` hooks, but `ThunderIDProvider`
  keeps them internal. The event log is built from observed `useThunderID()`/`useUser()` state changes plus the SDK
  calls the playground makes. Exposing `on()` (sign-in, sign-out, token refreshed, refresh failed, HTTP request
  start/finish/error) would let apps and this log subscribe directly.
- No manual token refresh or access token expiry on the context. The session card reads expiry from
  `getStorageManager().getSessionData()`, and "Renew silently" uses `signInSilently()`.
- `user`, `signIn`, `signOut`, and `signUp` are typed as `any` (`@thunderid/nextjs` implements the same context with
  different shapes); see `src/lib/sdk.ts`.
- `resolveResourceEndpoint()` returns `undefined` when a collection is not overridden, and the default collection paths
  (`agent-types`, `user-types`, ...) are private to each API function, so there is no public way to read the effective
  management URL. The playground mirrors the paths in `src/lib/management.ts`.
- `@thunderid/react` does not re-export `resolveResourceEndpoint`, `ThunderIDAPIError`, `getUserTypes`, or
  `toManagementErrorMessage`; the playground imports them from `@thunderid/browser`.
- The authenticated fetcher the management hooks use (`createAuthenticatedFetcher`) is internal, and
  `useThunderID().http.fetcher` is only set when the app passes one, so code calling the core management functions
  directly has to build its own (the checks attach `getAccessToken()` as a bearer token).
- `refetch()` on the ID-scoped hooks (`useGetGroup`, `useGetRole`, `useGetGroupMembers`, ...) ignores a missing ID: with
  `undefined` it requests the collection URL and returns the list as if it were one item. The Hooks page disables Fetch
  until an ID is set.
- `useGrantedPermissions()` reads the token once per sign-in; it does not update after a token refresh that changes
  scopes.
