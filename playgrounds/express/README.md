# Express playground

A playground for `@thunderid/express`, built against the SDK source in this workspace. It runs an Express server that
mounts the SDK's handlers and a set of example protected routes, and serves an API explorer for calling them.

## What it covers

| Route                      | Uses                                                                        |
| -------------------------- | --------------------------------------------------------------------------- |
| `GET /login`               | `handleSignIn()`                                                            |
| `GET /logout`              | `handleSignOut()`                                                           |
| `POST /flow/sign-in`       | `handleFlow()` (embedded sign-in flow)                                      |
| `POST /backchannel-logout` | `handleBackchannelLogout()`                                                 |
| `GET /api/session`         | `client.isSignedIn()`                                                       |
| `GET /api/me`              | `protect()`, `client.getUser()`                                             |
| `GET /api/id-token`        | `protect()`, `client.getDecodedIdToken()`                                   |
| `POST /api/token/refresh`  | `client.refreshAccessToken()`                                               |
| `GET /api/public`          | nothing (baseline)                                                          |
| `GET /api/orders`, `/:id`  | `protect()`                                                                 |
| `GET /api/admin/users`     | `protect()`, a scope check, `client.getUsers()`                             |
| `GET /api/admin/groups`    | `protect()`, `getTokenPermissions()` and `hasPermission()`, `groups.list()` |

The **Management** group uses the session-bound management client, `client.managementFromRequest(req)`:

| Route                                       | Uses                                |
| ------------------------------------------- | ----------------------------------- |
| `GET /api/management/groups`                | `groups.list({limit, offset})`      |
| `GET /api/management/groups/:id`            | `groups.get(id)`                    |
| `GET /api/management/groups/:id/members`    | `groups.listMembers(id)`            |
| `GET /api/management/roles`                 | `roles.list()`                      |
| `GET /api/management/roles/:id`             | `roles.get(id)`                     |
| `GET /api/management/roles/:id/assignments` | `roles.listAssignments(id, {type})` |
| `GET /api/management/agent-types`           | `agentTypes.list()`                 |
| `GET /api/management/users/:id/groups`      | `users.listGroups(id)`              |

Each call is sent with the session's access token. ThunderID decides whether the token may read the resource: a 403 or
404 comes back as the SDK's `ThunderIDAPIError` (`<operation>-ForbiddenError-001`, `<operation>-NotFoundError-001`),
which the error handler returns with its status. Without a session, `protect()` answers 401 first.

Every route sits behind `thunderID()`, which attaches the client to `req.thunderIDAuth`.

The sidebar also lists the **resolved endpoints**: where each management collection and each sign-in and self-service
endpoint resolves for the client's configuration, and which ones an override set.

The API explorer at the playground's root lets you:

- pick a route and **send it as** an anonymous caller (no cookie), your signed-in session, or a copy of your session
  whose access token expired a minute ago;
- read the response status, body and headers;
- follow the **SDK trace**: the middleware that ran, the client methods they called, the requests the SDK made to
  ThunderID and the SDK's own log lines;
- copy the request as cURL and read the handler's source.

The trace shows management calls as `client.managementFromRequest(req)` followed by `management.<collection>.<op>()`,
with the `getAccessToken()` the SDK reads and the request it sends.

## Run it against a local ThunderID server

1. Start ThunderID (by default at `https://localhost:8090`).
2. In the ThunderID Console, create an application with an OAuth2 client:
   - redirect URI `http://localhost:3000/login`, post-logout redirect URI `http://localhost:3000/logout`;
   - grant types `authorization_code` and, for `POST /api/token/refresh`, `refresh_token`;
   - a confidential client (note the client secret).
3. Build the SDKs and configure the playground, from the repository root:

   ```bash
   pnpm install
   pnpm build
   cp playgrounds/express/.env.example playgrounds/express/.env
   ```

   Fill in `THUNDERID_CLIENT_ID` and `THUNDERID_CLIENT_SECRET` in `.env`. A local ThunderID server uses a self-signed
   certificate, so for local development also uncomment `NODE_TLS_REJECT_UNAUTHORIZED=0`.

4. Start the playground:

   ```bash
   pnpm --filter @thunderid/playground-express dev
   ```

5. Open http://localhost:3000, select **Sign in**, and come back to the explorer.

Node runs `src/server.ts` directly, so the playground needs Node.js 22.18 or later and has no build output. `pnpm build`
type-checks it against the workspace SDK, and `pnpm --filter @thunderid/express build` picks up SDK changes on the next
restart.

Without a ThunderID server, the explorer still runs: the top bar shows ThunderID as unreachable and the routes that call
it answer with the SDK's errors, which the trace shows.

## Environment

Besides the variables in `.env.example` for the application itself:

| Variable                       | Purpose                                                                                                                                      |
| ------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------- |
| `PLAYGROUND_ADMIN_SCOPE`       | Scope `GET /api/admin/users` requires. Defaults to `system`.                                                                                 |
| `PLAYGROUND_GROUPS_PERMISSION` | Permission `GET /api/admin/groups` checks with `hasPermission()`. Defaults to `system:group:view`.                                           |
| `THUNDERID_ENDPOINT_<KEY>`     | Optional. One collection URL each. `<KEY>` is `USERS`, `USER_TYPES`, `GROUPS`, `ROLES`, `AGENTS`, `AGENT_TYPES`, `APPLICATIONS`, or `FLOWS`. |

The overrides become `endpoints` in the `thunderID()` config. Unset, each collection resolves to
`THUNDERID_BASE_URL/<collection>`.

## Known SDK gaps

- The SDK exports no table of default resource paths. `MANAGEMENT_COLLECTIONS` covers six collections but not
  `applications` or `flows` (which the management client also addresses), and there is none for `flowExecute`,
  `flowMeta` or the `usersMe*` endpoints, so `src/endpoints.ts` lists those paths itself to show what an unset override
  resolves to.
- There is no server-side helper for the permissions a session holds: the playground combines `client.getAccessToken()`
  with `getTokenPermissions()`. An opaque access token grants nothing to that check.
- The management client is a plain object built per call, so it is traced by wrapping what `managementFromRequest()`
  returns; the SDK emits no events of its own.
- A session without an access token fails a management call with `NODE-MANAGEMENT-RC-NF01`, a `ThunderIDRuntimeError`
  without an HTTP status, so a handler that does not check for a session first answers 500.

## How the trace works

`@thunderid/express` emits no debug events, so the playground assembles the trace itself (`src/trace.ts`): it routes the
SDK logger through its `formatter` hook, wraps each route's middleware and handlers, wraps the client methods they call,
and wraps `fetch`. Requests sent from the explorer carry an `x-playground-trace` header; the steps recorded while
serving them go back with the response.
