# ThunderID Browser Quickstart

A minimal Vite + vanilla JS app demonstrating sign-in and sign-out with the ThunderID JavaScript SDK (`@thunderid/browser`).

## Prerequisites

- Node.js 18+
- A running ThunderID instance (default: `https://localhost:8090`)
- A configured application with an authorized redirect URI set to your app's origin (e.g. `http://localhost:5173`)

## Getting started

1. Copy the environment file and fill in your values:
   ```sh
   cp .env.example .env
   ```

2. Edit `.env` with your ThunderID application credentials:
   ```
   VITE_THUNDERID_CLIENT_ID=<your-client-id>
   VITE_THUNDERID_BASE_URL=https://localhost:8090
   ```

3. Install dependencies and start the dev server:
   ```sh
   pnpm install
   pnpm dev
   ```

Open [http://localhost:5173](http://localhost:5173) in your browser.

## Learn more

- [ThunderID Docs](https://thunderid.dev/docs)
- [`@thunderid/browser` SDK reference](https://thunderid.dev/docs/sdks/javascript/browser)
