# ThunderID + Next.js Starter

Minimal Next.js (App Router) template with ThunderID authentication pre-wired.

## Scaffold

```sh
npx create-next-app@latest my-app \
  --example https://github.com/thunder-id/thunderid/tree/main/sdks/javascript-sdks/templates/nextjs/nextjs-template
cd my-app
```

Or with tiged:

```sh
npx tiged thunder-id/thunderid/sdks/javascript-sdks/templates/nextjs/nextjs-template my-app
cd my-app
npm install
```

## Configure

Copy `.env.example` to `.env.local` and fill in your values:

| Variable | Description | Example |
|---|---|---|
| `THUNDERID_CLIENT_ID` | OAuth client ID from the ThunderID Console | `abc123` |
| `THUNDERID_BASE_URL` | URL where ThunderID is running | `https://localhost:8090` |

## Run

```sh
npm run dev
```

## What's included

- `ThunderIDProvider` (server component) in `app/layout.tsx`
- `app/page.tsx` showing `<SignedOut>` / `<SignedIn>` state with sign-in and sign-out buttons

## Learn more

- [ThunderID docs](https://thunderid.dev/docs)
- [Next.js SDK reference](https://thunderid.dev/docs/sdks/nextjs)
