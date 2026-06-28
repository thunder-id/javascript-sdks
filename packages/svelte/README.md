# @thunderid/svelte

**Svelte 5 SDK for [ThunderID](https://thunderid.dev)** — reactive auth with runes.

## Installation

```bash
pnpm add @thunderid/svelte
```

## SvelteKit (SSR)

The SDK provides server utilities under the `@thunderid/svelte/server` subpath for SvelteKit SSR support.

### 0. Prerequisites

Create a SvelteKit project if you don't have one:

```bash
npx sv create my-app --template minimal --types ts
cd my-app
pnpm install
pnpm add @thunderid/svelte
```

### 1. Set environment variables

```env
THUNDERID_SESSION_SECRET=<random-string-at-least-32-chars>
THUNDERID_BASE_URL=https://{tenant}.thunderid.dev
THUNDERID_CLIENT_ID=<client-id>
THUNDERID_CLIENT_SECRET=<client-secret>
```

> **SvelteKit convention**: Import env vars from `$env/static/private` and pass them explicitly to factory functions for full type safety:
>
> ```ts
> import { THUNDERID_BASE_URL, THUNDERID_CLIENT_ID, THUNDERID_CLIENT_SECRET, THUNDERID_SESSION_SECRET } from '$env/static/private';
> import { createThunderIDHandle } from '@thunderid/svelte/server';
>
> export const handle = createThunderIDHandle({
>   baseUrl: THUNDERID_BASE_URL,
>   clientId: THUNDERID_CLIENT_ID,
>   clientSecret: THUNDERID_CLIENT_SECRET,
>   sessionSecret: THUNDERID_SESSION_SECRET,
> });
> ```
>
> Passing no arguments falls back to `process.env` (works in dev, but `$env/static/private` is recommended).

### 2. Apply the handle hook

Create `src/hooks.server.ts`:

```ts
import {createThunderIDHandle} from '@thunderid/svelte/server';

export const handle = createThunderIDHandle();
```

The hook reads env vars from `process.env` (or accepts config explicitly). It resolves the session from the JWT cookie, refreshes expiring tokens proactively, fetches branding + organizations in parallel, and writes `event.locals.thunderid` with `ThunderIDSSRData`.

**Token endpoint auth method**: The SDK defaults to `client_secret_post`.

```ts
createThunderIDHandle({
  ...config,
  tokenRequest: {authMethod: 'client_secret_basic'},
});
```

### 3. Create the sign-in, callback, and sign-out routes

```ts
// src/routes/api/auth/signin/+server.ts
import {createSignInHandler} from '@thunderid/svelte/server';
export const GET = createSignInHandler();

// src/routes/api/auth/callback/+server.ts
import {createCallbackHandler} from '@thunderid/svelte/server';
export const GET = createCallbackHandler();

// src/routes/api/auth/signout/+server.ts
import {createSignOutHandler} from '@thunderid/svelte/server';
export const GET = createSignOutHandler();
```

You can pass config to each handler (e.g., `createSignInHandler({...config})`). If omitted, they use the same env-var fallbacks as the handle hook.

### 6. Pass SSR data to the client

Create `src/routes/+layout.server.ts`:

```ts
import {loadThunderID} from '@thunderid/svelte/server';

export const load = loadThunderID;
```

### 7. Wire up the layout

Wrap your root layout with the provider and add sign-in/out controls:

`src/routes/+layout.svelte`:

```svelte
<script>
  import { ThunderID, SignedIn, SignedOut, SignInButton, SignOutButton } from '@thunderid/svelte';
  import { useUser } from '@thunderid/svelte';

  let { children, data } = $props();
</script>

<ThunderID ssrData={data}>
  <nav>
    <SignedIn>
      <span>{useUser().user?.name}</span>
      <SignOutButton />
    </SignedIn>
    <SignedOut>
      <SignInButton />
    </SignedOut>
  </nav>
  {@render children()}
</ThunderID>
```

### TypeScript

For `event.locals.thunderid` to have proper types in your load functions, reference the SDK's type augmentation in your `src/app.d.ts`:

```ts
declare global {
  namespace App {
    interface Locals {
      thunderid: import('@thunderid/svelte/server').ThunderIDSSRData;
    }
  }
}

export {};
```

### Redirect URI Configuration

In your ThunderID application settings, add the exact callback URL:

- **Development**: `http://localhost:5173/api/auth/callback` (use `http`, not `https` — SvelteKit dev server runs on HTTP)
- **Production**: `https://your-domain.com/api/auth/callback`

The hook automatically computes the callback URL from the request origin — no manual `afterSignInUrl` setup needed.

> **Local dev with self-signed TLS**: If your IdP uses a self-signed certificate, launch the dev server with `NODE_TLS_REJECT_UNAUTHORIZED=0 pnpm dev` (dev only — never use in production).

### Server-side route guard

Protect pages or API routes from unauthenticated access:

```ts
import {requireServerSession} from '@thunderid/svelte/server';
import type {RequestEvent} from '@sveltejs/kit';

export function load(event: RequestEvent) {
  // Redirects to /api/auth/signin if not signed in
  const ssrData = requireServerSession(event, '/custom/signin');
}
```

### Switch organization server-side

```ts
import {createOrgSwitchHandler} from '@thunderid/svelte/server';

export const POST = createOrgSwitchHandler();
```

## Composables

```svelte
<script>
  import { useThunderID, useUser } from '@thunderid/svelte';

  const { signIn, signOut, isLoading, isSignedIn, organization, myOrganizations } = useThunderID();
  const { user, userProfile } = useUser();
</script>
```

## Components

| Component | Description |
|-----------|-------------|
| `<ThunderID>` | Provider — wraps your app with auth context |
| `<SignedIn>` | Renders children when signed in |
| `<SignedOut>` | Renders children when signed out |
| `<Loading>` | Renders children while auth state initializes |
| `<SignInButton>` | Sign-in button with loading state |
| `<SignOutButton>` | Sign-out button with loading state |
| `<SignUpButton>` | Sign-up button with loading state |

## License

Apache-2.0
