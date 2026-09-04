# Better Auth + ThunderID Sample

<a href="https://stackblitz.com/fork/github/thunder-id/javascript-sdks/tree/main/samples/integrations/better-auth/nextjs?file=.env" target="_blank"><img src="https://developer.stackblitz.com/img/open_in_stackblitz.svg" alt="Open in StackBlitz" /></a>

A minimal Next.js 15 App Router application demonstrating [Better Auth](https://better-auth.com)'s
[Generic OAuth plugin](https://better-auth.com/docs/plugins/generic-oauth) configured for ThunderID via the
[`@thunderid/better-auth`](../../../../packages/better-auth) provider helper.

All OAuth 2.0 / OIDC handling is performed by Better Auth itself — this sample has no ThunderID SDK
dependency, and keeps users/sessions in an in-memory store (`better-auth/adapters/memory`) that resets on
every server restart. Swap it for a real [database adapter](https://better-auth.com/docs/adapters) in a real
app.

## Prerequisites

- Node.js 18+
- pnpm
- A ThunderID application with an OAuth 2.0 / OIDC (`authorization_code`) client

## Getting started

1. Copy the example environment file:

   ```bash
   cp .env.example .env
   ```

2. Fill in your ThunderID credentials in `.env`:

   ```dotenv
   BETTER_AUTH_SECRET=<run: openssl rand -base64 32>
   BETTER_AUTH_URL=http://localhost:3000
   THUNDERID_ISSUER=https://localhost:8090
   THUNDERID_CLIENT_ID=<your-client-id>
   THUNDERID_CLIENT_SECRET=<your-client-secret>
   ```

   `THUNDERID_CLIENT_ID` and `THUNDERID_CLIENT_SECRET` come from the application's Credentials tab in the
   ThunderID console.

3. Register the redirect URI on your ThunderID application (see the app's config notice in this sample for
   the exact value to use):

   ```
   http://localhost:3000/api/auth/callback/thunderid
   ```

4. Start the development server:

   ```bash
   pnpm dev
   ```

   The app is now running at [http://localhost:3000](http://localhost:3000). Click **Sign in with
   ThunderID** to try the flow.

## How it works

- [`lib/auth.ts`](./lib/auth.ts) — the Better Auth server instance. Registers the `genericOAuth` plugin with
  the `thunderid()` helper from `@thunderid/better-auth`, which supplies the ThunderID issuer's discovery URL
  and default `openid profile email` scopes.
- [`lib/auth-client.ts`](./lib/auth-client.ts) — the Better Auth React client. No client plugin is needed for
  ThunderID; sign-in goes through the standard social-provider API.
- [`app/api/auth/[...all]/route.ts`](./app/api/auth/%5B...all%5D/route.ts) — the catch-all route handler that
  exposes Better Auth's API via `toNextJsHandler`.
- [`app/page.tsx`](./app/page.tsx) — signs in with `authClient.signIn.social({provider: 'thunderid'})`, shows
  the session via `authClient.useSession()`, and signs out with `authClient.signOut()`.
- [`app/components/ConfigNotice.tsx`](./app/components/ConfigNotice.tsx) — shown instead of the app when a
  required environment variable is missing, with the exact redirect URI to register on ThunderID.
