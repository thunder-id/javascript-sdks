# ThunderID Node.js Service Quickstart

A minimal machine-to-machine (service-to-service) client, using the ThunderID Node.js SDK
(`@thunderid/node`). Unlike the other quickstarts, there's no user and no browser sign-in: this
service authenticates as **itself** with the OAuth 2.0 `client_credentials` grant, then uses the
resulting access token to call another piece of business logic.

This is the pattern to use for background jobs, cron tasks, or one backend service calling
another, where there's no human in the loop to redirect through a login page.

The sample is organized the way a real backend usually is, with authentication kept in its own
service instead of scattered across business logic:

```text
node/quickstart/
├── index.mjs                 Wires the services together and prints the result
└── lib/
    ├── AuthService.mjs        Acquires and caches this service's own access token
    ├── InventoryService.mjs   Business logic; asks AuthService for a token before answering
    └── ui.mjs                 Terminal output, built on boxen and picocolors
```

## How it works

- `lib/AuthService.mjs` initializes `ThunderIDNodeClient` with `grantType: 'client_credentials'`.
  With that set, `getAccessToken()` authenticates as the service itself (no session, no sign-in)
  and transparently fetches, caches, and refreshes the token, the same method a user-facing
  quickstart would call to read an existing session's token, just authenticating as the service
  itself instead of a signed-in user.
- `lib/InventoryService.mjs` is the business logic that needs a token before it can act. It asks
  `AuthService` for one; the rest of the app never handles a token or an `Authorization` header
  directly. In a real deployment, `InventoryService` would send that token to a separate inventory
  backend over HTTP, in place of another service calling `AuthService`'s owner the same way.

## Prerequisites

- Node.js 18+
- A running ThunderID instance (default: `https://localhost:8090`)
- An **agent** registered in ThunderID with the `client_credentials` grant

## Create an agent

Agents are ThunderID's machine identities, distinct from user-facing applications.

1. Open the ThunderID Console (`https://localhost:8090/console`) and go to **Agents**.
2. Create a new agent and give it a name (e.g. `node-service-quickstart`).
3. Under its OAuth 2.0 settings, enable the `client_credentials` grant type and set the token
   endpoint auth method to `client_secret_basic`.
4. Copy the generated client ID and client secret, you'll need them below.

## Getting started

1. Copy the environment file and fill in your agent's credentials:
   ```sh
   cp .env.example .env
   ```
   ```
   THUNDERID_CLIENT_ID=<your agent's client ID>
   THUNDERID_CLIENT_SECRET=<your agent's client secret>
   THUNDERID_BASE_URL=https://localhost:8090
   ```

2. Install dependencies and run it:
   ```sh
   npm install
   npm start
   ```

The script authenticates once, then calls `InventoryService.getStock()` for a few SKUs and prints
the result before exiting: a scope line, then an `Inventory` panel with one line per SKU, green
for in-stock items, yellow for out-of-stock, red for a SKU that doesn't exist.

## Learn more

- [ThunderID Docs](https://thunderid.dev/docs)
- [OAuth 2.0 Client Credentials Grant (RFC 6749 §4.4)](https://www.rfc-editor.org/rfc/rfc6749#section-4.4)
