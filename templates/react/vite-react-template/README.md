# ThunderID + React (Vite) Starter

Minimal React + Vite template with ThunderID authentication pre-wired.

## Scaffold

```sh
npx tiged thunder-id/thunderid/sdks/javascript-sdks/templates/react/vite-react-template my-app
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

- `ThunderIDProvider` wrapping the app in `src/main.jsx`
- React Router v7 with `CallbackRoute` handling the OAuth redirect at `/callback`
- `src/Home.jsx` showing `<SignedOut>` / `<SignedIn>` state

## Learn more

- [ThunderID docs](https://thunderid.dev/docs)
- [React SDK reference](https://thunderid.dev/docs/sdks/react)
