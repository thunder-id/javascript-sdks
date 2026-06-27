# @thunderid/svelte

> **Svelte 5 SDK for [ThunderID](https://thunderid.dev)** — reactive auth with runes. Supports both SPA and SSR (SvelteKit).

## Installation

```bash
pnpm add @thunderid/svelte
```

## Quick Start (SPA)

```svelte
<script>
  import { ThunderID, useThunderID, SignedIn, SignedOut, SignInButton, SignOutButton } from '@thunderid/svelte';
</script>

<ThunderID baseUrl="https://{tenant}.thunderid.dev" clientId="{clientId}" scopes="openid profile">
  <SignedIn>
    <p>Welcome!</p>
    <SignOutButton />
  </SignedIn>
  <SignedOut>
    <SignInButton />
  </SignedOut>
</ThunderID>
```

## SvelteKit (SSR)

The SDK provides server utilities under the `@thunderid/svelte/server` subpath for SvelteKit SSR support.

### 1. Set environment variables

```env
THUNDERID_SESSION_SECRET=<random-string-at-least-32-chars>
THUNDERID_BASE_URL=https://{tenant}.thunderid.dev
THUNDERID_CLIENT_ID=<client-id>
```

### 2. Apply the handle hook

Create `src/hooks.server.ts`:

```ts
import {createThunderIDHandle} from '@thunderid/svelte/server';

export const handle = createThunderIDHandle();
```

The hook reads `THUNDERID_BASE_URL` and `THUNDERID_CLIENT_ID` from environment variables (or pass them via `createThunderIDHandle({baseUrl, clientId})`). It resolves the session from the JWT cookie, refreshes expiring tokens proactively, fetches branding + organizations in parallel, and writes `event.locals.thunderid` with `ThunderIDSSRData`.

### 3. Create the sign-in route

`src/routes/api/auth/signin/+server.ts`:

```ts
import {createSignInHandler} from '@thunderid/svelte/server';

export const GET = createSignInHandler();
```

### 4. Create the callback route

`src/routes/api/auth/callback/+server.ts`:

```ts
import {createCallbackHandler} from '@thunderid/svelte/server';

export const GET = createCallbackHandler();
```

### 5. Create the sign-out route

`src/routes/api/auth/signout/+server.ts`:

```ts
import {createSignOutHandler} from '@thunderid/svelte/server';

export const GET = createSignOutHandler();
```

### 6. Pass SSR data to the client

Create `src/routes/+layout.server.ts`:

```ts
import {loadThunderID} from '@thunderid/svelte/server';

export const load = loadThunderID;
```

### 7. Hydrate the provider

Pass `ssrData` from the server load function to the provider:

```svelte
<script>
  import { ThunderID } from '@thunderid/svelte';

  let { children, data } = $props();
</script>

<ThunderID {...data.ssrData}>
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
