# @thunderid/svelte

> **Svelte 5 SDK for [ThunderID](https://thunderid.dev)** — reactive auth with runes.

## Installation

```bash
pnpm add @thunderid/svelte
```

## Quick Start

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

## Documentation

Coming soon.

## License

Apache-2.0
