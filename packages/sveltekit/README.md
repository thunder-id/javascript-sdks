![ThunderID SvelteKit SDK](https://raw.githubusercontent.com/thunder-id/thunderid/refs/heads/main/docs/static/assets/images/readme/repo-banner-sveltekit-sdk.png)

SvelteKit SDK for ThunderID. Provides hooks, components, and server-side utilities for authentication in SvelteKit applications.

## Installation

```bash
npm install @thunderid/sveltekit
```

```bash
pnpm add @thunderid/sveltekit
```

```bash
yarn add @thunderid/sveltekit
```

## Quick Start

### 1. Configure the server hook

```ts
// src/hooks.server.ts
import {createThunderIDHandle} from '@thunderid/sveltekit/server';

export const handle = createThunderIDHandle({
  baseUrl: 'https://localhost:8090',
  clientId: 'YOUR_CLIENT_ID',
  clientSecret: 'YOUR_CLIENT_SECRET',
  sessionSecret: 'YOUR_SESSION_SECRET',
});
```

### 2. Load session data on the server

```ts
// src/routes/+layout.server.ts
import {loadThunderID} from '@thunderid/sveltekit/server';
import type {LayoutServerLoad} from './$types';

export const load: LayoutServerLoad = (event) => {
  return {thunderid: loadThunderID(event)};
};
```

### 3. Wrap your app with the provider

```svelte
<!-- src/routes/+layout.svelte -->
<script lang="ts">
  import {ThunderID} from '@thunderid/sveltekit';
  let {children, data} = $props();
  let ssrData = $derived(data?.thunderid);
</script>

<ThunderID {ssrData}>
  {@render children()}
</ThunderID>
```

### 4. Use components and hooks

```svelte
<!-- src/routes/+page.svelte -->
<script lang="ts">
  import {useThunderID, SignedIn, SignedOut, SignInButton, SignOutButton} from '@thunderid/sveltekit';
  const tid = useThunderID();
</script>

<SignedIn>
  <p>Welcome, {tid.user?.name}!</p>
  <SignOutButton />
</SignedIn>

<SignedOut>
  <SignInButton />
</SignedOut>
```

## License

This project is licensed under the [Apache License 2.0](https://github.com/thunder-id/thunderid/blob/main/LICENSE).
