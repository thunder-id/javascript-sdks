# ThunderID React Quickstart

A minimal React + Vite application demonstrating ThunderID authentication with OAuth 2.0, PKCE, and JWT support using the `@thunderid/react` SDK.

## Prerequisites

- Node.js 18+
- pnpm
- A ThunderID application — register at [thunderid.dev](https://thunderid.dev)

## Setup

1. Copy the environment template:
   ```sh
   cp .env.example .env
   ```

2. Fill in your ThunderID credentials in `.env`:
   ```
   VITE_THUNDERID_CLIENT_ID=your-client-id
   VITE_THUNDERID_BASE_URL=https://your-thunderid-instance
   ```

3. Install dependencies and start the dev server:
   ```sh
   pnpm install
   pnpm dev
   ```

The app will be available at `http://localhost:5173`.

## Docs

Full SDK reference: [thunderid.dev/docs](https://thunderid.dev/docs)
