# ThunderID + Nuxt Starter

Minimal Nuxt 3 template with ThunderID authentication pre-wired.

## Scaffold

```sh
npx tiged thunder-id/thunderid/sdks/javascript-sdks/templates/nuxt/nuxt-template my-app
cd my-app
npm install
```

## Configure

Copy `.env.example` to `.env` and fill in your values:

| Variable | Description | Example |
|---|---|---|
| `THUNDERID_CLIENT_ID` | OAuth client ID from the ThunderID Console | `abc123` |
| `THUNDERID_BASE_URL` | URL where ThunderID is running | `https://localhost:8090` |

## Run

```sh
npm run dev
```

## What's included

- `@thunderid/nuxt` module registered in `nuxt.config.ts`
- All ThunderID components auto-imported (`ThunderIDSignedIn`, `ThunderIDSignInButton`, etc.)
- `pages/index.vue` showing signed-out / signed-in state

## Learn more

- [ThunderID docs](https://thunderid.dev/docs)
- [Nuxt SDK reference](https://thunderid.dev/docs/sdks/nuxt)
