# ThunderID + Vue (Vite) Starter

Minimal Vue 3 + Vite template with ThunderID authentication pre-wired.

## Scaffold

```sh
npx tiged thunder-id/thunderid/sdks/javascript-sdks/templates/vue/vite-vue-template my-app
cd my-app
npm install
```

## Configure

Copy `.env.example` to `.env.local` and fill in your values:

| Variable | Description | Example |
|---|---|---|
| `VITE_THUNDERID_CLIENT_ID` | OAuth client ID from the ThunderID Console | `abc123` |
| `VITE_THUNDERID_BASE_URL` | URL where ThunderID is running | `https://localhost:8090` |

## Run

```sh
npm run dev
```

## What's included

- `ThunderIDPlugin` installed in `src/main.js`
- `ThunderIDProvider` wrapping the app in `src/App.vue`
- `<SignedOut>` / `<SignedIn>` state with sign-in and sign-out buttons

## Learn more

- [ThunderID docs](https://thunderid.dev/docs)
- [Vue SDK reference](https://thunderid.dev/docs/sdks/vue)
