# ThunderID Vue Playground

A Vite + Vue 3 app that exercises every capability of `@thunderid/vue` against a local ThunderID server. It links the
SDK packages from this workspace (`workspace:*`), so it always runs the code you are changing. It is not published.

| Page                          | What it does                                                                                                                                                                                                                                                                                                                                      |
| ----------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Overview (`#/`)               | Capability checks driven by the real SDK API (run one or run all, pass/fail with a reason, filters), including the management (groups, roles, agent types, agent and user groups, user types, endpoint resolution) and permissions checks, a session card, the provider configuration, the resolved resource endpoints, and a live SDK event log. |
| Components (`#/components`)   | A component explorer: a searchable tree of the SDK components and their stories, including the admin components (users, groups, roles, agents: list, create, details, members, assignments, permissions), `DataTable` and `Attribution`, with Controls, Code (a Vue SFC snippet), Actions, and Accessibility panels.                              |
| Composables (`#/composables`) | Live values of `useThunderID`, `useUser`, `useI18n`, `useTheme`, `useFlow`, `useFlowMeta`, the `useFetch*` page loaders, and a Management section: `useGrantedPermissions`, `useManagementEndpoint`, every `useGet*` management query, `useResourceQuery`, and the state of every mutation composable.                                            |
| Tokens (`#/tokens`)           | The access and ID tokens held by the SDK, decoded locally, with expiry and claim notes.                                                                                                                                                                                                                                                           |

## Set up a local ThunderID server

1. Start ThunderID on `https://localhost:8090` (see the [ThunderID docs](https://thunderid.dev)) and sign in to the
   Console.
2. Create a single-page (public) application and register these URLs:
   - Redirect URIs: `http://localhost:5174`
   - Allowed origins (CORS): `http://localhost:5174`
3. Note the application's client ID and application ID.
4. Accept the server's self-signed certificate once by opening `https://localhost:8090` in the browser you use for the
   playground.

## Run

```bash
# From the repository root: install and build the SDKs once.
pnpm install
pnpm build

# Configure the playground.
cp playgrounds/vue/.env.example playgrounds/vue/.env
# Set VITE_THUNDERID_CLIENT_ID, and VITE_THUNDERID_APPLICATION_ID for the app-native flows.

pnpm --filter @thunderid/playground-vue dev
```

Open http://localhost:5174. After changing SDK source, rebuild that package (for example
`pnpm --filter @thunderid/vue build`) and reload.

| Variable                                                                | Purpose                                                                                                        |
| ----------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| `VITE_THUNDERID_BASE_URL`                                               | ThunderID server. Defaults to `https://localhost:8090`.                                                        |
| `VITE_THUNDERID_CLIENT_ID`                                              | Client ID of the SPA application. Required for sign-in.                                                        |
| `VITE_THUNDERID_APPLICATION_ID`                                         | Application ID. Needed by `<SignIn />`, `<SignUp />` and their checks.                                         |
| `VITE_THUNDERID_AFTER_SIGN_IN_URL`, `VITE_THUNDERID_AFTER_SIGN_OUT_URL` | Redirect targets. Default to the app origin.                                                                   |
| `VITE_THUNDERID_SCOPES`                                                 | Space separated scopes. Defaults to `openid profile email`.                                                    |
| `VITE_THUNDERID_STORAGE`                                                | `sessionStorage`, `localStorage`, or `browserMemory`. Unset uses the SDK default.                              |
| `VITE_THUNDERID_ENDPOINT_<KEY>`                                         | Optional. Full URL for one resource endpoint key, in UPPER_SNAKE_CASE (`VITE_THUNDERID_ENDPOINT_AGENT_TYPES`). |

Without a server or a client ID the app still runs: checks that need one fail with the reason.

The endpoint variables are passed to `<ThunderIDProvider :endpoints>`; unset ones keep the SDK default
(`{baseUrl}/{path}`), and OAuth and discovery always stay on `VITE_THUNDERID_BASE_URL`. The Overview's Resource
endpoints card reads them back from `useThunderID().endpoints`, so it shows what the provider received.

## Custom rendering

The admin components take a default scoped slot, the same pattern as `<SignIn>`, and render it in place of their own UI
with the component's data, state and handlers (for a list: the rows, the default `columns`, `limit`, `offset`,
`totalResults`, `onPageChange` and `onSelect`). The explorer's **Custom rendering** group draws `UserList` as a
[PrimeVue](https://primevue.org) DataTable in lazy mode, `GroupCreate` with PrimeVue inputs and `UserDetails` as a
PrimeVue card. PrimeVue is a playground dependency only.

## Checks

Checks that would leave the page (redirect sign-in, sign-out) only run from their own **Run** button; **Run all checks**
marks them as not run. Results are kept in `sessionStorage` so they survive the sign-in redirect.

The Management checks call the management API with the signed-in user's token. Without a client ID they fail with that
reason; signed out they are not run. A 403 names the permission the token likely lacks. The endpoint checks
(`resolveResourceEndpoint` for `agentTypes`, `groups`, `roles`, and the API functions with a recording fetcher) and the
permission helper checks need no server.

## Known SDK gaps

The playground reports these instead of faking them:

- No `recover()` or `<Recovery />` in `@thunderid/vue`: the Account recovery check is shown as unavailable.
- No organization API (`useOrganization`, `switchOrganization`): the Organizations check is shown as unavailable.
- No public discovery accessor on the context. `<ThunderIDProvider>` loads discovery on mount, and the OIDC discovery
  check reads the issuer from `getStorageManager().getOIDCProviderMetaDataParameter('issuer')`.
- No public event subscription. The browser client has `on('sign-in' | 'sign-out' | ...)` hooks, but `ThunderIDProvider`
  keeps them internal. The event log is built from observed `useThunderID()`, `useUser()`, and `useFlowMeta()` ref
  changes plus the SDK calls the playground makes.
- No manual token refresh or access token expiry on the context. The session card reads expiry from
  `getStorageManager().getSessionData()`, and "Renew silently" uses `signInSilently()`.
- `user`, `signIn`, `signOut`, and `signUp` are typed with `any`; see `src/lib/sdk.ts`.
- `@thunderid/vue` does not re-export `getUserTypes`, `ManagedUserTypeListResponse`, `resolveResourceEndpoint`,
  `ResourceEndpointKey`, or `createHttpClientFetcher`; the playground imports them from `@thunderid/browser`.
- `resolveResourceEndpoint` and `useManagementEndpoint` return `undefined` for a key that is not overridden, and the
  default collection paths (`agent-types`, `user-types`, `flow/execute`, ...) live inside each API function. To show the
  effective URL, `src/lib/endpoints.ts` mirrors those paths.
- `useManagementEndpoint` covers only `ManagementEndpointKey`, which leaves out `flows` and the sign-in and self-service
  keys.
- `GroupMembers` and `RoleAssignments` say they are editable "unless `editable` is `false`", but `editable` defaults to
  `false`; the stories pass it explicitly.
- No accessor for the signed-in user's management ID. The User groups check and composable use the `sub` claim.
