# SvelteKit B2C Sample App

B2C single-page app demonstrating the `@thunderid/sveltekit` SDK with SvelteKit SSR support. Shows sign-in with redirect, a protected route that redirects unauthenticated users, user profile display, and sign-out.

## Prerequisites

- Node.js 20+
- pnpm 10+
- A running ThunderID IdP instance (e.g. `https://localhost:8090`)
- An OAuth2 client registered in the ThunderID console with:
  - Redirect URI: `http://localhost:5173/api/auth/callback`
  - Post-Logout Redirect URI: `http://localhost:5173/`

## Environment Setup

Copy `.env.example` to `.env` and fill in the values:

```sh
cp .env.example .env
```

| Variable | Description |
|----------|-------------|
| `THUNDERID_BASE_URL` | ThunderID IdP base URL (e.g. `https://localhost:8090`) |
| `THUNDERID_CLIENT_ID` | OAuth2 client ID from the ThunderID console |
| `THUNDERID_CLIENT_SECRET` | OAuth2 client secret |
| `THUNDERID_APPLICATION_ID` | Application UUID from the ThunderID console |
| `THUNDERID_SESSION_SECRET` | HS256 key for session cookies (generate with `openssl rand -base64 32`) |

## Running

```sh
pnpm install
pnpm dev
```

The app starts at `http://localhost:5173`.

## What It Demonstrates

1. **Sign-in** — unauthenticated users see a sign-in button; clicking it redirects to ThunderID
2. **Callback handling** — the `/callback` route exchanges the authorization code for tokens
3. **Protected route** — `/protected` requires a valid session; unauthenticated users are redirected to sign-in
4. **User profile** — displays the authenticated user's name, email, and avatar
5. **Token management** — buttons to fetch access/ID tokens and user info
6. **Sign-out** — terminates the session and returns to the unauthenticated state
7. **SDK events** — logs SDK lifecycle events (sign-in, sign-out, token refresh) in an expandable panel
8. **Language switcher** — switch UI language via the SDK's i18n support

## Building

```sh
pnpm build
pnpm preview
```
