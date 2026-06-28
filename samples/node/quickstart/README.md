# ThunderID Node.js Quickstart

A minimal plain Node.js HTTP server demonstrating sign-in and sign-out with the ThunderID JavaScript SDK (`@thunderid/node`). No framework dependencies — just the built-in `http` module.

## Prerequisites

- Node.js 18+
- A running ThunderID instance (default: `https://localhost:8090`)
- A configured application with `http://localhost:3000/callback` added as an authorized redirect URI

## Getting started

1. Copy the environment file and fill in your values:
   ```sh
   cp .env.example .env
   ```

2. Edit `.env` with your ThunderID application credentials:
   ```
   THUNDERID_CLIENT_ID=<your-client-id>
   THUNDERID_CLIENT_SECRET=<your-client-secret>
   THUNDERID_BASE_URL=https://localhost:8090
   ```

3. Install dependencies and start the server:
   ```sh
   pnpm install
   pnpm start
   ```

Open [http://localhost:3000](http://localhost:3000) in your browser.

> **Note:** Ensure `http://localhost:3000/callback` is registered as an authorized redirect URI in your ThunderID application settings.

## Learn more

- [ThunderID Docs](https://thunderid.dev/docs)
- [`@thunderid/node` SDK reference](https://thunderid.dev/docs/sdks/javascript/node)
